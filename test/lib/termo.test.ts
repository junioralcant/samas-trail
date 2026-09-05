import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  TERMO_CLAUSULAS,
  TERMO_DATA_PROVA,
  TERMO_EVENTO,
  TERMO_TITULO,
  TERMO_VERSAO,
  montarAbertura,
} from "@/lib/termo";

describe("montarAbertura", () => {
  it("preenche nome e CPF do atleta", () => {
    const abertura = montarAbertura("  Maria Souza  ", " 529.982.247-25 ");
    assert.match(abertura, /^Maria Souza, documento de identidade \(CPF\)/);
    assert.match(abertura, /nº 529\.982\.247-25,/);
    assert.match(abertura, new RegExp(TERMO_EVENTO.replace(/[—/]/g, ".")));
    assert.ok(abertura.includes(TERMO_DATA_PROVA));
  });

  it("deixa linhas para preencher a mao quando faltam os dados", () => {
    const abertura = montarAbertura("", "   ");
    assert.ok(abertura.includes("________________________________"));
    assert.ok(abertura.includes("nº ________________,"));
  });
});

describe("constantes do termo", () => {
  it("expoe titulo, versao e evento", () => {
    assert.equal(TERMO_TITULO, "Termo de Responsabilidade");
    // A versao acompanha o texto: mudou a redacao, muda a versao gravada na
    // inscricao (coluna termo_versao).
    assert.match(TERMO_VERSAO, /^\d{4}\.\d+$/);
    assert.ok(TERMO_EVENTO.includes("SAMAS TRAIL"));
  });

  it("tem clausulas de 'a' a 'r' sem letra repetida", () => {
    const letras = TERMO_CLAUSULAS.map((clausula) => clausula.letra);
    assert.equal(letras.length, 18);
    assert.equal(new Set(letras).size, letras.length);
    assert.equal(letras[0], "a");
    assert.equal(letras.at(-1), "r");
    for (const clausula of TERMO_CLAUSULAS) {
      assert.ok(clausula.texto.length > 10, `clausula ${clausula.letra} vazia`);
    }
  });

  it("mantem a clausula do menor de idade", () => {
    const menor = TERMO_CLAUSULAS.find((c) => c.letra === "i");
    assert.ok(menor?.texto.includes("responsável legal"));
  });
});
