import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { POST } from "@/app/api/cupons/validar/route";
import { inserirCupom, limparBanco, pedido } from "../helpers";

const URL_ROTA = "http://localhost:3000/api/cupons/validar";

const validar = (corpo: unknown) => POST(pedido(URL_ROTA, { body: corpo }));

beforeEach(() => {
  limparBanco();
});

describe("POST /api/cupons/validar", () => {
  it("devolve o desconto e o valor final da distancia", async () => {
    inserirCupom({ codigo: "TRILHA10", desconto: 10 });

    const resposta = await validar({ codigo: "trilha10", distancia: "18km" });

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), {
      codigo: "TRILHA10",
      desconto: 10,
      valorFinal: 150,
      valor: 160,
    });
  });

  it("recusa corpo que nao e JSON", async () => {
    const resposta = await validar("nao-e-json");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  it("recusa distancia ausente", async () => {
    const resposta = await validar({ codigo: "TRILHA10" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Distância inválida" });
  });

  it("recusa distancia que nao existe na prova", async () => {
    const resposta = await validar({ codigo: "TRILHA10", distancia: "42km" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Distância inválida" });
  });

  it("responde 404 com o motivo quando o cupom nao serve", async () => {
    const resposta = await validar({ codigo: "NAOEXISTE", distancia: "8km" });
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Cupom inválido" });
  });

  it("trata codigo ausente como cupom em branco", async () => {
    const resposta = await validar({ distancia: "8km" });
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Informe um cupom" });
  });
});
