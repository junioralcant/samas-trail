// Sobe o app sobre um banco no formato antigo — como o de producao antes das
// migracoes — e confere o que a migracao faz com os dados que ja estavam la.
// O DATABASE_PATH e trocado no topo do arquivo, antes de qualquer getDb():
// cada arquivo de teste roda no seu proprio processo, entao a troca so vale
// aqui.
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";

const SCHEMA_ANTIGO = `
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
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`;

const caminho = join(mkdtempSync(join(tmpdir(), "corrida-antigo-")), "old.db");
const bancoAntigo = new DatabaseSync(caminho);
bancoAntigo.exec(SCHEMA_ANTIGO);
bancoAntigo.exec(
  `INSERT INTO inscricoes
     (nome, cpf, email, telefone, data_nascimento, sexo, tamanho_camiseta,
      distancia, valor, status_pagamento)
   VALUES ('Atleta do 1o lote', '52998224725', 'a@a.com', '98', '1990-05-10',
           'feminino', 'M', '8km', 120, 'pago')`,
);
bancoAntigo.close();

process.env.DATABASE_PATH = caminho;

const { getDb } = await import("@/lib/db");

type Linha = Record<string, unknown>;

const atleta = () =>
  getDb()
    .prepare("SELECT * FROM inscricoes WHERE nome = 'Atleta do 1o lote'")
    .get() as unknown as Linha;

describe("migracao de um banco antigo", () => {
  it("acrescenta as colunas que faltavam", () => {
    const colunas = (
      getDb()
        .prepare("SELECT name FROM pragma_table_info('inscricoes')")
        .all() as unknown as { name: string }[]
    ).map((c) => c.name);

    for (const coluna of [
      "kit_token",
      "kit_retirado_em",
      "cupom_codigo",
      "desconto",
      "cidade",
      "lote",
      "termo_aceito_em",
      "termo_versao",
      "termo_ip",
      "termo_user_agent",
    ]) {
      assert.ok(colunas.includes(coluna), `faltou a coluna ${coluna}`);
    }
  });

  // Quem ja estava no banco comprou antes da virada de lote.
  it("marca as inscricoes antigas como 1o lote", () => {
    assert.equal(atleta().lote, "1º lote");
  });

  it("gera o token do kit de quem ficou sem", () => {
    assert.match(String(atleta().kit_token), /^[0-9a-f]{32}$/);
  });

  it("preenche desconto zerado e deixa a cidade em branco", () => {
    assert.equal(atleta().desconto, 0);
    assert.equal(atleta().cidade, null);
  });

  it("preserva os dados que ja existiam", () => {
    const linha = atleta();
    assert.equal(linha.cpf, "52998224725");
    assert.equal(linha.valor, 120);
    assert.equal(linha.status_pagamento, "pago");
  });
});
