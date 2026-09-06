import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  MP_STATUS_PARA_LOCAL,
  buscarPagamentoAprovadoMp,
  registrarStatusPagamento,
  registrarStatusPagamentoCamisa,
} from "@/lib/pagamento";
import {
  buscarInscricao,
  buscarPedidoCamisa,
  espionarFetch,
  inserirInscricao,
  inserirPedidoCamisa,
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

describe("registrarStatusPagamento — camisa comprada junto", () => {
  it("leva o pedido vinculado junto para pago", async () => {
    const inscricao = inserirInscricao();
    const pedido = inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      origem: "inscricao",
    });
    espionarEmail();

    await registrarStatusPagamento(inscricao.id, "pago", "pay-1");

    const atualizado = buscarPedidoCamisa(pedido.id);
    assert.equal(atualizado?.status_pagamento, "pago");
    assert.equal(atualizado?.mp_payment_id, "pay-1");
  });

  // Um pagamento, um e-mail: a camisa entra como detalhe da inscricao.
  it("nao dispara e-mail separado da camisa", async () => {
    const inscricao = inserirInscricao();
    inserirPedidoCamisa({ inscricao_id: inscricao.id, origem: "inscricao" });
    const email = espionarEmail();

    await registrarStatusPagamento(inscricao.id, "pago", "pay-1");

    assert.equal(email.chamadas.length, 1);
    const corpo = JSON.parse(
      String((email.chamadas[0].opcoes as { body: string }).body),
    ) as { subject: string; html: string };
    assert.match(corpo.subject, /Inscrição confirmada/);
    assert.ok(corpo.html.includes("Camisa extra"));
    assert.ok(corpo.html.includes("1× M"));
  });

  it("cancela a camisa junto quando a inscricao e cancelada", async () => {
    const inscricao = inserirInscricao();
    const pedido = inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      origem: "inscricao",
    });

    await registrarStatusPagamento(inscricao.id, "cancelado", "pay-2");

    assert.equal(
      buscarPedidoCamisa(pedido.id)?.status_pagamento,
      "cancelado",
    );
  });

  // Camisa avulsa tem pagamento proprio: nao pode ser arrastada.
  it("nao mexe em pedido avulso do mesmo CPF", async () => {
    const inscricao = inserirInscricao();
    const avulso = inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      origem: "avulso",
    });
    espionarEmail();

    await registrarStatusPagamento(inscricao.id, "pago", "pay-3");

    assert.equal(buscarPedidoCamisa(avulso.id)?.status_pagamento, "pendente");
  });

  it("nao rebaixa camisa ja paga", async () => {
    const inscricao = inserirInscricao();
    const pedido = inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      origem: "inscricao",
      status_pagamento: "pago",
      mp_payment_id: "pay-original",
    });

    await registrarStatusPagamento(inscricao.id, "cancelado", "pay-novo");

    const atualizado = buscarPedidoCamisa(pedido.id);
    assert.equal(atualizado?.status_pagamento, "pago");
    assert.equal(atualizado?.mp_payment_id, "pay-original");
  });
});

describe("registrarStatusPagamentoCamisa", () => {
  it("confirma o pedido e manda o e-mail uma vez so", async () => {
    const pedido = inserirPedidoCamisa();
    const email = espionarEmail();

    await registrarStatusPagamentoCamisa(pedido.id, "pago", "pay-c1");
    await registrarStatusPagamentoCamisa(pedido.id, "pago", "pay-c1");

    const atualizado = buscarPedidoCamisa(pedido.id);
    assert.equal(atualizado?.status_pagamento, "pago");
    assert.equal(atualizado?.mp_payment_id, "pay-c1");
    assert.equal(email.chamadas.length, 1);
    const corpo = JSON.parse(
      String((email.chamadas[0].opcoes as { body: string }).body),
    ) as { subject: string };
    assert.match(corpo.subject, /Pedido confirmado/);
  });

  it("cancela sem mandar e-mail", async () => {
    const pedido = inserirPedidoCamisa();
    const email = espionarEmail();

    await registrarStatusPagamentoCamisa(pedido.id, "cancelado", "pay-c2");

    assert.equal(
      buscarPedidoCamisa(pedido.id)?.status_pagamento,
      "cancelado",
    );
    assert.equal(email.chamadas.length, 0);
  });

  it("preserva o pagamento anterior quando nao vem id novo", async () => {
    const pedido = inserirPedidoCamisa({ mp_payment_id: "pay-antigo" });

    await registrarStatusPagamentoCamisa(pedido.id, "pendente", null);

    assert.equal(buscarPedidoCamisa(pedido.id)?.mp_payment_id, "pay-antigo");
  });

  it("ignora pedido inexistente", async () => {
    const email = espionarEmail();
    await registrarStatusPagamentoCamisa(9999, "pago", "pay-1");
    assert.equal(email.chamadas.length, 0);
  });

  // Regressao: a reserva do proprio pedido contava contra ele, e todo
  // pedido que levava a ultima peca de um tamanho era acusado de estouro.
  it("nao acusa estouro ao levar a ultima peca com a reserva viva", async () => {
    const item = inserirPedidoCamisa({}, [{ tamanho: "XG", quantidade: 1 }]);
    espionarEmail();

    await registrarStatusPagamentoCamisa(item.id, "pago", "pay-ultima");

    const atualizado = buscarPedidoCamisa(item.id);
    assert.equal(atualizado?.status_pagamento, "pago");
    assert.equal(atualizado?.estoque_estourado, 0);
  });

  it("nao acusa estouro levando varios tamanhos ate o fim", async () => {
    const item = inserirPedidoCamisa({}, [
      { tamanho: "M", quantidade: 1 },
      { tamanho: "GG", quantidade: 4 },
    ]);
    espionarEmail();

    await registrarStatusPagamentoCamisa(item.id, "pago", "pay-varios");

    assert.equal(buscarPedidoCamisa(item.id)?.estoque_estourado, 0);
  });

  it("nao marca estouro quando ainda ha peca", async () => {
    const pedido = inserirPedidoCamisa();
    espionarEmail();

    await registrarStatusPagamentoCamisa(pedido.id, "pago", "pay-ok");

    assert.equal(buscarPedidoCamisa(pedido.id)?.estoque_estourado, 0);
  });

  // O dinheiro ja foi capturado: aceita o pagamento e sinaliza o buraco em
  // vez de recusar ou cancelar por conta propria.
  it("marca estouro quando a peca ja foi vendida durante a reserva vencida", async () => {
    const atrasado = inserirPedidoCamisa(
      { reservado_ate: "2000-01-01 00:00:00" },
      [{ tamanho: "XG", quantidade: 1 }],
    );
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "XG", quantidade: 1 },
    ]);
    espionarEmail();

    await registrarStatusPagamentoCamisa(atrasado.id, "pago", "pay-tarde");

    const atualizado = buscarPedidoCamisa(atrasado.id);
    assert.equal(atualizado?.status_pagamento, "pago");
    assert.equal(atualizado?.estoque_estourado, 1);
  });
});
