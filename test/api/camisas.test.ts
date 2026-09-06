import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { POST } from "@/app/api/camisas/route";
import { CHAVE_CAMISA_PRECO_PROMO, gravarConfiguracao } from "@/lib/configuracoes";
import { itensDoPedido } from "@/lib/estoque";
import {
  contarPedidosCamisa,
  definirEstoque,
  inserirInscricao,
  inserirPedidoCamisa,
  limparBanco,
  pedido,
  silenciarErros,
  ultimoPedidoCamisa,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/camisas";

const FORMULARIO = {
  nome: "  Maria Souza  ",
  cpf: "529.982.247-25",
  email: "  MARIA@Teste.com  ",
  telefone: " (98) 99999-0000 ",
  tamanhos: [{ tamanho: "M", quantidade: 2 }],
};

const AMBIENTE = { ...process.env };
const restauradores: (() => void)[] = [];

const comprar = (corpo: unknown) => POST(pedido(URL_ROTA, { body: corpo }));

beforeEach(() => {
  limparBanco();
  globalThis.__testeMp.preferenceCreate = async () => ({
    id: "pref-camisa",
    init_point: "https://mp.test/checkout/pref-camisa",
  });
});

afterEach(() => {
  while (restauradores.length > 0) {
    restauradores.pop()?.();
  }
  process.env = { ...AMBIENTE };
});

describe("POST /api/camisas — validacao", () => {
  it("recusa corpo que nao e JSON", async () => {
    const resposta = await comprar("nao-e-json");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  for (const campo of ["nome", "cpf", "email", "telefone"]) {
    it(`cobra o campo ${campo}`, async () => {
      const resposta = await comprar({ ...FORMULARIO, [campo]: "" });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), {
        erro: `Campo obrigatório: ${campo}`,
      });
    });
  }

  it("recusa CPF invalido", async () => {
    const resposta = await comprar({ ...FORMULARIO, cpf: "111.111.111-11" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "CPF inválido" });
  });

  it("recusa e-mail sem formato de e-mail", async () => {
    const resposta = await comprar({ ...FORMULARIO, email: "maria@" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "E-mail inválido" });
  });

  it("recusa lista de tamanhos que nao e lista", async () => {
    const resposta = await comprar({ ...FORMULARIO, tamanhos: "M" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Camisas inválidas" });
  });

  // PP e da camiseta do kit, nao desta peca.
  it("recusa tamanho fora da grade da camisa extra", async () => {
    const resposta = await comprar({
      ...FORMULARIO,
      tamanhos: [{ tamanho: "PP", quantidade: 1 }],
    });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), {
      erro: "Tamanho de camisa inválido",
    });
  });

  it("recusa o mesmo tamanho repetido", async () => {
    const resposta = await comprar({
      ...FORMULARIO,
      tamanhos: [
        { tamanho: "M", quantidade: 1 },
        { tamanho: "M", quantidade: 1 },
      ],
    });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), {
      erro: "Tamanho repetido na lista de camisas",
    });
  });

  it("recusa quantidade quebrada ou negativa", async () => {
    for (const quantidade of [1.5, -1, "duas"]) {
      const resposta = await comprar({
        ...FORMULARIO,
        tamanhos: [{ tamanho: "M", quantidade }],
      });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), {
        erro: "Quantidade de camisas inválida",
      });
    }
  });

  it("recusa mais de 5 camisas no mesmo pedido", async () => {
    const resposta = await comprar({
      ...FORMULARIO,
      tamanhos: [
        { tamanho: "M", quantidade: 5 },
        { tamanho: "G", quantidade: 1 },
      ],
    });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), {
      erro: "No máximo 5 camisas por compra",
    });
  });

  it("recusa pedido sem nenhuma camisa", async () => {
    for (const tamanhos of [[], [{ tamanho: "M", quantidade: 0 }], undefined]) {
      const resposta = await comprar({ ...FORMULARIO, tamanhos });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), {
        erro: "Escolha ao menos uma camisa",
      });
    }
  });
});

describe("POST /api/camisas — estoque", () => {
  it("recusa tamanho esgotado dizendo o que sobrou", async () => {
    const resposta = await comprar({
      ...FORMULARIO,
      tamanhos: [{ tamanho: "P", quantidade: 1 }],
    });
    assert.equal(resposta.status, 409);
    assert.deepEqual(await resposta.json(), {
      erro: "Não temos mais 1 camisa(s) tamanho P",
      faltas: [{ tamanho: "P", pedido: 1, disponivel: 0 }],
    });
    assert.equal(contarPedidosCamisa(), 0);
  });

  it("aceita a unica XG e recusa a segunda", async () => {
    const primeira = await comprar({
      ...FORMULARIO,
      tamanhos: [{ tamanho: "XG", quantidade: 1 }],
    });
    assert.equal(primeira.status, 200);

    const segunda = await comprar({
      ...FORMULARIO,
      cpf: "00000000191",
      tamanhos: [{ tamanho: "XG", quantidade: 1 }],
    });
    assert.equal(segunda.status, 409);
  });

  it("avisa em bloco quando falta mais de um tamanho", async () => {
    definirEstoque("M", 1);
    const resposta = await comprar({
      ...FORMULARIO,
      tamanhos: [
        { tamanho: "M", quantidade: 2 },
        { tamanho: "XG", quantidade: 2 },
      ],
    });
    assert.equal(resposta.status, 409);
    const corpo = (await resposta.json()) as { erro: string; faltas: [] };
    assert.equal(
      corpo.erro,
      "Alguns tamanhos escolhidos não estão mais disponíveis",
    );
    assert.equal(corpo.faltas.length, 2);
  });

  // Reserva vencida devolve a peca: a proxima compra passa.
  it("reserva vencida libera a peca para outra pessoa", async () => {
    const antigo = inserirPedidoCamisa(
      { reservado_ate: "2000-01-01 00:00:00" },
      [{ tamanho: "XG", quantidade: 1 }],
    );
    assert.equal(antigo.status_pagamento, "pendente");

    const resposta = await comprar({
      ...FORMULARIO,
      tamanhos: [{ tamanho: "XG", quantidade: 1 }],
    });
    assert.equal(resposta.status, 200);
  });
});

describe("POST /api/camisas — pedido criado", () => {
  it("grava o pedido, reserva a peca e devolve o checkout", async () => {
    const resposta = await comprar(FORMULARIO);
    const corpo = (await resposta.json()) as {
      id: number;
      initPoint: string;
      vinculada: number | null;
    };

    assert.equal(resposta.status, 200);
    assert.equal(corpo.initPoint, "https://mp.test/checkout/pref-camisa");
    assert.equal(corpo.vinculada, null);

    const gravado = ultimoPedidoCamisa();
    assert.equal(gravado?.nome, "Maria Souza");
    assert.equal(gravado?.cpf, "52998224725");
    assert.equal(gravado?.email, "maria@teste.com");
    assert.equal(gravado?.telefone, "(98) 99999-0000");
    assert.equal(gravado?.origem, "avulso");
    assert.equal(gravado?.quantidade, 2);
    assert.equal(gravado?.valor_unitario, 20);
    assert.equal(gravado?.valor, 40);
    assert.equal(gravado?.promocional, 1);
    assert.equal(gravado?.status_pagamento, "pendente");
    assert.equal(gravado?.mp_preference_id, "pref-camisa");
    assert.match(gravado?.token ?? "", /^[0-9a-f]{32}$/);
    assert.ok(gravado?.reservado_ate);
  });

  it("guarda um item por tamanho", async () => {
    await comprar({
      ...FORMULARIO,
      tamanhos: [
        { tamanho: "M", quantidade: 2 },
        { tamanho: "G", quantidade: 1 },
      ],
    });
    const gravado = ultimoPedidoCamisa() as { id: number };
    assert.deepEqual(
      itensDoPedido(gravado.id).map((i) => [i.tamanho, i.quantidade]),
      [
        ["M", 2],
        ["G", 1],
      ],
    );
  });

  it("cobra o preco cheio quando a promocao esta desligada", async () => {
    gravarConfiguracao(CHAVE_CAMISA_PRECO_PROMO, "");
    await comprar({
      ...FORMULARIO,
      tamanhos: [{ tamanho: "M", quantidade: 1 }],
    });
    const gravado = ultimoPedidoCamisa();
    assert.equal(gravado?.valor_unitario, 45);
    assert.equal(gravado?.promocional, 0);
  });

  it("manda um item por tamanho e a referencia com prefixo para o MP", async () => {
    await comprar({
      ...FORMULARIO,
      tamanhos: [
        { tamanho: "M", quantidade: 2 },
        { tamanho: "G", quantidade: 1 },
      ],
    });
    const chamada = globalThis.__testeMp.chamadas.find(
      (c) => c.metodo === "preference.create",
    ) as { args: { body: Record<string, unknown> } };
    const body = chamada.args.body;
    const gravado = ultimoPedidoCamisa() as { id: number };

    assert.equal(body.external_reference, `camisa-${gravado.id}`);
    assert.deepEqual(
      (body.items as { title: string; quantity: number }[]).map((i) => [
        i.title,
        i.quantity,
      ]),
      [
        ["Camisa extra SAMAS TRAIL — tamanho M", 2],
        ["Camisa extra SAMAS TRAIL — tamanho G", 1],
      ],
    );
    assert.deepEqual(body.back_urls, {
      success: "http://localhost:3000/camisa/retorno?resultado=sucesso",
      pending: "http://localhost:3000/camisa/retorno?resultado=pendente",
      failure: "http://localhost:3000/camisa/retorno?resultado=erro",
    });
  });
});

describe("POST /api/camisas — vinculo com a inscricao", () => {
  it("vincula quando o CPF ja tem inscricao paga", async () => {
    const inscricao = inserirInscricao({
      cpf: "52998224725",
      status_pagamento: "pago",
    });
    const resposta = await comprar(FORMULARIO);
    const corpo = (await resposta.json()) as { vinculada: number | null };

    assert.equal(corpo.vinculada, inscricao.id);
    assert.equal(ultimoPedidoCamisa()?.inscricao_id, inscricao.id);
  });

  it("prefere a inscricao paga a uma pendente do mesmo CPF", async () => {
    inserirInscricao({ cpf: "52998224725", status_pagamento: "pendente" });
    const paga = inserirInscricao({
      cpf: "52998224725",
      status_pagamento: "pago",
    });
    await comprar(FORMULARIO);
    assert.equal(ultimoPedidoCamisa()?.inscricao_id, paga.id);
  });

  it("ignora inscricao cancelada", async () => {
    inserirInscricao({ cpf: "52998224725", status_pagamento: "cancelado" });
    await comprar(FORMULARIO);
    assert.equal(ultimoPedidoCamisa()?.inscricao_id, null);
  });

  // Quem nao corre compra igual: a venda e aberta.
  it("vende para CPF sem nenhuma inscricao", async () => {
    const resposta = await comprar(FORMULARIO);
    assert.equal(resposta.status, 200);
    assert.equal(ultimoPedidoCamisa()?.inscricao_id, null);
  });
});

describe("POST /api/camisas — falha no Mercado Pago", () => {
  it("apaga o pedido e devolve a reserva", async () => {
    restauradores.push(silenciarErros().restaurar);
    globalThis.__testeMp.preferenceCreate = async () => {
      throw new Error("MP fora do ar");
    };

    const resposta = await comprar(FORMULARIO);
    assert.equal(resposta.status, 502);
    assert.deepEqual(await resposta.json(), {
      erro: "Não foi possível iniciar o pagamento. Tente novamente.",
    });
    assert.equal(contarPedidosCamisa(), 0);
  });

  it("aceita preferencia sem id", async () => {
    globalThis.__testeMp.preferenceCreate = async () => ({
      init_point: "https://mp.test/checkout/sem-id",
    });
    const resposta = await comprar(FORMULARIO);
    assert.equal(resposta.status, 200);
    assert.equal(ultimoPedidoCamisa()?.mp_preference_id, null);
  });
});

describe("POST /api/camisas — checkout em producao", () => {
  // Em HTTP local o Mercado Pago recusa auto_return e nao consegue chamar
  // o webhook; os dois so entram quando a URL e https.
  it("liga auto_return e webhook quando a APP_URL e https", async () => {
    process.env.APP_URL = "https://samastrail.com.br";

    await comprar(FORMULARIO);

    const chamada = globalThis.__testeMp.chamadas.find(
      (c) => c.metodo === "preference.create",
    ) as { args: { body: Record<string, unknown> } };
    assert.equal(chamada.args.body.auto_return, "approved");
    assert.equal(
      chamada.args.body.notification_url,
      "https://samastrail.com.br/api/webhook/mercadopago",
    );
  });

  it("nao manda auto_return nem webhook em http", async () => {
    await comprar(FORMULARIO);

    const chamada = globalThis.__testeMp.chamadas.find(
      (c) => c.metodo === "preference.create",
    ) as { args: { body: Record<string, unknown> } };
    assert.equal(chamada.args.body.auto_return, undefined);
    assert.equal(chamada.args.body.notification_url, undefined);
  });
});
