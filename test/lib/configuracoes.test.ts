import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  CHAVE_CAMISA_PRECO,
  CHAVE_CAMISA_PRECO_PROMO,
  CHAVE_CAMISA_RESERVA_MINUTOS,
  RESERVA_MINUTOS_PADRAO,
  getPrecoCamisa,
  getReservaMinutos,
  gravarConfiguracao,
  lerConfiguracao,
} from "@/lib/configuracoes";
import { limparBanco } from "../helpers";

const AMBIENTE = { ...process.env };

beforeEach(() => {
  limparBanco();
  delete process.env.PRECO_CAMISA;
  delete process.env.PRECO_CAMISA_PROMO;
  delete process.env.CAMISA_RESERVA_MINUTOS;
});

afterEach(() => {
  process.env = { ...AMBIENTE };
});

describe("lerConfiguracao / gravarConfiguracao", () => {
  it("devolve null quando a chave nunca foi gravada", () => {
    assert.equal(lerConfiguracao("nao_existe"), null);
  });

  it("grava e le de volta", () => {
    gravarConfiguracao("teste", "valor");
    assert.equal(lerConfiguracao("teste"), "valor");
  });

  it("sobrescreve o valor de uma chave que ja existe", () => {
    gravarConfiguracao("teste", "antigo");
    gravarConfiguracao("teste", "novo");
    assert.equal(lerConfiguracao("teste"), "novo");
  });
});

describe("getPrecoCamisa", () => {
  it("usa 45 e 20 quando nao ha banco nem ambiente", () => {
    assert.deepEqual(getPrecoCamisa(), {
      precoCheio: 45,
      precoPromo: 20,
      precoAtual: 20,
      emPromocao: true,
    });
  });

  it("cai no ambiente quando o painel nunca gravou nada", () => {
    process.env.PRECO_CAMISA = "50.00";
    process.env.PRECO_CAMISA_PROMO = "25.00";
    const preco = getPrecoCamisa();
    assert.equal(preco.precoCheio, 50);
    assert.equal(preco.precoAtual, 25);
  });

  it("o painel manda mais que o ambiente", () => {
    process.env.PRECO_CAMISA = "50.00";
    gravarConfiguracao(CHAVE_CAMISA_PRECO, "60");
    assert.equal(getPrecoCamisa().precoCheio, 60);
  });

  // Esvaziar o campo no painel e como se desliga a promocao. Apagar a
  // linha faria o valor do ambiente voltar a valer e religar sozinha.
  it("promocao vazia desliga a promocao", () => {
    process.env.PRECO_CAMISA_PROMO = "20.00";
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "");
    assert.deepEqual(getPrecoCamisa(), {
      precoCheio: 45,
      precoPromo: null,
      precoAtual: 45,
      emPromocao: false,
    });
  });

  it("promocao so de espacos tambem desliga", () => {
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "   ");
    assert.equal(getPrecoCamisa().emPromocao, false);
  });

  it("ignora promocao que nao e numero", () => {
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "de graca");
    assert.equal(getPrecoCamisa().emPromocao, false);
  });

  it("ignora promocao zerada ou negativa", () => {
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "0");
    assert.equal(getPrecoCamisa().emPromocao, false);
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "-5");
    assert.equal(getPrecoCamisa().emPromocao, false);
  });

  // Promocao mais cara que o preco cheio nao e promocao.
  it("ignora promocao maior ou igual ao preco cheio", () => {
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "45");
    assert.equal(getPrecoCamisa().emPromocao, false);
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "80");
    assert.equal(getPrecoCamisa().emPromocao, false);
  });

  it("fecha os valores em duas casas", () => {
    gravarConfiguracao(CHAVE_CAMISA_PRECO, "45.456");
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "19.994");
    const preco = getPrecoCamisa();
    assert.equal(preco.precoCheio, 45.46);
    assert.equal(preco.precoPromo, 19.99);
  });
});

describe("getReservaMinutos", () => {
  it("usa 30 minutos por padrao", () => {
    assert.equal(getReservaMinutos(), RESERVA_MINUTOS_PADRAO);
  });

  it("le do ambiente e do painel", () => {
    process.env.CAMISA_RESERVA_MINUTOS = "45";
    assert.equal(getReservaMinutos(), 45);
    gravarConfiguracao(CHAVE_CAMISA_RESERVA_MINUTOS, "15");
    assert.equal(getReservaMinutos(), 15);
  });

  it("arredonda para baixo", () => {
    gravarConfiguracao(CHAVE_CAMISA_RESERVA_MINUTOS, "10.9");
    assert.equal(getReservaMinutos(), 10);
  });

  // Reserva zerada devolveria a peca no mesmo instante em que reserva.
  it("volta ao padrao com valor invalido, zerado ou negativo", () => {
    gravarConfiguracao(CHAVE_CAMISA_RESERVA_MINUTOS, "nunca");
    assert.equal(getReservaMinutos(), RESERVA_MINUTOS_PADRAO);
    gravarConfiguracao(CHAVE_CAMISA_RESERVA_MINUTOS, "0");
    assert.equal(getReservaMinutos(), RESERVA_MINUTOS_PADRAO);
    gravarConfiguracao(CHAVE_CAMISA_RESERVA_MINUTOS, "-10");
    assert.equal(getReservaMinutos(), RESERVA_MINUTOS_PADRAO);
  });
});
