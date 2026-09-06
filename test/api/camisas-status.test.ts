import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/camisas/[id]/status/route";
import {
  buscarPedidoCamisa,
  ctx,
  inserirPedidoCamisa,
  limparBanco,
  pedido,
  silenciarErros,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/camisas";
const restauradores: (() => void)[] = [];

const consultar = (id: string) =>
  GET(pedido(`${URL_ROTA}/${id}/status`, { method: "GET" }), ctx({ id }));

beforeEach(() => {
  limparBanco();
  globalThis.__testeMp.paymentSearch = async () => ({ results: [] });
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
});

describe("GET /api/camisas/[id]/status", () => {
  it("recusa id que nao e numero", async () => {
    const resposta = await consultar("abc");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Pedido inválido" });
  });

  it("404 para pedido inexistente", async () => {
    const resposta = await consultar("9999");
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Pedido não encontrado" });
  });

  it("devolve o status gravado quando ja nao esta pendente", async () => {
    const item = inserirPedidoCamisa({ status_pagamento: "pago" });
    const resposta = await consultar(String(item.id));
    assert.deepEqual(await resposta.json(), { status: "pago" });
    // Nao precisa perguntar ao Mercado Pago o que ja esta decidido.
    assert.equal(globalThis.__testeMp.chamadas.length, 0);
  });

  it("segue pendente quando o Mercado Pago nao tem pagamento aprovado", async () => {
    const item = inserirPedidoCamisa();
    const resposta = await consultar(String(item.id));
    assert.deepEqual(await resposta.json(), { status: "pendente" });
  });

  // Rede de seguranca de quando o webhook nao chega.
  it("promove para pago quando acha pagamento aprovado no MP", async () => {
    const item = inserirPedidoCamisa();
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [{ id: 777, status: "approved" }],
    });

    const resposta = await consultar(String(item.id));

    assert.deepEqual(await resposta.json(), { status: "pago" });
    const atualizado = buscarPedidoCamisa(item.id);
    assert.equal(atualizado?.status_pagamento, "pago");
    assert.equal(atualizado?.mp_payment_id, "777");
  });

  it("busca pela referencia com prefixo de camisa", async () => {
    const item = inserirPedidoCamisa();
    await consultar(String(item.id));
    const chamada = globalThis.__testeMp.chamadas[0] as {
      args: { options: { external_reference: string } };
    };
    assert.equal(chamada.args.options.external_reference, `camisa-${item.id}`);
  });

  it("aceita pagamento aprovado sem id", async () => {
    const item = inserirPedidoCamisa();
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [{ status: "approved" }],
    });

    await consultar(String(item.id));

    assert.equal(buscarPedidoCamisa(item.id)?.mp_payment_id, null);
  });

  it("segue pendente quando o Mercado Pago falha", async () => {
    restauradores.push(silenciarErros().restaurar);
    const item = inserirPedidoCamisa();
    globalThis.__testeMp.paymentSearch = async () => {
      throw new Error("MP fora do ar");
    };

    const resposta = await consultar(String(item.id));

    assert.deepEqual(await resposta.json(), { status: "pendente" });
    assert.equal(buscarPedidoCamisa(item.id)?.status_pagamento, "pendente");
  });
});
