import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  MP_STATUS_PARA_LOCAL,
  buscarPagamentoAprovadoMp,
  registrarStatusPagamento,
} from "@/lib/pagamento";
import {
  buscarInscricao,
  espionarFetch,
  inserirInscricao,
  limparBanco,
} from "../helpers";

const restauradores: (() => void)[] = [];

/** Deixa o envio de e-mail rastreavel sem sair para a rede. */
const espionarEmail = () => {
  process.env.RESEND_API_KEY = "re_teste";
  const espiao = espionarFetch(new Response("{}", { status: 200 }));
  restauradores.push(espiao.restaurar);
  restauradores.push(() => {
    delete process.env.RESEND_API_KEY;
  });
  return espiao;
};

beforeEach(() => {
  limparBanco();
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
});

describe("MP_STATUS_PARA_LOCAL", () => {
  it("traduz os status do Mercado Pago", () => {
    assert.equal(MP_STATUS_PARA_LOCAL.approved, "pago");
    assert.equal(MP_STATUS_PARA_LOCAL.pending, "pendente");
    assert.equal(MP_STATUS_PARA_LOCAL.in_process, "pendente");
    assert.equal(MP_STATUS_PARA_LOCAL.authorized, "pendente");
    assert.equal(MP_STATUS_PARA_LOCAL.rejected, "cancelado");
    assert.equal(MP_STATUS_PARA_LOCAL.cancelled, "cancelado");
    assert.equal(MP_STATUS_PARA_LOCAL.refunded, "cancelado");
    assert.equal(MP_STATUS_PARA_LOCAL.charged_back, "cancelado");
  });

  it("nao conhece status desconhecido", () => {
    assert.equal(MP_STATUS_PARA_LOCAL.inventado, undefined);
  });
});

describe("buscarPagamentoAprovadoMp", () => {
  it("busca pela inscricao e devolve o pagamento aprovado", async () => {
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [
        { id: 1, status: "rejected" },
        { id: 2, status: "approved" },
      ],
    });

    const pagamento = await buscarPagamentoAprovadoMp(42);

    assert.deepEqual(pagamento, { id: 2, status: "approved" });
    const [chamada] = globalThis.__testeMp.chamadas;
    assert.deepEqual(chamada.args, {
      options: {
        external_reference: "42",
        sort: "date_last_updated",
        criteria: "desc",
      },
    });
  });

  it("devolve null quando nenhuma tentativa foi aprovada", async () => {
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [{ id: 1, status: "rejected" }],
    });
    assert.equal(await buscarPagamentoAprovadoMp(42), null);
  });

  it("devolve null quando a busca vem sem resultados", async () => {
    globalThis.__testeMp.paymentSearch = async () => ({});
    assert.equal(await buscarPagamentoAprovadoMp(42), null);
  });
});

describe("registrarStatusPagamento", () => {
  it("marca como pago, guarda o pagamento e manda o e-mail", async () => {
    const inscricao = inserirInscricao();
    const email = espionarEmail();

    await registrarStatusPagamento(inscricao.id, "pago", "pay-1");

    const atualizada = buscarInscricao(inscricao.id);
    assert.equal(atualizada?.status_pagamento, "pago");
    assert.equal(atualizada?.mp_payment_id, "pay-1");
    assert.equal(email.chamadas.length, 1);
  });

  // Webhook e verificacao de status podem confirmar o mesmo pagamento juntos;
  // o e-mail so pode sair uma vez.
  it("nao repete o e-mail quando ja estava pago", async () => {
    const inscricao = inserirInscricao();
    const email = espionarEmail();

    await registrarStatusPagamento(inscricao.id, "pago", "pay-1");
    await registrarStatusPagamento(inscricao.id, "pago", "pay-2");

    assert.equal(email.chamadas.length, 1);
    // O id do primeiro pagamento e o que fica.
    assert.equal(buscarInscricao(inscricao.id)?.mp_payment_id, "pay-1");
  });

  it("mantem o pagamento ja gravado quando vem sem id", async () => {
    const inscricao = inserirInscricao({ mp_payment_id: "pay-antigo" });
    espionarEmail();

    await registrarStatusPagamento(inscricao.id, "pago", null);

    assert.equal(buscarInscricao(inscricao.id)?.mp_payment_id, "pay-antigo");
  });

  it("grava cancelamento sem mandar e-mail", async () => {
    const inscricao = inserirInscricao();
    const email = espionarEmail();

    await registrarStatusPagamento(inscricao.id, "cancelado", "pay-9");

    const atualizada = buscarInscricao(inscricao.id);
    assert.equal(atualizada?.status_pagamento, "cancelado");
    assert.equal(atualizada?.mp_payment_id, "pay-9");
    assert.equal(email.chamadas.length, 0);
  });

  it("volta para pendente preservando o pagamento anterior", async () => {
    const inscricao = inserirInscricao({
      status_pagamento: "cancelado",
      mp_payment_id: "pay-antigo",
    });

    await registrarStatusPagamento(inscricao.id, "pendente", null);

    const atualizada = buscarInscricao(inscricao.id);
    assert.equal(atualizada?.status_pagamento, "pendente");
    assert.equal(atualizada?.mp_payment_id, "pay-antigo");
  });

  it("ignora inscricao inexistente", async () => {
    const email = espionarEmail();
    await registrarStatusPagamento(9999, "pago", "pay-1");
    assert.equal(email.chamadas.length, 0);
  });
});
