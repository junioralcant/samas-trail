import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import {
  CODIGO_REGEX,
  VALOR_MINIMO,
  aplicarCupom,
  arredondar,
  buscarCupom,
  normalizarCodigo,
} from "@/lib/cupom";
import { inserirCupom, limparBanco } from "../helpers";

const emDias = (dias: number) => {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toLocaleDateString("en-CA");
};

beforeEach(() => {
  limparBanco();
});

describe("normalizarCodigo", () => {
  it("sobe para maiuscula e tira espacos", () => {
    assert.equal(normalizarCodigo("  trilha 10 "), "TRILHA10");
  });

  it("devolve vazio para so espacos", () => {
    assert.equal(normalizarCodigo("   "), "");
  });
});

describe("CODIGO_REGEX", () => {
  it("aceita de 3 a 20 caracteres em letra, numero ou hifen", () => {
    assert.ok(CODIGO_REGEX.test("ABC"));
    assert.ok(CODIGO_REGEX.test("TRILHA-2026"));
    assert.ok(!CODIGO_REGEX.test("AB"));
    assert.ok(!CODIGO_REGEX.test("A".repeat(21)));
    assert.ok(!CODIGO_REGEX.test("cupom"));
    assert.ok(!CODIGO_REGEX.test("CUPOM!"));
  });
});

describe("arredondar", () => {
  it("fecha em duas casas", () => {
    assert.equal(arredondar(10.456), 10.46);
    assert.equal(arredondar(10.454), 10.45);
    assert.equal(arredondar(0.1 + 0.2), 0.3);
  });
});

describe("buscarCupom", () => {
  it("acha pelo codigo normalizado", () => {
    inserirCupom({ codigo: "TRILHA10" });
    assert.equal(buscarCupom(" trilha10 ")?.codigo, "TRILHA10");
  });

  it("devolve undefined quando nao existe", () => {
    assert.equal(buscarCupom("NAOEXISTE"), undefined);
  });
});

describe("aplicarCupom", () => {
  it("desconta o valor do cupom", () => {
    inserirCupom({ codigo: "TRILHA10", desconto: 10 });
    const resultado = aplicarCupom("trilha10", 130);
    assert.deepEqual(resultado, {
      codigo: "TRILHA10",
      desconto: 10,
      valorFinal: 120,
    });
  });

  it("aceita cupom dentro da validade", () => {
    inserirCupom({ codigo: "VALIDO", desconto: 15, validade: emDias(1) });
    assert.deepEqual(aplicarCupom("VALIDO", 130), {
      codigo: "VALIDO",
      desconto: 15,
      valorFinal: 115,
    });
  });

  it("cobra o codigo", () => {
    assert.deepEqual(aplicarCupom("   ", 130), { erro: "Informe um cupom" });
  });

  it("recusa cupom inexistente", () => {
    assert.deepEqual(aplicarCupom("NAOEXISTE", 130), { erro: "Cupom inválido" });
  });

  it("recusa cupom desativado", () => {
    inserirCupom({ codigo: "DESATIVADO", ativo: 0 });
    assert.deepEqual(aplicarCupom("DESATIVADO", 130), {
      erro: "Cupom inválido",
    });
  });

  it("recusa cupom vencido", () => {
    inserirCupom({ codigo: "VENCIDO", validade: emDias(-1) });
    assert.deepEqual(aplicarCupom("VENCIDO", 130), { erro: "Cupom expirado" });
  });

  // O Mercado Pago recusa preferencia abaixo de R$ 1, entao o desconto para
  // no minimo em vez de zerar a cobranca.
  it("limita o desconto para nao zerar a cobranca", () => {
    inserirCupom({ codigo: "GRATIS", desconto: 500 });
    assert.deepEqual(aplicarCupom("GRATIS", 130), {
      codigo: "GRATIS",
      desconto: 129,
      valorFinal: VALOR_MINIMO,
    });
  });

  it("recusa quando nao sobra nada para descontar", () => {
    inserirCupom({ codigo: "GRATIS", desconto: 500 });
    assert.deepEqual(aplicarCupom("GRATIS", VALOR_MINIMO), {
      erro: "Cupom não aplicável a este valor",
    });
  });
});
