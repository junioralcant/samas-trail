import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/admin/camisas/route";
import {
  DELETE,
  PATCH,
} from "@/app/api/admin/camisas/[id]/route";
import {
  buscarPedidoCamisa,
  contarPedidosCamisa,
  ctx,
  inserirInscricao,
  inserirPedidoCamisa,
  limparBanco,
  logarComoAdmin,
  pedido,
  sairDoAdmin,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/admin/camisas";
const restauradores: (() => void)[] = [];

type Corpo = {
  pedidos: {
    id: number;
    resumo: string;
    estoque_estourado: number;
    inscricao: { id: number; nome: string; distancia: string } | null;
  }[];
  estoque: { tamanho: string; total: number; disponivel: number }[];
  preco: { precoAtual: number; emPromocao: boolean };
  stats: { pagas: number; receita: number; pecas: number; semPeca: number };
};

const listar = async () => (await GET()).json() as Promise<Corpo>;

const alterar = (id: string, body: unknown) =>
  PATCH(pedido(`${URL_ROTA}/${id}`, { method: "PATCH", body }), ctx({ id }));

beforeEach(() => {
  limparBanco();
  logarComoAdmin();
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
  sairDoAdmin();
});

describe("GET /api/admin/camisas", () => {
  it("exige login", async () => {
    sairDoAdmin();
    const resposta = await GET();
    assert.equal(resposta.status, 401);
    assert.deepEqual(await resposta.json(), { erro: "Não autorizado" });
  });

  it("comeca vazio, com o estoque semeado e o preco em promocao", async () => {
    const corpo = await listar();
    assert.deepEqual(corpo.pedidos, []);
    assert.equal(corpo.estoque.length, 5);
    assert.equal(corpo.preco.precoAtual, 20);
    assert.equal(corpo.preco.emPromocao, true);
    assert.equal(corpo.stats.pecas, 54);
  });

  it("lista o pedido com o resumo dos tamanhos", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "M", quantidade: 2 },
      { tamanho: "G", quantidade: 1 },
    ]);

    const corpo = await listar();

    assert.equal(corpo.pedidos.length, 1);
    assert.equal(corpo.pedidos[0].resumo, "2× M, 1× G");
    assert.equal(corpo.stats.pagas, 3);
  });

  // O vinculo e o que decide a entrega: com inscricao sai no kit.
  it("mostra a inscricao vinculada", async () => {
    const inscricao = inserirInscricao({ nome: "João Silva" });
    inserirPedidoCamisa({ inscricao_id: inscricao.id });

    const corpo = await listar();

    assert.deepEqual(corpo.pedidos[0].inscricao, {
      id: inscricao.id,
      nome: "João Silva",
      distancia: "8km",
    });
  });

  it("mostra sem vinculo quando o CPF nao tem inscricao", async () => {
    inserirPedidoCamisa();
    const corpo = await listar();
    assert.equal(corpo.pedidos[0].inscricao, null);
  });

  // Excluir a inscricao no painel solta o vinculo; a camisa paga fica.
  it("sobrevive a inscricao excluida", async () => {
    const inscricao = inserirInscricao();
    inserirPedidoCamisa({ inscricao_id: inscricao.id });
    const { getDb } = await import("@/lib/db");
    getDb().prepare("DELETE FROM inscricoes WHERE id = ?").run(inscricao.id);

    const corpo = await listar();

    assert.equal(corpo.pedidos.length, 1);
    assert.equal(corpo.pedidos[0].inscricao, null);
  });

  it("conta os pedidos com estoque estourado", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago", estoque_estourado: 1 });
    const corpo = await listar();
    assert.equal(corpo.stats.semPeca, 1);
  });

  it("desconta as vendas do disponivel", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "GG", quantidade: 3 },
    ]);
    const corpo = await listar();
    const gg = corpo.estoque.find((l) => l.tamanho === "GG");
    assert.equal(gg?.total, 4);
    assert.equal(gg?.disponivel, 1);
  });
});

describe("PATCH /api/admin/camisas/[id]", () => {
  it("exige login", async () => {
    sairDoAdmin();
    const resposta = await alterar("1", { retirado: true });
    assert.equal(resposta.status, 401);
  });

  it("recusa corpo que nao e JSON", async () => {
    const resposta = await alterar("1", "nao-e-json");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  it("404 para pedido inexistente", async () => {
    const resposta = await alterar("9999", { retirado: true });
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Pedido não encontrado" });
  });

  it("recusa status invalido", async () => {
    const item = inserirPedidoCamisa();
    const resposta = await alterar(String(item.id), {
      statusPagamento: "quase",
    });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Status inválido" });
  });

  it("confirma o pagamento manualmente", async () => {
    const item = inserirPedidoCamisa();
    const resposta = await alterar(String(item.id), {
      statusPagamento: "pago",
    });
    assert.equal(resposta.status, 200);
    assert.equal(buscarPedidoCamisa(item.id)?.status_pagamento, "pago");
  });

  it("marca e desmarca a entrega", async () => {
    const item = inserirPedidoCamisa({ status_pagamento: "pago" });

    await alterar(String(item.id), { retirado: true });
    assert.ok(buscarPedidoCamisa(item.id)?.retirado_em);

    await alterar(String(item.id), { retirado: false });
    assert.equal(buscarPedidoCamisa(item.id)?.retirado_em, null);
  });

  // O estouro se resolve por contato, sem mexer no pagamento.
  it("baixa o alerta de estoque estourado", async () => {
    const item = inserirPedidoCamisa({
      status_pagamento: "pago",
      estoque_estourado: 1,
    });

    await alterar(String(item.id), { estoqueResolvido: true });
    assert.equal(buscarPedidoCamisa(item.id)?.estoque_estourado, 0);

    await alterar(String(item.id), { estoqueResolvido: false });
    assert.equal(buscarPedidoCamisa(item.id)?.estoque_estourado, 1);
  });
});

describe("DELETE /api/admin/camisas/[id]", () => {
  it("exige login", async () => {
    sairDoAdmin();
    const resposta = await DELETE(
      pedido(`${URL_ROTA}/1`, { method: "DELETE" }),
      ctx({ id: "1" }),
    );
    assert.equal(resposta.status, 401);
  });

  it("404 para pedido inexistente", async () => {
    const resposta = await DELETE(
      pedido(`${URL_ROTA}/9999`, { method: "DELETE" }),
      ctx({ id: "9999" }),
    );
    assert.equal(resposta.status, 404);
  });

  it("apaga o pedido e devolve as pecas", async () => {
    const item = inserirPedidoCamisa({}, [{ tamanho: "XG", quantidade: 1 }]);

    const resposta = await DELETE(
      pedido(`${URL_ROTA}/${item.id}`, { method: "DELETE" }),
      ctx({ id: String(item.id) }),
    );

    assert.equal(resposta.status, 200);
    assert.equal(contarPedidosCamisa(), 0);
    const corpo = await listar();
    assert.equal(
      corpo.estoque.find((l) => l.tamanho === "XG")?.disponivel,
      1,
    );
  });
});
