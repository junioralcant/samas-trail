import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { GET, POST } from "@/app/api/admin/cupons/route";
import { DELETE, PATCH } from "@/app/api/admin/cupons/[id]/route";
import type { Cupom } from "@/lib/types";
import {
  ctx,
  inserirCupom,
  inserirInscricao,
  limparBanco,
  logarComoAdmin,
  pedido,
  sairDoAdmin,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/admin/cupons";

type CupomComUsos = Cupom & { usos: number };

const listar = async () => {
  const resposta = await GET();
  return {
    resposta,
    corpo: (await resposta.json()) as { cupons: CupomComUsos[] },
  };
};

const criar = (corpo: unknown) => POST(pedido(URL_ROTA, { body: corpo }));

const alterar = (id: number | string, corpo: unknown) =>
  PATCH(
    pedido(`${URL_ROTA}/${id}`, { method: "PATCH", body: corpo }),
    ctx({ id: String(id) }),
  );

const remover = (id: number | string) =>
  DELETE(
    pedido(`${URL_ROTA}/${id}`, { method: "DELETE" }),
    ctx({ id: String(id) }),
  );

beforeEach(() => {
  limparBanco();
  logarComoAdmin();
});

describe("GET /api/admin/cupons", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const { resposta, corpo } = await listar();
    assert.equal(resposta.status, 401);
    assert.deepEqual(corpo, { erro: "Não autorizado" });
  });

  it("conta quantas inscricoes usaram cada cupom", async () => {
    inserirCupom({ codigo: "TRILHA10" });
    inserirInscricao({ cupom_codigo: "TRILHA10", cpf: "52998224725" });
    inserirInscricao({ cupom_codigo: "TRILHA10", cpf: "00000000604" });
    // Cancelada nao conta como uso.
    inserirInscricao({
      cupom_codigo: "TRILHA10",
      cpf: "00000001830",
      status_pagamento: "cancelado",
    });

    const { corpo } = await listar();

    assert.equal(corpo.cupons.length, 1);
    assert.equal(corpo.cupons[0].usos, 2);
  });

  it("mostra os ativos antes dos desativados", async () => {
    inserirCupom({ codigo: "DESATIVADO", ativo: 0 });
    inserirCupom({ codigo: "ATIVO", ativo: 1 });

    const { corpo } = await listar();

    assert.deepEqual(
      corpo.cupons.map((c) => c.codigo),
      ["ATIVO", "DESATIVADO"],
    );
  });
});

describe("POST /api/admin/cupons", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const resposta = await criar({ codigo: "TRILHA10", desconto: 10 });
    assert.equal(resposta.status, 401);
  });

  it("cria o cupom e devolve a lista atualizada", async () => {
    const resposta = await criar({
      codigo: " trilha 10 ",
      desconto: 10.456,
      validade: " 2026-11-01 ",
    });
    const corpo = (await resposta.json()) as { cupons: CupomComUsos[] };

    assert.equal(resposta.status, 201);
    assert.equal(corpo.cupons.length, 1);
    assert.equal(corpo.cupons[0].codigo, "TRILHA10");
    assert.equal(corpo.cupons[0].desconto, 10.46);
    assert.equal(corpo.cupons[0].validade, "2026-11-01");
    assert.equal(corpo.cupons[0].ativo, 1);
    assert.equal(corpo.cupons[0].usos, 0);
  });

  it("aceita cupom sem validade", async () => {
    const resposta = await criar({ codigo: "SEMPRE", desconto: 5 });
    const corpo = (await resposta.json()) as { cupons: CupomComUsos[] };
    assert.equal(corpo.cupons[0].validade, null);
  });

  it("trata validade em branco como sem validade", async () => {
    const resposta = await criar({
      codigo: "SEMPRE",
      desconto: 5,
      validade: "   ",
    });
    const corpo = (await resposta.json()) as { cupons: CupomComUsos[] };
    assert.equal(corpo.cupons[0].validade, null);
  });

  it("recusa corpo que nao e JSON", async () => {
    const resposta = await criar("codigo=X");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  it("recusa codigo fora do formato", async () => {
    for (const codigo of ["", "AB", "A".repeat(21), "CUPOM!"]) {
      const resposta = await criar({ codigo, desconto: 10 });
      assert.equal(resposta.status, 400, `codigo aceito indevidamente: ${codigo}`);
      assert.deepEqual(await resposta.json(), {
        erro: "O código deve ter de 3 a 20 caracteres (letras, números ou -)",
      });
    }
  });

  it("recusa pedido sem codigo", async () => {
    const resposta = await criar({ desconto: 10 });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), {
      erro: "O código deve ter de 3 a 20 caracteres (letras, números ou -)",
    });
  });

  it("recusa desconto ausente, zerado ou negativo", async () => {
    for (const desconto of [undefined, 0, -5, "abc"]) {
      const resposta = await criar({ codigo: "TRILHA10", desconto });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), {
        erro: "O desconto deve ser maior que zero",
      });
    }
  });

  it("recusa validade fora do formato ISO", async () => {
    const resposta = await criar({
      codigo: "TRILHA10",
      desconto: 10,
      validade: "01/11/2026",
    });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Validade inválida" });
  });

  it("recusa codigo repetido", async () => {
    inserirCupom({ codigo: "TRILHA10" });

    const resposta = await criar({ codigo: "trilha10", desconto: 20 });

    assert.equal(resposta.status, 409);
    assert.deepEqual(await resposta.json(), {
      erro: "Já existe um cupom com este código",
    });
  });
});

describe("PATCH /api/admin/cupons/[id]", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const resposta = await alterar(1, { ativo: false });
    assert.equal(resposta.status, 401);
  });

  it("desativa e reativa o cupom", async () => {
    const cupom = inserirCupom({ codigo: "TRILHA10" });

    const desativado = await alterar(cupom.id, { ativo: false });
    assert.equal(desativado.status, 200);
    assert.deepEqual(await desativado.json(), { ok: true });
    assert.equal((await listar()).corpo.cupons[0].ativo, 0);

    await alterar(cupom.id, { ativo: true });
    assert.equal((await listar()).corpo.cupons[0].ativo, 1);
  });

  it("recusa corpo que nao e JSON", async () => {
    const cupom = inserirCupom();
    const resposta = await alterar(cupom.id, "ativo=false");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  it("recusa pedido sem o campo ativo", async () => {
    const cupom = inserirCupom();
    const resposta = await alterar(cupom.id, {});
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Nada para atualizar" });
  });

  it("responde 404 para cupom inexistente", async () => {
    const resposta = await alterar(9999, { ativo: false });
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Cupom não encontrado" });
  });
});

describe("DELETE /api/admin/cupons/[id]", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const resposta = await remover(1);
    assert.equal(resposta.status, 401);
  });

  it("apaga o cupom", async () => {
    const cupom = inserirCupom();

    const resposta = await remover(cupom.id);

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { ok: true });
    assert.equal((await listar()).corpo.cupons.length, 0);
  });

  it("responde 404 quando nao ha o que apagar", async () => {
    const resposta = await remover(9999);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "Cupom não encontrado" });
  });
});
