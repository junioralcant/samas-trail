import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { POST } from "@/app/api/webhook/mercadopago/route";
import {
  buscarInscricao,
  inserirInscricao,
  limparBanco,
  pedido,
  silenciarErros,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/webhook/mercadopago";
const restauradores: (() => void)[] = [];

const notificar = (
  { query = "", corpo }: { query?: string; corpo?: unknown } = {},
) => POST(pedido(`${URL_ROTA}${query}`, { body: corpo }));

beforeEach(() => {
  limparBanco();
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
});

describe("POST /api/webhook/mercadopago", () => {
  it("confirma o pagamento avisado no corpo da notificacao", async () => {
    const inscricao = inserirInscricao();
    globalThis.__testeMp.paymentGet = async () => ({
      id: 123,
      status: "approved",
      external_reference: String(inscricao.id),
    });

    const resposta = await notificar({
      corpo: { type: "payment", data: { id: 123 } },
    });

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { ok: true });
    const atualizada = buscarInscricao(inscricao.id);
    assert.equal(atualizada?.status_pagamento, "pago");
    assert.equal(atualizada?.mp_payment_id, "123");
  });

  it("aceita a notificacao pela query string", async () => {
    const inscricao = inserirInscricao();
    globalThis.__testeMp.paymentGet = async () => ({
      status: "rejected",
      external_reference: String(inscricao.id),
    });

    await notificar({ query: "?type=payment&data.id=456", corpo: undefined });

    assert.equal(buscarInscricao(inscricao.id)?.status_pagamento, "cancelado");
  });

  it("aceita o formato antigo topic/id", async () => {
    const inscricao = inserirInscricao();
    globalThis.__testeMp.paymentGet = async () => ({
      status: "pending",
      external_reference: String(inscricao.id),
    });

    await notificar({ query: "?topic=payment&id=789" });

    assert.equal(buscarInscricao(inscricao.id)?.status_pagamento, "pendente");
  });

  it("ignora notificacao que nao e de pagamento", async () => {
    const resposta = await notificar({
      corpo: { type: "plan", data: { id: 1 } },
    });

    assert.deepEqual(await resposta.json(), { ok: true });
    assert.equal(globalThis.__testeMp.chamadas.length, 0);
  });

  it("ignora notificacao sem id de pagamento", async () => {
    const resposta = await notificar({ query: "?type=payment" });
    assert.deepEqual(await resposta.json(), { ok: true });
    assert.equal(globalThis.__testeMp.chamadas.length, 0);
  });

  it("ignora corpo que nao e JSON", async () => {
    const resposta = await notificar({ corpo: "ping" });
    assert.deepEqual(await resposta.json(), { ok: true });
    assert.equal(globalThis.__testeMp.chamadas.length, 0);
  });

  it("ignora status desconhecido do Mercado Pago", async () => {
    const inscricao = inserirInscricao();
    globalThis.__testeMp.paymentGet = async () => ({
      status: "status_novo_do_mp",
      external_reference: String(inscricao.id),
    });

    await notificar({ corpo: { type: "payment", data: { id: 1 } } });

    assert.equal(buscarInscricao(inscricao.id)?.status_pagamento, "pendente");
  });

  it("ignora pagamento sem status", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "cancelado" });
    globalThis.__testeMp.paymentGet = async () => ({
      external_reference: String(inscricao.id),
    });

    await notificar({ corpo: { type: "payment", data: { id: 1 } } });

    assert.equal(buscarInscricao(inscricao.id)?.status_pagamento, "cancelado");
  });

  it("ignora referencia externa que nao e um id de inscricao", async () => {
    const inscricao = inserirInscricao();
    globalThis.__testeMp.paymentGet = async () => ({
      status: "approved",
      external_reference: "pedido-xyz",
    });

    await notificar({ corpo: { type: "payment", data: { id: 1 } } });

    assert.equal(buscarInscricao(inscricao.id)?.status_pagamento, "pendente");
  });

  it("ignora pagamento sem referencia externa", async () => {
    globalThis.__testeMp.paymentGet = async () => ({ status: "approved" });

    const resposta = await notificar({
      corpo: { type: "payment", data: { id: 1 } },
    });

    assert.deepEqual(await resposta.json(), { ok: true });
  });

  // O Mercado Pago reenvia a notificacao; responder 200 mesmo com erro evita
  // ficar preso numa fila de retentativas.
  it("responde ok mesmo quando a consulta ao pagamento falha", async () => {
    globalThis.__testeMp.paymentGet = async () => {
      throw new Error("MP fora do ar");
    };
    const console = silenciarErros();
    restauradores.push(console.restaurar);

    const resposta = await notificar({
      corpo: { type: "payment", data: { id: 1 } },
    });

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { ok: true });
    assert.equal(
      console.registros[0][0],
      "Erro ao processar webhook Mercado Pago",
    );
  });
});
