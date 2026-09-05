// Banco que ja passou por todas as migracoes: subir o app de novo em cima
// dele nao pode mexer em nada. Mesma tecnica do db-migracao.test.ts — troca do
// DATABASE_PATH antes do primeiro getDb(), num processo so deste arquivo.
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";

const SCHEMA_ATUAL = `
  CREATE TABLE inscricoes (
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
    status_pagamento TEXT NOT NULL DEFAULT 'pendente',
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    kit_token TEXT,
    kit_retirado_em TEXT,
    cupom_codigo TEXT,
    desconto REAL NOT NULL DEFAULT 0,
    cidade TEXT,
    lote TEXT,
    termo_aceito_em TEXT,
    termo_versao TEXT,
    termo_ip TEXT,
    termo_user_agent TEXT
  );
  CREATE UNIQUE INDEX idx_inscricoes_kit_token ON inscricoes (kit_token);
  CREATE TABLE cupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    desconto REAL NOT NULL CHECK (desconto > 0),
    validade TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`;

const TOKEN = "0123456789abcdef0123456789abcdef";

const caminho = join(mkdtempSync(join(tmpdir(), "corrida-atual-")), "atual.db");
const banco = new DatabaseSync(caminho);
banco.exec(SCHEMA_ATUAL);
banco.exec(
  `INSERT INTO inscricoes
     (nome, cpf, email, telefone, cidade, data_nascimento, sexo,
      tamanho_camiseta, distancia, valor, lote, kit_token)
   VALUES ('Atleta do 2o lote', '52998224725', 'a@a.com', '98', 'Bacabal',
           '1990-05-10', 'feminino', 'M', '8km', 130, '2º lote',
           '${TOKEN}')`,
);
banco.close();

process.env.DATABASE_PATH = caminho;

const { getDb } = await import("@/lib/db");

describe("migracao sobre banco ja atualizado", () => {
  it("nao mexe na inscricao que ja estava completa", () => {
    const linha = getDb()
      .prepare("SELECT * FROM inscricoes WHERE id = 1")
      .get() as unknown as Record<string, unknown>;

    // O lote e o token continuam os que estavam gravados: a migracao so
    // preenche o que falta.
    assert.equal(linha.lote, "2º lote");
    assert.equal(linha.kit_token, TOKEN);
    assert.equal(linha.cidade, "Bacabal");
  });

  it("mantem a lista de colunas intacta", () => {
    const colunas = (
      getDb()
        .prepare("SELECT name FROM pragma_table_info('inscricoes')")
        .all() as unknown as { name: string }[]
    ).map((c) => c.name);

    assert.equal(colunas.length, 25);
    assert.equal(new Set(colunas).size, colunas.length);
  });
});
