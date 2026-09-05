import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { calcularIdade, ehMenorDeIdade } from "@/lib/idade";

// Sempre com hora: "2026-09-05" sozinho seria lido como UTC e cairia no dia
// anterior no fuso local, mudando a idade calculada.
const EM = (iso: string) => new Date(iso);

describe("calcularIdade", () => {
  it("conta anos completos quando o aniversario ja passou", () => {
    assert.equal(calcularIdade("1990-05-10", EM("2026-09-05T12:00:00")), 36);
  });

  it("desconta um ano quando o mes do aniversario ainda nao chegou", () => {
    assert.equal(calcularIdade("1990-12-01", EM("2026-09-05T12:00:00")), 35);
  });

  it("desconta um ano quando falta o dia dentro do mes do aniversario", () => {
    assert.equal(calcularIdade("1990-09-20", EM("2026-09-05T12:00:00")), 35);
  });

  it("conta o ano no proprio dia do aniversario", () => {
    assert.equal(calcularIdade("2008-09-05", EM("2026-09-05T00:30:00")), 18);
  });

  // new Date("2009-05-10") seria lido como UTC e erraria a idade por um dia
  // perto da meia-noite; a comparacao e por componentes locais.
  it("nao erra por fuso na virada do dia", () => {
    assert.equal(calcularIdade("2009-05-10", EM("2026-05-09T23:59:00")), 16);
    assert.equal(calcularIdade("2009-05-10", EM("2026-05-10T00:01:00")), 17);
  });

  it("usa a data de hoje quando nao recebe referencia", () => {
    const hoje = new Date();
    const nascimento = `${hoje.getFullYear() - 30}-01-01`;
    assert.equal(calcularIdade(nascimento), calcularIdade(nascimento, hoje));
  });

  it("ignora espacos em volta da data", () => {
    assert.equal(calcularIdade("  1990-05-10  ", EM("2026-09-05T12:00:00")), 36);
  });

  it("devolve null para data em formato invalido", () => {
    assert.equal(calcularIdade("10/05/1990"), null);
    assert.equal(calcularIdade("1990-5-10"), null);
    assert.equal(calcularIdade(""), null);
  });
});

describe("ehMenorDeIdade", () => {
  it("aponta menor de 18 anos", () => {
    assert.equal(ehMenorDeIdade("2009-05-10", EM("2026-09-05T12:00:00")), true);
  });

  it("nao aponta quem completou 18", () => {
    assert.equal(ehMenorDeIdade("2008-09-05", EM("2026-09-05T12:00:00")), false);
  });

  // Sem data confiavel o painel nao deve pedir termo do responsavel.
  it("trata data invalida como maior de idade", () => {
    assert.equal(ehMenorDeIdade("data-invalida"), false);
  });
});
