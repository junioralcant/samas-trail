import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { POST } from "@/app/api/admin/kit/route";
import {
  buscarInscricao,
  inserirInscricao,
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
