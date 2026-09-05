import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/inscricoes/[id]/status/route";
import {
  buscarInscricao,
  ctx,
  inserirInscricao,
  limparBanco,
  pedido,
  silenciarErros,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/inscricoes/1/status";
const restauradores: (() => void)[] = [];

const consultar = (id: string) =>
  GET(pedido(URL_ROTA, { method: "GET" }), ctx({ id }));

beforeEach(() => {
  limparBanco();
  globalThis.__testeMp.paymentSearch = async () => ({ results: [] });
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
});

describe("GET /api/inscricoes/[id]/status", () => {
  it("recusa id que nao e numero", async () => {
    const resposta = await consultar("abc");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Inscrição inválida" });
  });

  it("responde 404 para inscricao inexistente", async () => {
    const resposta = await consultar("9999");
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Inscrição não encontrada" });
  });

  it("devolve direto o status ja resolvido", async () => {
    const paga = inserirInscricao({ status_pagamento: "pago" });

    const resposta = await consultar(String(paga.id));

    assert.deepEqual(await resposta.json(), { status: "pago" });
    // Nao precisa perguntar ao Mercado Pago o que ja esta decidido.
    assert.equal(globalThis.__testeMp.chamadas.length, 0);
  });

  // Fallback do webhook: a pagina de retorno pergunta e o servidor confere.
  it("promove para pago quando o Mercado Pago ja aprovou", async () => {
    const pendente = inserirInscricao();
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [{ id: 777, status: "approved" }],
    });

    const resposta = await consultar(String(pendente.id));

    assert.deepEqual(await resposta.json(), { status: "pago" });
    const atualizada = buscarInscricao(pendente.id);
    assert.equal(atualizada?.status_pagamento, "pago");
    assert.equal(atualizada?.mp_payment_id, "777");
  });

  it("aceita pagamento aprovado sem id", async () => {
    const pendente = inserirInscricao();
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [{ status: "approved" }],
    });

    const resposta = await consultar(String(pendente.id));

    assert.deepEqual(await resposta.json(), { status: "pago" });
    assert.equal(buscarInscricao(pendente.id)?.mp_payment_id, null);
  });

  // Tentativa recusada nao cancela: o atleta ainda pode pagar de novo.
  it("continua pendente quando nao ha pagamento aprovado", async () => {
    const pendente = inserirInscricao();
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [{ id: 1, status: "rejected" }],
    });

    const resposta = await consultar(String(pendente.id));

    assert.deepEqual(await resposta.json(), { status: "pendente" });
    assert.equal(buscarInscricao(pendente.id)?.status_pagamento, "pendente");
  });

  it("continua pendente quando a consulta ao Mercado Pago falha", async () => {
    const pendente = inserirInscricao();
    globalThis.__testeMp.paymentSearch = async () => {
      throw new Error("MP fora do ar");
    };
    const console = silenciarErros();
    restauradores.push(console.restaurar);

    const resposta = await consultar(String(pendente.id));

    assert.deepEqual(await resposta.json(), { status: "pendente" });
    assert.equal(
      console.registros[0][0],
      "Erro ao consultar pagamento no Mercado Pago",
    );
  });
});
