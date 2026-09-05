import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";
import { enviarEmail } from "@/lib/email";
import { espionarFetch, silenciarErros } from "../helpers";

const AMBIENTE = { ...process.env };
const restauradores: (() => void)[] = [];

const aoFim = (restaurar: () => void) => {
  restauradores.push(restaurar);
};

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
  process.env = { ...AMBIENTE };
});

const MENSAGEM = {
  para: "atleta@teste.com",
  assunto: "Inscrição confirmada",
  html: "<p>oi</p>",
};

const corpoDaChamada = (opcoes: unknown) =>
  JSON.parse(String((opcoes as { body: string }).body));

describe("enviarEmail", () => {
  // Em dev, sem chave da Resend, o envio e ignorado em vez de quebrar o fluxo.
  it("nao tenta enviar sem RESEND_API_KEY", async () => {
    delete process.env.RESEND_API_KEY;
    const espiao = espionarFetch(new Response("{}", { status: 200 }));
    aoFim(espiao.restaurar);

    assert.equal(await enviarEmail(MENSAGEM), false);
    assert.equal(espiao.chamadas.length, 0);
  });

  it("envia pela API da Resend com remetente padrao", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_REPLY_TO;
    const espiao = espionarFetch(new Response("{}", { status: 200 }));
    aoFim(espiao.restaurar);

    assert.equal(await enviarEmail(MENSAGEM), true);
    assert.equal(espiao.chamadas.length, 1);

    const [chamada] = espiao.chamadas;
    assert.equal(chamada.url, "https://api.resend.com/emails");
    const opcoes = chamada.opcoes as {
      method: string;
      headers: Record<string, string>;
    };
    assert.equal(opcoes.method, "POST");
    assert.equal(opcoes.headers.Authorization, "Bearer re_teste");

    const corpo = corpoDaChamada(chamada.opcoes);
    assert.equal(corpo.from, "SAMAS TRAIL <inscricoes@samastrail.com.br>");
    assert.deepEqual(corpo.to, ["atleta@teste.com"]);
    assert.equal(corpo.reply_to, undefined);
    assert.equal(corpo.subject, MENSAGEM.assunto);
    assert.equal(corpo.html, MENSAGEM.html);
  });

  it("usa remetente e reply-to do ambiente", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_FROM = "SAMAS <nao-responda@samastrail.com.br>";
    process.env.EMAIL_REPLY_TO = "organizacao@samastrail.com.br";
    const espiao = espionarFetch(new Response("{}", { status: 200 }));
    aoFim(espiao.restaurar);

    await enviarEmail(MENSAGEM);

    const corpo = corpoDaChamada(espiao.chamadas[0].opcoes);
    assert.equal(corpo.from, "SAMAS <nao-responda@samastrail.com.br>");
    assert.equal(corpo.reply_to, "organizacao@samastrail.com.br");
  });

  it("ignora EMAIL_REPLY_TO vazio", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_REPLY_TO = "";
    const espiao = espionarFetch(new Response("{}", { status: 200 }));
    aoFim(espiao.restaurar);

    await enviarEmail(MENSAGEM);

    assert.equal(corpoDaChamada(espiao.chamadas[0].opcoes).reply_to, undefined);
  });

  it("devolve false e registra o erro quando a Resend recusa", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    const espiao = espionarFetch(
      new Response("chave invalida", { status: 401 }),
    );
    aoFim(espiao.restaurar);
    const console = silenciarErros();
    aoFim(console.restaurar);

    assert.equal(await enviarEmail(MENSAGEM), false);
    assert.equal(console.registros.length, 1);
    assert.deepEqual(console.registros[0], [
      "Erro ao enviar e-mail",
      401,
      "chave invalida",
    ]);
  });

  // Rede fora do ar nao pode derrubar a confirmacao de pagamento.
  it("devolve false quando a chamada explode", async () => {
    process.env.RESEND_API_KEY = "re_teste";
    const espiao = espionarFetch(() => {
      throw new Error("sem rede");
    });
    aoFim(espiao.restaurar);
    const console = silenciarErros();
    aoFim(console.restaurar);

    assert.equal(await enviarEmail(MENSAGEM), false);
    assert.equal(console.registros[0][0], "Erro ao enviar e-mail");
  });
});
