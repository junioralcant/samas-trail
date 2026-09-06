import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { emTransacao, gerarKitToken, getDb } from "@/lib/db";
import {
  buscarPedidoCamisa,
  inserirInscricao,
  inserirPedidoCamisa,
  limparBanco,
} from "../helpers";

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
    assert.ok(tabelas.includes("pedidos_camisa"));
    assert.ok(tabelas.includes("itens_camisa"));
    assert.ok(tabelas.includes("estoque_camisa"));
    assert.ok(tabelas.includes("configuracoes"));
  });

  it("semeia o estoque com a sobra da producao", () => {
    const linhas = getDb()
      .prepare("SELECT tamanho, total FROM estoque_camisa ORDER BY tamanho")
      .all() as unknown as { tamanho: string; total: number }[];
    assert.deepEqual(
      linhas.map((l) => [l.tamanho, l.total]),
      [
        ["G", 16],
        ["GG", 4],
        ["M", 33],
        ["P", 0],
        ["XG", 1],
      ],
    );
  });

  it("liga as chaves estrangeiras", () => {
    const pragma = getDb()
      .prepare("PRAGMA foreign_keys")
      .get() as unknown as { foreign_keys: number };
    assert.equal(pragma.foreign_keys, 1);
  });

  // Camisa ja paga nao pode sumir junto com a inscricao excluida no painel:
  // o vinculo cai, o pedido fica.
  it("excluir a inscricao solta o vinculo do pedido sem apaga-lo", () => {
    limparBanco();
    const inscricao = inserirInscricao();
    const pedido = inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      origem: "inscricao",
      status_pagamento: "pago",
    });
    getDb().prepare("DELETE FROM inscricoes WHERE id = ?").run(inscricao.id);
    assert.equal(buscarPedidoCamisa(pedido.id)?.inscricao_id, null);
  });

  it("apagar o pedido leva os itens junto", () => {
    limparBanco();
    const pedido = inserirPedidoCamisa();
    getDb().prepare("DELETE FROM pedidos_camisa WHERE id = ?").run(pedido.id);
    const itens = getDb()
      .prepare("SELECT COUNT(*) AS total FROM itens_camisa")
      .get() as unknown as { total: number };
    assert.equal(itens.total, 0);
  });

  it("so aceita as duas origens de pedido", () => {
    limparBanco();
    assert.throws(() => inserirPedidoCamisa({ origem: "brinde" }), /CHECK/);
  });

  it("nao deixa dois pedidos com o mesmo token", () => {
    limparBanco();
    const pedido = inserirPedidoCamisa();
    assert.throws(
      () => inserirPedidoCamisa({ token: pedido.token }),
      /UNIQUE/,
    );
  });

  it("nao repete o tamanho dentro do mesmo pedido", () => {
    limparBanco();
    assert.throws(
      () =>
        inserirPedidoCamisa({}, [
          { tamanho: "M", quantidade: 1 },
          { tamanho: "M", quantidade: 2 },
        ]),
      /UNIQUE/,
    );
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

describe("emTransacao", () => {
  it("devolve o resultado e mantem o que foi gravado", () => {
    limparBanco();
    const id = emTransacao(() => inserirPedidoCamisa().id);
    assert.ok(buscarPedidoCamisa(id));
  });

  // Sem o rollback, uma falha no meio da compra deixaria o pedido gravado
  // segurando estoque de uma venda que nunca aconteceu.
  it("desfaz tudo quando a acao falha e repassa o erro", () => {
    limparBanco();
    assert.throws(
      () =>
        emTransacao(() => {
          inserirPedidoCamisa();
          throw new Error("falhou no meio");
        }),
      /falhou no meio/,
    );
    const total = getDb()
      .prepare("SELECT COUNT(*) AS total FROM pedidos_camisa")
      .get() as unknown as { total: number };
    assert.equal(total.total, 0);
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
