import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/admin/export/camisas/route";
import {
  inserirInscricao,
  inserirPedidoCamisa,
  limparBanco,
  logarComoAdmin,
  sairDoAdmin,
} from "../helpers";

const baixarCsv = async () => {
  const resposta = await GET();
  return { resposta, texto: await resposta.text() };
};

beforeEach(() => {
  limparBanco();
  logarComoAdmin();
});

describe("GET /api/admin/export/camisas", () => {
  it("exige login", async () => {
    sairDoAdmin();
    const resposta = await GET();
    assert.equal(resposta.status, 401);
  });

  it("baixa como arquivo separado do CSV de inscricoes", async () => {
    const { resposta } = await baixarCsv();
    assert.equal(
      resposta.headers.get("Content-Type"),
      "text/csv; charset=utf-8",
    );
    assert.equal(
      resposta.headers.get("Content-Disposition"),
      'attachment; filename="camisas-extras.csv"',
    );
  });

  it("traz o cabecalho mesmo sem nenhum pedido", async () => {
    const { texto } = await baixarCsv();
    const linhas = texto.replace("﻿", "").split("\n");
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].split(";")[0], "Pedido");
  });

  // O que a tenda precisa de relance: quem sai no kit e quem tem QR.
  it("marca a entrega de cada pedido pelo vinculo", async () => {
    const inscricao = inserirInscricao({ nome: "João Silva" });
    inserirPedidoCamisa(
      { nome: "João Silva", inscricao_id: inscricao.id, origem: "inscricao" },
      [{ tamanho: "M", quantidade: 2 }],
    );
    inserirPedidoCamisa({ nome: "Antônio Márcio" }, [
      { tamanho: "G", quantidade: 1 },
    ]);

    const { texto } = await baixarCsv();
    const linhas = texto.replace("﻿", "").split("\n").slice(1);
    const porNome = Object.fromEntries(
      linhas.map((l) => {
        const c = l.split(";");
        return [c[1], c];
      }),
    );

    assert.equal(porNome["João Silva"][6], "2× M");
    assert.equal(porNome["João Silva"][11], String(inscricao.id));
    assert.equal(porNome["João Silva"][13], "com o kit");
    assert.equal(porNome["Antônio Márcio"][11], "");
    assert.equal(porNome["Antônio Márcio"][13], "QR próprio");
  });

  it("marca o pedido pago sem peca disponivel", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago", estoque_estourado: 1 });
    const { texto } = await baixarCsv();
    const linha = texto.replace("﻿", "").split("\n")[1].split(";");
    assert.equal(linha[9], "pago");
    assert.equal(linha[10], "sim");
  });

  it("escapa ponto e virgula e aspas no nome", async () => {
    inserirPedidoCamisa({ nome: 'Maria "Tita"; Souza' });
    const { texto } = await baixarCsv();
    assert.ok(texto.includes('"Maria ""Tita""; Souza"'));
  });

  it("deixa vazia a retirada de quem ainda nao pegou", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago" });
    const { texto } = await baixarCsv();
    const linha = texto.replace("﻿", "").split("\n")[1].split(";");
    assert.equal(linha[14], "");
  });
});
