import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/camisas/vinculo/route";
import { inserirInscricao, limparBanco, pedido } from "../helpers";

const URL_ROTA = "http://localhost:3000/api/camisas/vinculo";

const consultar = (cpf: string) =>
  GET(
    pedido(`${URL_ROTA}?cpf=${encodeURIComponent(cpf)}`, { method: "GET" }),
  );

beforeEach(() => {
  limparBanco();
});

describe("GET /api/camisas/vinculo", () => {
  it("recusa CPF invalido", async () => {
    const resposta = await consultar("111.111.111-11");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "CPF inválido" });
  });

  it("recusa consulta sem CPF", async () => {
    const resposta = await GET(pedido(URL_ROTA, { method: "GET" }));
    assert.equal(resposta.status, 400);
  });

  // Nao ter inscricao e normal: quem nao corre tambem compra.
  it("responde sem vinculo quando o CPF nao tem inscricao", async () => {
    const resposta = await consultar("529.982.247-25");
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { vinculada: false });
  });

  it("acha a inscricao pelo CPF com mascara", async () => {
    const inscricao = inserirInscricao({
      cpf: "52998224725",
      nome: "Maria Souza Lima",
      distancia: "18km",
      status_pagamento: "pago",
    });

    const resposta = await consultar("529.982.247-25");

    assert.deepEqual(await resposta.json(), {
      vinculada: true,
      inscricaoId: inscricao.id,
      primeiroNome: "Maria S.",
      distancia: "18km",
      paga: true,
    });
  });

  // A rota e publica: devolver CPF -> nome completo daria uma lista de
  // nomes para quem tivesse uma lista de CPFs.
  it("nunca devolve o nome completo", async () => {
    inserirInscricao({ cpf: "52998224725", nome: "Maria Souza Lima" });
    const corpo = (await (await consultar("52998224725")).json()) as {
      primeiroNome: string;
    };
    assert.ok(!corpo.primeiroNome.includes("Souza"));
    assert.ok(!corpo.primeiroNome.includes("Lima"));
  });

  it("abrevia nome de uma palavra so sem quebrar", async () => {
    inserirInscricao({ cpf: "52998224725", nome: "Madonna" });
    const corpo = (await (await consultar("52998224725")).json()) as {
      primeiroNome: string;
    };
    assert.equal(corpo.primeiroNome, "Madonna");
  });

  it("marca como nao paga a inscricao ainda pendente", async () => {
    inserirInscricao({ cpf: "52998224725", status_pagamento: "pendente" });
    const corpo = (await (await consultar("52998224725")).json()) as {
      paga: boolean;
    };
    assert.equal(corpo.paga, false);
  });

  it("ignora inscricao cancelada", async () => {
    inserirInscricao({ cpf: "52998224725", status_pagamento: "cancelado" });
    assert.deepEqual(await (await consultar("52998224725")).json(), {
      vinculada: false,
    });
  });
});
