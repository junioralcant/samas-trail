import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { enviarEmailInscricaoConfirmada } from "@/lib/emailInscricaoConfirmada";
import type { Inscricao } from "@/lib/types";
import { espionarFetch, inserirInscricao, limparBanco } from "../helpers";

// O separador do toLocaleString pt-BR e um espaco nao separavel, entao a
// comparacao usa a propria formatacao em vez de texto solto.
const emReais = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const AMBIENTE = { ...process.env };
const restauradores: (() => void)[] = [];

/** Envia o e-mail e devolve o HTML que iria para a Resend. */
const htmlDoEmail = async (inscricao: Inscricao) => {
  process.env.RESEND_API_KEY = "re_teste";
  const espiao = espionarFetch(new Response("{}", { status: 200 }));
  restauradores.push(espiao.restaurar);

  const enviado = await enviarEmailInscricaoConfirmada(inscricao);
  assert.equal(enviado, true);

  const corpo = JSON.parse(
    String((espiao.chamadas[0].opcoes as { body: string }).body),
  );
  return corpo as { html: string; subject: string; to: string[] };
};

beforeEach(() => {
  limparBanco();
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
  process.env = { ...AMBIENTE };
});

describe("enviarEmailInscricaoConfirmada", () => {
  it("monta o e-mail com os dados da inscricao", async () => {
    const inscricao = inserirInscricao({
      nome: "Maria Souza",
      email: "maria@teste.com",
      distancia: "18km",
      valor: 160,
      tamanho_camiseta: "G",
    });

    const corpo = await htmlDoEmail(inscricao);

    assert.deepEqual(corpo.to, ["maria@teste.com"]);
    assert.equal(corpo.subject, "Inscrição confirmada — SAMAS TRAIL 18km");
    assert.ok(corpo.html.includes("Maria Souza"));
    assert.ok(corpo.html.includes(`#${inscricao.id}`));
    assert.ok(corpo.html.includes("18KM"));
    assert.ok(corpo.html.includes(emReais(160)));
    assert.ok(corpo.html.includes("22 de novembro de 2026"));
    // O travessao do local vira quebra de linha no e-mail.
    assert.ok(corpo.html.includes("Povoado Água Preta<br>São Mateus"));
  });

  it("mostra o cupom quando a inscricao teve desconto", async () => {
    const inscricao = inserirInscricao({
      cupom_codigo: "TRILHA10",
      desconto: 10,
      valor: 120,
    });

    const html = (await htmlDoEmail(inscricao)).html;

    assert.ok(html.includes("Cupom"));
    assert.ok(html.includes(`TRILHA10 (−${emReais(10)})`));
  });

  it("omite a linha de cupom quando nao houve desconto", async () => {
    const html = (await htmlDoEmail(inserirInscricao())).html;
    assert.ok(!html.includes(">Cupom<"));
  });

  it("registra data e versao do termo aceito", async () => {
    const inscricao = inserirInscricao({
      termo_aceito_em: "2026-09-05 10:30:00",
      termo_versao: "2026.1",
    });

    const html = (await htmlDoEmail(inscricao)).html;

    assert.ok(html.includes("Termo aceito em"));
    assert.ok(html.includes("05/09/2026 às 10:30 (v2026.1)"));
  });

  it("mostra o aceite sem versao quando ela nao foi gravada", async () => {
    const inscricao = inserirInscricao({ termo_versao: null });
    const html = (await htmlDoEmail(inscricao)).html;
    assert.ok(html.includes("05/09/2026 às 10:30"));
    assert.ok(!html.includes("(v"));
  });

  it("repassa a data crua quando o formato nao e o esperado", async () => {
    const inscricao = inserirInscricao({ termo_aceito_em: "ontem" });
    const html = (await htmlDoEmail(inscricao)).html;
    assert.ok(html.includes("ontem"));
  });

  it("omite a linha do termo nas inscricoes antigas sem aceite", async () => {
    const inscricao = inserirInscricao({ termo_aceito_em: null });
    const html = (await htmlDoEmail(inscricao)).html;
    assert.ok(!html.includes("Termo aceito em"));
  });

  it("avisa sobre o termo do responsavel para menor de idade", async () => {
    const daquiA10Anos = new Date();
    daquiA10Anos.setFullYear(daquiA10Anos.getFullYear() - 10);
    const inscricao = inserirInscricao({
      data_nascimento: daquiA10Anos.toLocaleDateString("en-CA"),
    });

    const html = (await htmlDoEmail(inscricao)).html;

    assert.ok(html.includes("Atleta menor de 18 anos"));
    assert.ok(html.includes("assinado pelo responsável legal"));
  });

  it("nao mostra o aviso de menor para atleta adulto", async () => {
    const html = (await htmlDoEmail(inserirInscricao())).html;
    assert.ok(!html.includes("Atleta menor de 18 anos"));
  });

  it("inclui o QR do kit e o link da inscricao", async () => {
    const inscricao = inserirInscricao();
    const html = (await htmlDoEmail(inscricao)).html;

    assert.ok(html.includes(`/api/qr/${inscricao.kit_token}`));
    assert.ok(
      html.includes(`http://localhost:3000/inscricao/${inscricao.kit_token}`),
    );
  });

  // Inscricao anterior ao QR: o botao cai na pagina de retorno.
  it("usa o link de retorno quando nao ha token de kit", async () => {
    const inscricao = inserirInscricao({ kit_token: undefined });
    const html = (await htmlDoEmail(inscricao)).html;

    assert.ok(!html.includes("/api/qr/"));
    assert.ok(
      html.includes(
        `/inscricao/retorno?resultado=sucesso&external_reference=${inscricao.id}`,
      ),
    );
  });

  it("cai nos textos padrao quando o evento nao esta configurado", async () => {
    const inscricao = inserirInscricao();
    delete process.env.EVENT_NAME;
    delete process.env.NEXT_PUBLIC_EVENT_DATE;
    delete process.env.NEXT_PUBLIC_EVENT_LOCATION;

    const corpo = await htmlDoEmail(inscricao);

    assert.equal(corpo.subject, "Inscrição confirmada — SAMAS TRAIL 8km");
    assert.ok(corpo.html.includes("a definir"));
  });

  it("devolve false quando o envio falha", async () => {
    delete process.env.RESEND_API_KEY;
    assert.equal(
      await enviarEmailInscricaoConfirmada(inserirInscricao()),
      false,
    );
  });
});
