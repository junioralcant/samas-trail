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
`;

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
  db.exec(SCHEMA);
  migrar(db);
  return db;
};
