import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";
import {
  DISTANCIAS,
  getAppUrl,
  getEventName,
  getLoteAtual,
  getPreco,
} from "@/lib/config";

const AMBIENTE = { ...process.env };

afterEach(() => {
  process.env = { ...AMBIENTE };
});

describe("DISTANCIAS", () => {
  it("tem exatamente as duas provas do evento", () => {
    assert.deepEqual(DISTANCIAS, ["8km", "18km"]);
  });
});

describe("getEventName", () => {
  it("le do ambiente", () => {
    process.env.EVENT_NAME = "SAMAS TRAIL";
    assert.equal(getEventName(), "SAMAS TRAIL");
  });

  it("cai no padrao sem variavel", () => {
    delete process.env.EVENT_NAME;
    assert.equal(getEventName(), "Corrida de Trilha");
  });
});

describe("getPreco", () => {
  it("le o preco de cada distancia do ambiente", () => {
    process.env.PRECO_8KM = "130.00";
    process.env.PRECO_18KM = "160.00";
    assert.equal(getPreco("8km"), 130);
    assert.equal(getPreco("18km"), 160);
  });

  it("cai nos padroes sem variavel", () => {
    delete process.env.PRECO_8KM;
    delete process.env.PRECO_18KM;
    assert.equal(getPreco("8km"), 130);
    assert.equal(getPreco("18km"), 160);
  });
});

describe("getLoteAtual", () => {
  it("le o rotulo do lote do ambiente", () => {
    process.env.NEXT_PUBLIC_LOTE_ATUAL = "3º lote";
    assert.equal(getLoteAtual(), "3º lote");
  });

  it("cai no primeiro lote sem variavel", () => {
    delete process.env.NEXT_PUBLIC_LOTE_ATUAL;
    assert.equal(getLoteAtual(), "1º lote");
  });
});

describe("getAppUrl", () => {
  it("le a url publica do ambiente", () => {
    process.env.APP_URL = "https://www.samastrail.com.br";
    assert.equal(getAppUrl(), "https://www.samastrail.com.br");
  });

  it("cai no localhost sem variavel", () => {
    delete process.env.APP_URL;
    assert.equal(getAppUrl(), "http://localhost:3000");
  });
});
