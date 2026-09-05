import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { gerarKitToken, getDb } from "@/lib/db";
import { inserirInscricao, limparBanco } from "../helpers";

type Nome = { name: string };

describe("getDb", () => {
  it("cria as tabelas do app", () => {
    const tabelas = (
      getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as unknown as Nome[]
    ).map((t) => t.name);
    assert.ok(tabelas.includes("inscricoes"));
    assert.ok(tabelas.includes("cupons"));
  });

  it("monta a tabela de inscricoes com as colunas das migracoes", () => {
    const colunas = (
      getDb()
        .prepare("SELECT name FROM pragma_table_info('inscricoes')")
        .all() as unknown as Nome[]
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

  it("reaproveita a mesma conexao", () => {
    assert.equal(getDb(), getDb());
  });

  it("liga o WAL", () => {
    const modo = getDb().prepare("PRAGMA journal_mode").get() as unknown as {
      journal_mode: string;
    };
    assert.equal(modo.journal_mode, "wal");
  });

  it("nao deixa dois kits com o mesmo token", () => {
    limparBanco();
    const inscricao = inserirInscricao();

    assert.throws(
      () => inserirInscricao({ cpf: "00000000604", kit_token: inscricao.kit_token }),
      /UNIQUE/,
    );
  });

  it("so aceita as duas distancias da prova", () => {
    limparBanco();
    assert.throws(() => inserirInscricao({ distancia: "42km" }), /CHECK/);
  });
});

describe("gerarKitToken", () => {
  it("gera 32 caracteres hexadecimais", () => {
    assert.match(gerarKitToken(), /^[0-9a-f]{32}$/);
  });

  it("nao repete", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => gerarKitToken()));
    assert.equal(tokens.size, 200);
  });
});
