import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { POST } from "@/app/api/inscricoes/route";
import type { Inscricao } from "@/lib/types";
import { disponibilidade } from "@/lib/estoque";
import {
  buscarInscricao,
  contarInscricoes,
  contarPedidosCamisa,
  inserirCupom,
  inserirInscricao,
  limparBanco,
  pedido,
  silenciarErros,
  ultimaInscricao,
  ultimoPedidoCamisa,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/inscricoes";

const FORMULARIO = {
  nome: "  Maria Souza  ",
  cpf: "529.982.247-25",
  email: "  MARIA@Teste.com  ",
  telefone: " (98) 99999-0000 ",
  cidade: " Bacabal ",
  dataNascimento: "1990-05-10",
  sexo: "feminino",
  tamanhoCamiseta: "M",
  distancia: "8km",
  termoAceito: true,
};

const AMBIENTE = { ...process.env };
const restauradores: (() => void)[] = [];

const inscrever = (corpo: unknown, headers?: Record<string, string>) =>
  POST(pedido(URL_ROTA, { body: corpo, headers }));

beforeEach(() => {
  limparBanco();
  globalThis.__testeMp.preferenceCreate = async () => ({
    id: "pref-teste",
    init_point: "https://mp.test/checkout/pref-teste",
  });
  globalThis.__testeMp.paymentSearch = async () => ({ results: [] });
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
  process.env = { ...AMBIENTE };
});

describe("POST /api/inscricoes — validacao", () => {
  it("recusa corpo que nao e JSON", async () => {
    const resposta = await inscrever("nao-e-json");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  for (const campo of [
    "nome",
    "cpf",
    "email",
    "telefone",
    "cidade",
    "dataNascimento",
    "sexo",
    "tamanhoCamiseta",
    "distancia",
  ]) {
    it(`cobra o campo ${campo}`, async () => {
      const resposta = await inscrever({ ...FORMULARIO, [campo]: "" });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), {
        erro: `Campo obrigatório: ${campo}`,
      });
    });
  }

  it("recusa distancia fora das duas provas", async () => {
    const resposta = await inscrever({ ...FORMULARIO, distancia: "42km" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Distância inválida" });
  });

  it("recusa CPF invalido", async () => {
    const resposta = await inscrever({ ...FORMULARIO, cpf: "111.111.111-11" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "CPF inválido" });
  });

  it("recusa e-mail sem formato de e-mail", async () => {
    const resposta = await inscrever({ ...FORMULARIO, email: "maria@" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "E-mail inválido" });
  });

  // O checkbox do formulario nao vale como prova: o servidor exige o aceite.
  it("recusa inscricao sem aceite do termo", async () => {
    const resposta = await inscrever({ ...FORMULARIO, termoAceito: false });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), {
      erro: "É necessário aceitar o Termo de Responsabilidade",
    });
  });
});

describe("POST /api/inscricoes — inscricao nova", () => {
  it("grava a inscricao, cria o checkout e devolve o link", async () => {
    const resposta = await inscrever(FORMULARIO);
    const corpo = (await resposta.json()) as { id: number; initPoint: string };

    assert.equal(resposta.status, 200);
    assert.equal(corpo.initPoint, "https://mp.test/checkout/pref-teste");

    const gravada = buscarInscricao(corpo.id) as Inscricao;
    assert.equal(gravada.nome, "Maria Souza");
    assert.equal(gravada.cpf, "52998224725");
    assert.equal(gravada.email, "maria@teste.com");
    assert.equal(gravada.telefone, "(98) 99999-0000");
    assert.equal(gravada.cidade, "Bacabal");
    assert.equal(gravada.equipe, null);
    assert.equal(gravada.valor, 130);
    assert.equal(gravada.desconto, 0);
    assert.equal(gravada.cupom_codigo, null);
    assert.equal(gravada.lote, "2º lote");
    assert.equal(gravada.status_pagamento, "pendente");
    assert.equal(gravada.mp_preference_id, "pref-teste");
    assert.match(String(gravada.kit_token), /^[0-9a-f]{32}$/);
    assert.equal(gravada.termo_versao, "2026.1");
    assert.ok(gravada.termo_aceito_em);
  });

  it("guarda equipe quando informada", async () => {
    const resposta = await inscrever({
      ...FORMULARIO,
      equipe: "  Trilheiros  ",
    });
    const { id } = (await resposta.json()) as { id: number };
    assert.equal(buscarInscricao(id)?.equipe, "Trilheiros");
  });

  it("cobra o preco da distancia escolhida", async () => {
    const resposta = await inscrever({ ...FORMULARIO, distancia: "18km" });
    const { id } = (await resposta.json()) as { id: number };
    assert.equal(buscarInscricao(id)?.valor, 160);
  });

  it("manda ao Mercado Pago os dados do pagador e a referencia", async () => {
    const resposta = await inscrever(FORMULARIO);
    const { id } = (await resposta.json()) as { id: number };

    const chamada = globalThis.__testeMp.chamadas.at(-1)?.args as {
      body: Record<string, never>;
    };
    const corpo = chamada.body as unknown as {
      items: { title: string; unit_price: number }[];
      payer: { email: string; identification: { number: string } };
      external_reference: string;
      statement_descriptor: string;
    };
    assert.equal(corpo.external_reference, String(id));
    assert.equal(corpo.items[0].unit_price, 130);
    assert.equal(corpo.items[0].title, "Inscrição 8km — SAMAS TRAIL");
    assert.equal(corpo.payer.email, "maria@teste.com");
    assert.equal(corpo.payer.identification.number, "52998224725");
    assert.equal(corpo.statement_descriptor, "SAMAS TRAIL");
  });

  // Sem HTTPS o Mercado Pago recusa auto_return e nao consegue chamar o
  // webhook, entao os dois campos ficam de fora em desenvolvimento.
  it("omite auto_return e webhook fora do HTTPS", async () => {
    await inscrever(FORMULARIO);
    const corpo = (
      globalThis.__testeMp.chamadas.at(-1)?.args as { body: Record<string, unknown> }
    ).body;
    assert.equal(corpo.auto_return, undefined);
    assert.equal(corpo.notification_url, undefined);
  });

  it("pede auto_return e webhook quando a app roda em HTTPS", async () => {
    process.env.APP_URL = "https://www.samastrail.com.br";
    await inscrever(FORMULARIO);
    const corpo = (
      globalThis.__testeMp.chamadas.at(-1)?.args as { body: Record<string, unknown> }
    ).body;
    assert.equal(corpo.auto_return, "approved");
    assert.equal(
      corpo.notification_url,
      "https://www.samastrail.com.br/api/webhook/mercadopago",
    );
  });

  it("guarda o IP do aceite vindo do proxy", async () => {
    const resposta = await inscrever(FORMULARIO, {
      "x-forwarded-for": " 187.1.2.3 , 10.0.0.1",
      "user-agent": "Mozilla/5.0 (teste)",
    });
    const { id } = (await resposta.json()) as { id: number };
    const gravada = buscarInscricao(id);
    assert.equal(gravada?.termo_ip, "187.1.2.3");
    assert.equal(gravada?.termo_user_agent, "Mozilla/5.0 (teste)");
  });

  it("cai no x-real-ip quando nao ha x-forwarded-for", async () => {
    const resposta = await inscrever(FORMULARIO, { "x-real-ip": "200.1.2.3" });
    const { id } = (await resposta.json()) as { id: number };
    assert.equal(buscarInscricao(id)?.termo_ip, "200.1.2.3");
  });

  it("aceita inscricao sem IP identificado", async () => {
    const resposta = await inscrever(FORMULARIO);
    const { id } = (await resposta.json()) as { id: number };
    assert.equal(buscarInscricao(id)?.termo_ip, null);
  });
});

describe("POST /api/inscricoes — cupom", () => {
  it("aplica o desconto e avisa o Mercado Pago", async () => {
    inserirCupom({ codigo: "TRILHA10", desconto: 10 });

    const resposta = await inscrever({ ...FORMULARIO, cupom: " trilha10 " });
    const { id } = (await resposta.json()) as { id: number };

    const gravada = buscarInscricao(id);
    assert.equal(gravada?.valor, 120);
    assert.equal(gravada?.desconto, 10);
    assert.equal(gravada?.cupom_codigo, "TRILHA10");

    const corpo = (
      globalThis.__testeMp.chamadas.at(-1)?.args as {
        body: { items: { title: string; unit_price: number }[] };
      }
    ).body;
    assert.equal(corpo.items[0].unit_price, 120);
    assert.equal(
      corpo.items[0].title,
      "Inscrição 8km — SAMAS TRAIL (cupom TRILHA10)",
    );
  });

  it("recusa cupom invalido", async () => {
    const resposta = await inscrever({ ...FORMULARIO, cupom: "NAOEXISTE" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Cupom inválido" });
  });

  it("ignora cupom em branco", async () => {
    const resposta = await inscrever({ ...FORMULARIO, cupom: "   " });
    const { id } = (await resposta.json()) as { id: number };
    assert.equal(buscarInscricao(id)?.cupom_codigo, null);
  });
});

describe("POST /api/inscricoes — CPF ja inscrito", () => {
  it("bloqueia CPF com inscricao paga", async () => {
    inserirInscricao({ status_pagamento: "pago" });

    const resposta = await inscrever(FORMULARIO);

    assert.equal(resposta.status, 409);
    assert.deepEqual(await resposta.json(), {
      erro: "Já existe uma inscrição paga para este CPF",
    });
  });

  it("aproveita a inscricao pendente em vez de criar outra", async () => {
    const anterior = inserirInscricao({
      nome: "Nome Antigo",
      distancia: "18km",
      valor: 160,
    });

    const resposta = await inscrever({ ...FORMULARIO, equipe: "Trilheiros" });
    const { id } = (await resposta.json()) as { id: number };

    assert.equal(id, anterior.id, "mantem o mesmo external_reference");
    const atualizada = buscarInscricao(id);
    assert.equal(atualizada?.nome, "Maria Souza");
    assert.equal(atualizada?.equipe, "Trilheiros");
    assert.equal(atualizada?.distancia, "8km");
    assert.equal(atualizada?.valor, 130);
    assert.equal(atualizada?.cidade, "Bacabal");
    assert.equal(atualizada?.lote, "2º lote");
    assert.equal(
      contarInscricoes(),
      1,
      "nao pode aparecer uma segunda inscricao para o mesmo CPF",
    );
  });

  // O webhook pode ter falhado: antes de deixar pagar de novo, confere no MP.
  it("fecha como paga a pendente que ja tinha pagamento aprovado", async () => {
    const pendente = inserirInscricao();
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [{ id: 555, status: "approved" }],
    });

    const resposta = await inscrever(FORMULARIO);

    assert.equal(resposta.status, 409);
    const atualizada = buscarInscricao(pendente.id);
    assert.equal(atualizada?.status_pagamento, "pago");
    assert.equal(atualizada?.mp_payment_id, "555");
  });

  it("fecha como paga mesmo quando o pagamento aprovado vem sem id", async () => {
    const pendente = inserirInscricao();
    globalThis.__testeMp.paymentSearch = async () => ({
      results: [{ status: "approved" }],
    });

    const resposta = await inscrever(FORMULARIO);

    assert.equal(resposta.status, 409);
    const atualizada = buscarInscricao(pendente.id);
    assert.equal(atualizada?.status_pagamento, "pago");
    assert.equal(atualizada?.mp_payment_id, null);
  });

  it("segue com o checkout quando a consulta ao Mercado Pago falha", async () => {
    inserirInscricao();
    globalThis.__testeMp.paymentSearch = async () => {
      throw new Error("MP fora do ar");
    };
    const console = silenciarErros();
    restauradores.push(console.restaurar);

    const resposta = await inscrever(FORMULARIO);

    assert.equal(resposta.status, 200);
    assert.equal(
      console.registros[0][0],
      "Erro ao consultar pagamento no Mercado Pago",
    );
  });

  it("nao considera inscricao cancelada do mesmo CPF", async () => {
    inserirInscricao({ status_pagamento: "cancelado" });

    const resposta = await inscrever(FORMULARIO);

    assert.equal(resposta.status, 200);
    assert.equal(contarInscricoes(), 2);
  });
});

describe("POST /api/inscricoes — falha no Mercado Pago", () => {
  it("devolve 502 e nao deixa inscricao orfa", async () => {
    globalThis.__testeMp.preferenceCreate = async () => {
      throw new Error("MP fora do ar");
    };
    const console = silenciarErros();
    restauradores.push(console.restaurar);

    const resposta = await inscrever(FORMULARIO);

    assert.equal(resposta.status, 502);
    assert.deepEqual(await resposta.json(), {
      erro: "Não foi possível iniciar o pagamento. Tente novamente.",
    });
    assert.equal(contarInscricoes(), 0);
    assert.equal(
      console.registros[0][0],
      "Erro ao criar preferência Mercado Pago",
    );
  });

  // Aqui a inscricao ja existia: apagar perderia o cadastro do atleta.
  it("preserva a inscricao pendente que ja estava no banco", async () => {
    const anterior = inserirInscricao();
    globalThis.__testeMp.preferenceCreate = async () => {
      throw new Error("MP fora do ar");
    };
    const console = silenciarErros();
    restauradores.push(console.restaurar);

    const resposta = await inscrever(FORMULARIO);

    assert.equal(resposta.status, 502);
    assert.ok(buscarInscricao(anterior.id));
  });

  it("aceita preferencia sem link e devolve initPoint indefinido", async () => {
    globalThis.__testeMp.preferenceCreate = async () => ({});

    const resposta = await inscrever(FORMULARIO);
    const corpo = (await resposta.json()) as { initPoint?: string };

    assert.equal(resposta.status, 200);
    assert.equal(corpo.initPoint, undefined);
    assert.equal(ultimaInscricao()?.mp_preference_id, null);
  });
});

describe("POST /api/inscricoes — camisa extra junto", () => {
  const comCamisa = (tamanhos: unknown) =>
    inscrever({ ...FORMULARIO, camisasExtras: tamanhos });

  it("inscreve sem camisa nenhuma", async () => {
    const resposta = await inscrever(FORMULARIO);
    assert.equal(resposta.status, 200);
    assert.equal(contarPedidosCamisa(), 0);
  });

  it("grava o pedido vinculado a inscricao", async () => {
    const resposta = await comCamisa([
      { tamanho: "M", quantidade: 2 },
      { tamanho: "G", quantidade: 1 },
    ]);
    const corpo = (await resposta.json()) as { id: number };

    assert.equal(resposta.status, 200);
    const camisa = ultimoPedidoCamisa();
    assert.equal(camisa?.inscricao_id, corpo.id);
    assert.equal(camisa?.origem, "inscricao");
    assert.equal(camisa?.quantidade, 3);
    assert.equal(camisa?.valor, 60);
    assert.equal(camisa?.status_pagamento, "pendente");
    assert.equal(camisa?.mp_preference_id, "pref-teste");
  });

  // O cupom desconta a inscricao, nao a camisa; e a receita por inscricao
  // continua sendo so a da inscricao.
  it("nao mistura o valor da camisa com o da inscricao", async () => {
    const resposta = await comCamisa([{ tamanho: "M", quantidade: 1 }]);
    const corpo = (await resposta.json()) as { id: number };
    assert.equal(buscarInscricao(corpo.id)?.valor, 130);
    assert.equal(ultimoPedidoCamisa()?.valor, 20);
  });

  it("manda inscricao e camisas como itens separados no checkout", async () => {
    await comCamisa([{ tamanho: "GG", quantidade: 2 }]);
    const chamada = globalThis.__testeMp.chamadas.find(
      (c) => c.metodo === "preference.create",
    ) as { args: { body: { items: { title: string; unit_price: number }[] } } };

    assert.deepEqual(
      chamada.args.body.items.map((i) => [i.title, i.unit_price]),
      [
        ["Inscrição 8km — SAMAS TRAIL", 130],
        ["Camisa extra SAMAS TRAIL — tamanho GG", 20],
      ],
    );
  });

  it("recusa tamanho fora da grade da camisa extra", async () => {
    const resposta = await comCamisa([{ tamanho: "PP", quantidade: 1 }]);
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), {
      erro: "Tamanho de camisa inválido",
    });
  });

  it("recusa mais de 5 camisas", async () => {
    const resposta = await comCamisa([{ tamanho: "M", quantidade: 6 }]);
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), {
      erro: "No máximo 5 camisas por compra",
    });
  });

  // Camisa esgotada nao pode custar a inscricao: nada e gravado e o atleta
  // volta com tudo intacto para tirar a camisa e seguir.
  it("estoque insuficiente nao cria a inscricao", async () => {
    const resposta = await comCamisa([{ tamanho: "P", quantidade: 1 }]);

    assert.equal(resposta.status, 409);
    assert.deepEqual(await resposta.json(), {
      erro: "Não temos mais 1 camisa(s) tamanho P",
      faltas: [{ tamanho: "P", pedido: 1, disponivel: 0 }],
    });
    assert.equal(contarInscricoes(), 0);
    assert.equal(contarPedidosCamisa(), 0);
  });

  it("estoque insuficiente nao apaga a inscricao pendente que ja existia", async () => {
    const existente = inserirInscricao({ cpf: "52998224725" });
    const resposta = await comCamisa([{ tamanho: "P", quantidade: 1 }]);

    assert.equal(resposta.status, 409);
    assert.equal(buscarInscricao(existente.id)?.nome, "Atleta Teste");
  });

  // Refazer a inscricao pendente nao pode acumular reservas da tentativa
  // anterior: o pedido velho sai e as pecas voltam.
  it("refazer a inscricao troca o pedido pendente em vez de somar", async () => {
    const primeira = await comCamisa([{ tamanho: "XG", quantidade: 1 }]);
    assert.equal(primeira.status, 200);

    const segunda = await comCamisa([{ tamanho: "GG", quantidade: 1 }]);
    assert.equal(segunda.status, 200);

    assert.equal(contarPedidosCamisa(), 1);
    assert.equal(ultimoPedidoCamisa()?.quantidade, 1);
    // A XG da tentativa anterior voltou para o estoque.
    assert.equal(disponibilidade().XG, 1);
  });

  it("apaga inscricao e pedido quando o Mercado Pago falha", async () => {
    restauradores.push(silenciarErros().restaurar);
    globalThis.__testeMp.preferenceCreate = async () => {
      throw new Error("MP fora do ar");
    };

    const resposta = await comCamisa([{ tamanho: "M", quantidade: 1 }]);

    assert.equal(resposta.status, 502);
    assert.equal(contarInscricoes(), 0);
    assert.equal(contarPedidosCamisa(), 0);
  });
});

describe("POST /api/inscricoes — checkout sem id de preferencia", () => {
  it("aceita preferencia sem id tambem no pedido de camisa", async () => {
    globalThis.__testeMp.preferenceCreate = async () => ({
      init_point: "https://mp.test/checkout/sem-id",
    });

    const resposta = await inscrever({
      ...FORMULARIO,
      camisasExtras: [{ tamanho: "M", quantidade: 1 }],
    });

    assert.equal(resposta.status, 200);
    assert.equal(ultimoPedidoCamisa()?.mp_preference_id, null);
  });
});
