import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { POST } from "@/app/api/admin/kit/route";
import {
  buscarInscricao,
  buscarPedidoCamisa,
  inserirInscricao,
  inserirPedidoCamisa,
  limparBanco,
  logarComoAdmin,
  marcarKitRetirado,
  pedido,
  sairDoAdmin,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/admin/kit";

type RespostaKit = {
  jaRetirado?: boolean;
  erro?: string;
  inscricao?: Record<string, unknown>;
};

const conferir = async (corpo: unknown) => {
  const resposta = await POST(pedido(URL_ROTA, { body: corpo }));
  return { resposta, corpo: (await resposta.json()) as RespostaKit };
};

beforeEach(() => {
  limparBanco();
  logarComoAdmin();
});

describe("POST /api/admin/kit", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const { resposta } = await conferir({ token: "a".repeat(32) });
    assert.equal(resposta.status, 401);
  });

  it("recusa corpo que nao e JSON", async () => {
    const { resposta, corpo } = await conferir("token");
    assert.equal(resposta.status, 400);
    assert.deepEqual(corpo, { erro: "Dados inválidos" });
  });

  it("libera o kit e marca a retirada", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });

    const { resposta, corpo } = await conferir({ token: inscricao.kit_token });

    assert.equal(resposta.status, 200);
    assert.equal(corpo.jaRetirado, false);
    assert.equal(corpo.inscricao?.nome, inscricao.nome);
    assert.ok(corpo.inscricao?.kit_retirado_em);
    // O resumo devolvido nao expoe dados que o balcao nao precisa.
    assert.equal(corpo.inscricao?.cpf, undefined);
    assert.equal(corpo.inscricao?.email, undefined);
    assert.ok(buscarInscricao(inscricao.id)?.kit_retirado_em);
  });

  // O QR carrega a URL inteira; a rota aceita ela ou so o token.
  it("aceita o token dentro da URL lida do QR", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });

    const { corpo } = await conferir({
      token: `https://www.samastrail.com.br/inscricao/${inscricao.kit_token}`,
    });

    assert.equal(corpo.jaRetirado, false);
  });

  it("avisa quando o kit ja tinha sido retirado", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });
    marcarKitRetirado(inscricao.id, "2026-11-22 07:15:00");

    const { resposta, corpo } = await conferir({ token: inscricao.kit_token });

    assert.equal(resposta.status, 200);
    assert.equal(corpo.jaRetirado, true);
    assert.equal(corpo.inscricao?.kit_retirado_em, "2026-11-22 07:15:00");
  });

  it("recusa QR que nao tem cara de token", async () => {
    const { resposta, corpo } = await conferir({ token: "codigo-qualquer" });
    assert.equal(resposta.status, 400);
    assert.deepEqual(corpo, { erro: "QR code não reconhecido" });
  });

  it("recusa pedido sem token", async () => {
    const { resposta, corpo } = await conferir({});
    assert.equal(resposta.status, 400);
    assert.deepEqual(corpo, { erro: "QR code não reconhecido" });
  });

  it("responde 404 para token que nao existe", async () => {
    const { resposta, corpo } = await conferir({ token: "a".repeat(32) });
    assert.equal(resposta.status, 404);
    assert.deepEqual(corpo, {
      erro: "Inscrição não encontrada para este QR code",
    });
  });

  // Kit so sai com pagamento confirmado, mas o balcao ve de quem e a inscricao.
  it("segura o kit de quem nao pagou", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pendente" });

    const { resposta, corpo } = await conferir({ token: inscricao.kit_token });

    assert.equal(resposta.status, 409);
    assert.equal(corpo.erro, "Pagamento não confirmado (status: pendente)");
    assert.equal(corpo.inscricao?.nome, inscricao.nome);
    assert.equal(buscarInscricao(inscricao.id)?.kit_retirado_em, null);
  });

  it("segura o kit de inscricao cancelada", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "cancelado" });

    const { resposta, corpo } = await conferir({ token: inscricao.kit_token });

    assert.equal(resposta.status, 409);
    assert.equal(corpo.erro, "Pagamento não confirmado (status: cancelado)");
  });
});

describe("POST /api/admin/kit — camisa extra", () => {
  beforeEach(() => {
    logarComoAdmin();
  });

  const ler = async (token: string) => {
    const resposta = await POST(pedido(URL_ROTA, { body: { token } }));
    return {
      status: resposta.status,
      corpo: (await resposta.json()) as {
        tipo?: string;
        jaRetirado?: boolean;
        erro?: string;
        camisasResumo?: string;
        camisasExtras?: { tamanho: string; quantidade: number }[];
        pedido?: { id: number; resumo: string; inscricao_id: number | null };
      },
    };
  };

  // Uma leitura entrega tudo: marcar só o kit deixaria a camisa vinculada
  // pendente para sempre.
  it("libera o kit e marca as camisas vinculadas na mesma leitura", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });
    const camisa = inserirPedidoCamisa(
      {
        inscricao_id: inscricao.id,
        origem: "inscricao",
        status_pagamento: "pago",
      },
      [
        { tamanho: "M", quantidade: 2 },
        { tamanho: "G", quantidade: 1 },
      ],
    );

    const { status, corpo } = await ler(String(inscricao.kit_token));

    assert.equal(status, 200);
    assert.equal(corpo.tipo, "inscricao");
    assert.equal(corpo.jaRetirado, false);
    assert.equal(corpo.camisasResumo, "2× M, 1× G");
    assert.ok(buscarInscricao(inscricao.id)?.kit_retirado_em);
    assert.ok(buscarPedidoCamisa(camisa.id)?.retirado_em);
  });

  it("nao entrega camisa ainda nao paga junto do kit", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });
    const camisa = inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      status_pagamento: "pendente",
    });

    const { corpo } = await ler(String(inscricao.kit_token));

    assert.equal(corpo.camisasResumo, "");
    assert.equal(buscarPedidoCamisa(camisa.id)?.retirado_em, null);
  });

  it("kit sem camisa segue funcionando", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });
    const { corpo } = await ler(String(inscricao.kit_token));
    assert.equal(corpo.tipo, "inscricao");
    assert.equal(corpo.camisasResumo, "");
  });

  it("repete as camisas quando o kit ja tinha sido retirado", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });
    inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      status_pagamento: "pago",
    });
    marcarKitRetirado(inscricao.id);

    const { corpo } = await ler(String(inscricao.kit_token));

    assert.equal(corpo.jaRetirado, true);
    assert.equal(corpo.camisasResumo, "1× M");
  });

  it("identifica o tipo na inscricao nao paga", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pendente" });
    const { status, corpo } = await ler(String(inscricao.kit_token));
    assert.equal(status, 409);
    assert.equal(corpo.tipo, "inscricao");
  });

  // Quem comprou sem se inscrever retira pelo mesmo leitor.
  it("entrega a camisa avulsa pelo token do pedido", async () => {
    const camisa = inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "GG", quantidade: 1 },
    ]);

    const { status, corpo } = await ler(String(camisa.token));

    assert.equal(status, 200);
    assert.equal(corpo.tipo, "camisa");
    assert.equal(corpo.jaRetirado, false);
    assert.equal(corpo.pedido?.resumo, "1× GG");
    assert.ok(buscarPedidoCamisa(camisa.id)?.retirado_em);
  });

  it("avisa quando a camisa avulsa ja foi entregue", async () => {
    const camisa = inserirPedidoCamisa({
      status_pagamento: "pago",
      retirado_em: "2026-11-22 07:10:00",
    });

    const { status, corpo } = await ler(String(camisa.token));

    assert.equal(status, 200);
    assert.equal(corpo.tipo, "camisa");
    assert.equal(corpo.jaRetirado, true);
  });

  it("recusa camisa com pagamento nao confirmado", async () => {
    const camisa = inserirPedidoCamisa({ status_pagamento: "pendente" });

    const { status, corpo } = await ler(String(camisa.token));

    assert.equal(status, 409);
    assert.equal(corpo.tipo, "camisa");
    assert.match(corpo.erro ?? "", /Pagamento não confirmado/);
    assert.equal(buscarPedidoCamisa(camisa.id)?.retirado_em, null);
  });

  // Camisa vinculada lida pelo QR proprio: o operador precisa saber que
  // ela normalmente sai no kit, para nao entregar duas vezes.
  it("avisa quando a camisa lida tem inscricao vinculada", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });
    const camisa = inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      status_pagamento: "pago",
    });

    const { corpo } = await ler(String(camisa.token));

    assert.equal(corpo.pedido?.inscricao_id, inscricao.id);
  });
});
