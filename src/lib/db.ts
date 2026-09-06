import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let db: DatabaseSync | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS inscricoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    data_nascimento TEXT NOT NULL,
    sexo TEXT NOT NULL,
    tamanho_camiseta TEXT NOT NULL,
    equipe TEXT,
    distancia TEXT NOT NULL CHECK (distancia IN ('8km', '18km')),
    valor REAL NOT NULL,
    status_pagamento TEXT NOT NULL DEFAULT 'pendente'
      CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_inscricoes_cpf ON inscricoes (cpf);
  CREATE INDEX IF NOT EXISTS idx_inscricoes_distancia ON inscricoes (distancia);
  CREATE INDEX IF NOT EXISTS idx_inscricoes_status ON inscricoes (status_pagamento);

  CREATE TABLE IF NOT EXISTS cupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    desconto REAL NOT NULL CHECK (desconto > 0),
    validade TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- Camisa extra: peca vendida a parte, com estoque proprio e finito.
  -- 'avulso' paga sozinha (external_reference "camisa-<id>"); 'inscricao'
  -- entra na preferencia da inscricao e espelha o status dela.
  CREATE TABLE IF NOT EXISTS pedidos_camisa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inscricao_id INTEGER REFERENCES inscricoes (id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    origem TEXT NOT NULL CHECK (origem IN ('avulso', 'inscricao')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    valor_unitario REAL NOT NULL,
    valor REAL NOT NULL,
    promocional INTEGER NOT NULL DEFAULT 0,
    status_pagamento TEXT NOT NULL DEFAULT 'pendente'
      CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    token TEXT,
    -- Enquanto nao vence, um pedido pendente segura o estoque. Vencida,
    -- a peca volta a ficar disponivel sozinha, sem cron nem faxina.
    reservado_ate TEXT,
    -- Pagamento aprovado depois da reserva vencer, sem peca sobrando.
    estoque_estourado INTEGER NOT NULL DEFAULT 0,
    retirado_em TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_camisa_token
    ON pedidos_camisa (token);
  CREATE INDEX IF NOT EXISTS idx_pedidos_camisa_cpf ON pedidos_camisa (cpf);
  CREATE INDEX IF NOT EXISTS idx_pedidos_camisa_inscricao
    ON pedidos_camisa (inscricao_id);
  CREATE INDEX IF NOT EXISTS idx_pedidos_camisa_status
    ON pedidos_camisa (status_pagamento);

  CREATE TABLE IF NOT EXISTS itens_camisa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL
      REFERENCES pedidos_camisa (id) ON DELETE CASCADE,
    tamanho TEXT NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    UNIQUE (pedido_id, tamanho)
  );
  CREATE INDEX IF NOT EXISTS idx_itens_camisa_tamanho
    ON itens_camisa (tamanho);

  -- 'total' e quantas pecas existem de fato. O disponivel nunca e gravado:
  -- sai sempre da conta com os pedidos, para nao existir contador para
  -- decrementar duas vezes nem esquecer de decrementar.
  CREATE TABLE IF NOT EXISTS estoque_camisa (
    tamanho TEXT PRIMARY KEY,
    total INTEGER NOT NULL CHECK (total >= 0),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`;

// Sobra da producao, sem reposicao. So entra quando a tabela esta vazia:
// depois disso quem manda e o painel.
const ESTOQUE_INICIAL: [string, number][] = [
  ["P", 0],
  ["M", 33],
  ["G", 16],
  ["GG", 4],
  ["XG", 1],
];

export const gerarKitToken = () => randomBytes(16).toString("hex");

const migrar = (database: DatabaseSync) => {
  const colunas = database
    .prepare("SELECT name FROM pragma_table_info('inscricoes')")
    .all() as unknown as { name: string }[];
  const nomes = new Set(colunas.map((c) => c.name));

  if (!nomes.has("kit_token")) {
    database.exec("ALTER TABLE inscricoes ADD COLUMN kit_token TEXT");
  }
  if (!nomes.has("kit_retirado_em")) {
    database.exec("ALTER TABLE inscricoes ADD COLUMN kit_retirado_em TEXT");
  }
  if (!nomes.has("cupom_codigo")) {
    database.exec("ALTER TABLE inscricoes ADD COLUMN cupom_codigo TEXT");
  }
  if (!nomes.has("desconto")) {
    database.exec(
      "ALTER TABLE inscricoes ADD COLUMN desconto REAL NOT NULL DEFAULT 0",
    );
  }
  // Cidade so passou a ser pedida depois das primeiras inscricoes: as
  // antigas ficam sem o dado.
  if (!nomes.has("cidade")) {
    database.exec("ALTER TABLE inscricoes ADD COLUMN cidade TEXT");
  }
  // O lote so passou a ser gravado a partir do 2o lote: tudo que ja
  // estava no banco foi vendido no 1o.
  if (!nomes.has("lote")) {
    database.exec("ALTER TABLE inscricoes ADD COLUMN lote TEXT");
    database.exec("UPDATE inscricoes SET lote = '1º lote' WHERE lote IS NULL");
  }
  for (const coluna of [
    "termo_aceito_em",
    "termo_versao",
    "termo_ip",
    "termo_user_agent",
  ]) {
    if (!nomes.has(coluna)) {
      database.exec(`ALTER TABLE inscricoes ADD COLUMN ${coluna} TEXT`);
    }
  }
  database.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_inscricoes_kit_token ON inscricoes (kit_token)",
  );

  const semToken = database
    .prepare("SELECT id FROM inscricoes WHERE kit_token IS NULL")
    .all() as unknown as { id: number }[];
  const atualizar = database.prepare(
    "UPDATE inscricoes SET kit_token = ? WHERE id = ?",
  );
  for (const linha of semToken) {
    atualizar.run(gerarKitToken(), linha.id);
  }

  const estoque = database
    .prepare("SELECT COUNT(*) AS total FROM estoque_camisa")
    .get() as unknown as { total: number };
  if (estoque.total === 0) {
    const inserir = database.prepare(
      "INSERT INTO estoque_camisa (tamanho, total) VALUES (?, ?)",
    );
    for (const [tamanho, quantidade] of ESTOQUE_INICIAL) {
      inserir.run(tamanho, quantidade);
    }
  }
};

/**
 * BEGIN IMMEDIATE pega o lock de escrita antes da leitura: sem isso, duas
 * compras simultaneas leem "1 XG disponivel" e as duas passam.
 */
export const emTransacao = <T>(acao: () => T): T => {
  const database = getDb();
  database.exec("BEGIN IMMEDIATE");
  try {
    const resultado = acao();
    database.exec("COMMIT");
    return resultado;
  } catch (erro) {
    database.exec("ROLLBACK");
    throw erro;
  }
};

export const getDb = (): DatabaseSync => {
  if (db) {
    return db;
  }
  const path = resolve(
    /*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/corrida.db",
  );
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  // Precisa estar ligado para o ON DELETE das camisas valer: excluir uma
  // inscricao solta o vinculo do pedido em vez de apagar camisa ja paga.
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrar(db);
  return db;
};
