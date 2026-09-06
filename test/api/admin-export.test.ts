import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/admin/export/route";
import {
  inserirInscricao,
  inserirPedidoCamisa,
  limparBanco,
  logarComoAdmin,
  marcarKitRetirado,
  sairDoAdmin,
} from "../helpers";

const baixarCsv = async () => {
  const resposta = await GET();
  return { resposta, texto: await resposta.text() };
};

// Response.text() come o BOM na decodificacao, entao a checagem e nos bytes.
const primeirosBytes = async () =>
  Array.from(new Uint8Array(await (await GET()).arrayBuffer()).slice(0, 3));

const menorDeIdade = () => {
  const data = new Date();
  data.setFullYear(data.getFullYear() - 15);
  return data.toLocaleDateString("en-CA");
};

beforeEach(() => {
  limparBanco();
  logarComoAdmin();
});

describe("GET /api/admin/export", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const { resposta, texto } = await baixarCsv();
    assert.equal(resposta.status, 401);
    assert.deepEqual(JSON.parse(texto), { erro: "Não autorizado" });
  });

  it("entrega um CSV para download", async () => {
    const { resposta, texto } = await baixarCsv();

    assert.equal(
      resposta.headers.get("Content-Type"),
      "text/csv; charset=utf-8",
    );
    assert.equal(
      resposta.headers.get("Content-Disposition"),
      'attachment; filename="inscricoes.csv"',
    );
    assert.ok(texto.length > 0);
    // BOM para o Excel abrir os acentos certos.
    assert.deepEqual(await primeirosBytes(), [0xef, 0xbb, 0xbf]);
  });

  it("traz o cabecalho na ordem esperada", async () => {
    const { texto } = await baixarCsv();

    assert.deepEqual(texto.split("\n")[0].split(";"), [
      "ID",
      "Nome",
      "CPF",
      "E-mail",
      "Telefone",
      "Cidade",
      "Nascimento",
      "Sexo",
      "Camiseta",
      "Equipe",
      "Distância",
      "Lote",
      "Camisas extras",
      "Tamanhos camisas",
      "Cupom",
      "Desconto",
      "Valor",
      "Status",
      "Kit retirado em",
      "Idade",
      "Menor de idade",
      "Termo aceito em",
      "Termo versao",
      "Termo IP",
      "Inscrito em",
    ]);
  });

  it("exporta os dados da inscricao", async () => {
    const inscricao = inserirInscricao({
      nome: "Maria Souza",
      cidade: "Bacabal",
      distancia: "18km",
      valor: 150,
      desconto: 10,
      cupom_codigo: "TRILHA10",
      lote: "2º lote",
      status_pagamento: "pago",
    });
    marcarKitRetirado(inscricao.id, "2026-11-22 07:15:00");

    const { texto } = await baixarCsv();
    const linha = texto.split("\n")[1].split(";");

    assert.equal(linha[1], "Maria Souza");
    assert.equal(linha[5], "Bacabal");
    assert.equal(linha[10], "18km");
    assert.equal(linha[11], "2º lote");
    assert.equal(linha[12], "0", "camisas extras");
    assert.equal(linha[13], "", "tamanhos das camisas");
    assert.equal(linha[14], "TRILHA10");
    assert.equal(linha[15], "10,00");
    assert.equal(linha[16], "150,00");
    assert.equal(linha[17], "pago");
    assert.equal(linha[18], "2026-11-22 07:15:00");
    assert.equal(linha[20], "nao");
  });

  it("marca quem e menor de idade e calcula a idade", async () => {
    inserirInscricao({ data_nascimento: menorDeIdade() });

    const { texto } = await baixarCsv();
    const linha = texto.split("\n")[1].split(";");

    assert.equal(linha[19], "15");
    assert.equal(linha[20], "sim");
  });

  it("escapa ponto e virgula, aspas e quebra de linha", async () => {
    inserirInscricao({ nome: 'Maria "Tita"; Souza\nJunior' });

    const { texto } = await baixarCsv();

    assert.ok(texto.includes('"Maria ""Tita""; Souza\nJunior"'));
  });

  it("deixa vazias as colunas sem valor", async () => {
    inserirInscricao({
      equipe: null,
      cupom_codigo: null,
      lote: null,
      termo_aceito_em: null,
      termo_versao: null,
    });

    const { texto } = await baixarCsv();
    const linha = texto.split("\n")[1].split(";");

    assert.equal(linha[9], "", "equipe");
    assert.equal(linha[11], "", "lote");
    assert.equal(linha[14], "", "cupom");
    assert.equal(linha[21], "", "termo aceito em");
  });

  it("ordena por distancia e nome", async () => {
    inserirInscricao({ nome: "Zeca", distancia: "8km", cpf: "52998224725" });
    inserirInscricao({ nome: "Ana", distancia: "8km", cpf: "00000000604" });
    inserirInscricao({ nome: "Bruno", distancia: "18km", cpf: "00000001830" });

    const { texto } = await baixarCsv();
    const nomes = texto
      .split("\n")
      .slice(1)
      .map((linha) => linha.split(";")[1]);

    assert.deepEqual(nomes, ["Bruno", "Ana", "Zeca"]);
  });
});

describe("GET /api/admin/export — colunas de camisa extra", () => {
  beforeEach(() => {
    logarComoAdmin();
  });

  it("traz a quantidade e os tamanhos das camisas do atleta", async () => {
    const inscricao = inserirInscricao();
    inserirPedidoCamisa({ inscricao_id: inscricao.id, origem: "inscricao" }, [
      { tamanho: "M", quantidade: 2 },
      { tamanho: "G", quantidade: 1 },
    ]);

    const { texto } = await baixarCsv();
    const linha = texto.split("\n")[1].split(";");

    assert.equal(linha[12], "3");
    assert.equal(linha[13], "2× M, 1× G");
  });
});
