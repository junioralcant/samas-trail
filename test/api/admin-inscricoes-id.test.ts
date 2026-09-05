import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DELETE, PATCH } from "@/app/api/admin/inscricoes/[id]/route";
import type { Inscricao } from "@/lib/types";
import {
  buscarInscricao,
  contarInscricoes,
  ctx,
  espionarFetch,
  inserirInscricao,
  limparBanco,
  logarComoAdmin,
  marcarKitRetirado,
  pedido,
  sairDoAdmin,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/admin/inscricoes";
const restauradores: (() => void)[] = [];

const alterar = (id: number | string, corpo: unknown) =>
  PATCH(pedido(`${URL_ROTA}/${id}`, { method: "PATCH", body: corpo }), ctx({ id: String(id) }));

const remover = (id: number | string) =>
  DELETE(pedido(`${URL_ROTA}/${id}`, { method: "DELETE" }), ctx({ id: String(id) }));

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
  logarComoAdmin();
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
});

describe("PATCH /api/admin/inscricoes/[id]", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const resposta = await alterar(1, { kitRetirado: true });
    assert.equal(resposta.status, 401);
    assert.deepEqual(await resposta.json(), { erro: "Não autorizado" });
  });

  it("recusa corpo que nao e JSON", async () => {
    const inscricao = inserirInscricao();
    const resposta = await alterar(inscricao.id, "nao-e-json");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  it("responde 404 para inscricao inexistente", async () => {
    const resposta = await alterar(9999, { kitRetirado: true });
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Inscrição não encontrada" });
  });

  it("devolve a inscricao sem mudar nada quando o corpo vem vazio", async () => {
    const inscricao = inserirInscricao();

    const resposta = await alterar(inscricao.id, {});
    const corpo = (await resposta.json()) as { inscricao: Inscricao };

    assert.equal(resposta.status, 200);
    assert.deepEqual({ ...corpo.inscricao }, { ...inscricao });
  });

  it("recusa distancia invalida", async () => {
    const inscricao = inserirInscricao();
    const resposta = await alterar(inscricao.id, { distancia: "42km" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Distância inválida" });
  });

  it("troca a distancia e recalcula o valor da inscricao pendente", async () => {
    const inscricao = inserirInscricao({ distancia: "8km", valor: 130 });

    const resposta = await alterar(inscricao.id, { distancia: "18km" });
    const corpo = (await resposta.json()) as { inscricao: Inscricao };

    assert.equal(corpo.inscricao.distancia, "18km");
    assert.equal(corpo.inscricao.valor, 160);
  });

  it("mantem o desconto do cupom ao recalcular", async () => {
    const inscricao = inserirInscricao({
      distancia: "8km",
      valor: 120,
      cupom_codigo: "TRILHA10",
      desconto: 10,
    });

    await alterar(inscricao.id, { distancia: "18km" });

    assert.equal(buscarInscricao(inscricao.id)?.valor, 150);
  });

  it("nao deixa o recalculo cair abaixo do minimo do Mercado Pago", async () => {
    const inscricao = inserirInscricao({
      distancia: "18km",
      valor: 1,
      desconto: 500,
    });

    await alterar(inscricao.id, { distancia: "8km" });

    assert.equal(buscarInscricao(inscricao.id)?.valor, 1);
  });

  // Quem ja pagou nao pode ter o valor mexido por uma troca de percurso.
  it("preserva o valor de quem ja pagou", async () => {
    const inscricao = inserirInscricao({
      distancia: "8km",
      valor: 130,
      status_pagamento: "pago",
    });

    await alterar(inscricao.id, { distancia: "18km" });

    const atualizada = buscarInscricao(inscricao.id);
    assert.equal(atualizada?.distancia, "18km");
    assert.equal(atualizada?.valor, 130);
  });

  it("recusa status de pagamento invalido", async () => {
    const inscricao = inserirInscricao();
    const resposta = await alterar(inscricao.id, { statusPagamento: "sumiu" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Status inválido" });
  });

  // Confirmacao manual passa pelo mesmo caminho do webhook, e-mail incluso.
  it("confirma o pagamento na mao e manda o e-mail", async () => {
    const inscricao = inserirInscricao();
    const email = espionarEmail();

    const resposta = await alterar(inscricao.id, { statusPagamento: "pago" });
    const corpo = (await resposta.json()) as { inscricao: Inscricao };

    assert.equal(corpo.inscricao.status_pagamento, "pago");
    assert.equal(email.chamadas.length, 1);
  });

  it("cancela sem mandar e-mail", async () => {
    const inscricao = inserirInscricao();
    const email = espionarEmail();

    await alterar(inscricao.id, { statusPagamento: "cancelado" });

    assert.equal(buscarInscricao(inscricao.id)?.status_pagamento, "cancelado");
    assert.equal(email.chamadas.length, 0);
  });

  it("marca a retirada do kit com data e hora", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });

    const resposta = await alterar(inscricao.id, { kitRetirado: true });
    const corpo = (await resposta.json()) as { inscricao: Inscricao };

    assert.match(
      String(corpo.inscricao.kit_retirado_em),
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    );
  });

  it("desfaz a retirada do kit", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });
    marcarKitRetirado(inscricao.id);

    await alterar(inscricao.id, { kitRetirado: false });

    assert.equal(buscarInscricao(inscricao.id)?.kit_retirado_em, null);
  });

  it("aceita mudar distancia, status e kit de uma vez", async () => {
    const inscricao = inserirInscricao();
    espionarEmail();

    const resposta = await alterar(inscricao.id, {
      distancia: "18km",
      statusPagamento: "pago",
      kitRetirado: true,
    });
    const corpo = (await resposta.json()) as { inscricao: Inscricao };

    assert.equal(corpo.inscricao.distancia, "18km");
    assert.equal(corpo.inscricao.valor, 160);
    assert.equal(corpo.inscricao.status_pagamento, "pago");
    assert.ok(corpo.inscricao.kit_retirado_em);
  });
});

describe("DELETE /api/admin/inscricoes/[id]", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const resposta = await remover(1);
    assert.equal(resposta.status, 401);
  });

  it("apaga a inscricao", async () => {
    const inscricao = inserirInscricao();

    const resposta = await remover(inscricao.id);

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { ok: true });
    assert.equal(contarInscricoes(), 0);
  });

  it("responde 404 quando nao ha o que apagar", async () => {
    const resposta = await remover(9999);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Inscrição não encontrada" });
  });
});
