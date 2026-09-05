import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { limparCpf, validarCpf } from "@/lib/cpf";

describe("limparCpf", () => {
  it("mantem so os digitos", () => {
    assert.equal(limparCpf("529.982.247-25"), "52998224725");
    assert.equal(limparCpf(" 529 982 247 25 "), "52998224725");
  });

  it("devolve string vazia quando nao ha digito", () => {
    assert.equal(limparCpf("abc.-/"), "");
  });
});

describe("validarCpf", () => {
  it("aceita CPF valido com e sem mascara", () => {
    assert.equal(validarCpf("52998224725"), true);
    assert.equal(validarCpf("529.982.247-25"), true);
  });

  it("recusa quantidade de digitos diferente de 11", () => {
    assert.equal(validarCpf("5299822472"), false);
    assert.equal(validarCpf("529982247251"), false);
    assert.equal(validarCpf(""), false);
  });

  it("recusa CPF com todos os digitos iguais", () => {
    assert.equal(validarCpf("11111111111"), false);
    assert.equal(validarCpf("00000000000"), false);
  });

  it("recusa quando o primeiro digito verificador nao bate", () => {
    assert.equal(validarCpf("52998224735"), false);
  });

  it("recusa quando o segundo digito verificador nao bate", () => {
    assert.equal(validarCpf("52998224726"), false);
  });

  // Quando o resto do calculo da 10 o digito vira 0; sem esse tratamento
  // estes dois CPFs validos seriam recusados.
  it("trata o resto 10 como digito 0", () => {
    assert.equal(validarCpf("00000000604"), true, "resto 10 no 1o digito");
    assert.equal(validarCpf("00000001830"), true, "resto 10 no 2o digito");
  });
});
