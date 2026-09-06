import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { enviarEmailCamisaConfirmada } from "@/lib/emailCamisaConfirmada";
import type { ItemCamisa } from "@/lib/estoque";
import type { PedidoCamisa } from "@/lib/types";
import {
  espionarFetch,
  inserirPedidoCamisa,
  limparBanco,
} from "../helpers";

const AMBIENTE = { ...process.env };
const restauradores: (() => void)[] = [];

/** Envia o e-mail e devolve o corpo que iria para a Resend. */
const corpoDoEmail = async (
  pedido: PedidoCamisa,
  itens: ItemCamisa[],
  inscricaoId: number | null,
) => {
  process.env.RESEND_API_KEY = "re_teste";
  const espiao = espionarFetch(new Response("{}", { status: 200 }));
  restauradores.push(espiao.restaurar);

  const enviado = await enviarEmailCamisaConfirmada({
    pedido,
    itens,
    inscricaoId,
  });
  assert.equal(enviado, true);

  return JSON.parse(
    String((espiao.chamadas[0].opcoes as { body: string }).body),
  ) as { html: string; subject: string; to: string[] };
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

describe("enviarEmailCamisaConfirmada", () => {
  it("monta o e-mail com os dados do pedido", async () => {
    const pedido = inserirPedidoCamisa({
      nome: "Maria Souza",
      email: "maria@teste.com",
      status_pagamento: "pago",
    });

    const corpo = await corpoDoEmail(
      pedido,
      [
        { tamanho: "M", quantidade: 2 },
        { tamanho: "G", quantidade: 1 },
      ],
      null,
    );

    assert.deepEqual(corpo.to, ["maria@teste.com"]);
    assert.equal(corpo.subject, "Pedido confirmado — camisa extra SAMAS TRAIL");
    assert.ok(corpo.html.includes("Maria Souza"));
    assert.ok(corpo.html.includes(`#${pedido.id}`));
    assert.ok(corpo.html.includes("2× M, 1× G"));
    assert.ok(corpo.html.includes(`/camisa/${pedido.token}`));
  });

  // Sem inscricao, a camisa precisa do QR proprio para ser retirada.
  it("traz o QR proprio quando nao ha vinculo", async () => {
    const pedido = inserirPedidoCamisa({ status_pagamento: "pago" });
    const corpo = await corpoDoEmail(
      pedido,
      [{ tamanho: "M", quantidade: 1 }],
      null,
    );

    assert.ok(corpo.html.includes(`/api/qr/${pedido.token}`));
    assert.ok(corpo.html.includes("Apresente este QR code"));
  });

  // Com vinculo a entrega e uma so, junto do kit: um segundo QR confundiria
  // quem entrega.
  it("troca o QR pelo aviso de entrega junto do kit quando ha vinculo", async () => {
    const pedido = inserirPedidoCamisa({ status_pagamento: "pago" });
    const corpo = await corpoDoEmail(
      pedido,
      [{ tamanho: "M", quantidade: 1 }],
      42,
    );

    assert.ok(!corpo.html.includes(`/api/qr/${pedido.token}`));
    assert.ok(corpo.html.includes("#42"));
    assert.ok(corpo.html.includes("junto com o seu kit"));
  });

  it("usa o nome de evento do ambiente", async () => {
    process.env.EVENT_NAME = "OUTRA PROVA";
    const pedido = inserirPedidoCamisa({ status_pagamento: "pago" });
    const corpo = await corpoDoEmail(
      pedido,
      [{ tamanho: "M", quantidade: 1 }],
      null,
    );
    assert.equal(
      corpo.subject,
      "Pedido confirmado — camisa extra OUTRA PROVA",
    );
  });

  it("cai para o nome padrao sem EVENT_NAME", async () => {
    delete process.env.EVENT_NAME;
    const pedido = inserirPedidoCamisa({ status_pagamento: "pago" });
    const corpo = await corpoDoEmail(
      pedido,
      [{ tamanho: "M", quantidade: 1 }],
      null,
    );
    assert.equal(
      corpo.subject,
      "Pedido confirmado — camisa extra SAMAS TRAIL",
    );
  });

  it("nao sai para a rede sem chave da Resend", async () => {
    delete process.env.RESEND_API_KEY;
    const pedido = inserirPedidoCamisa({ status_pagamento: "pago" });
    const enviado = await enviarEmailCamisaConfirmada({
      pedido,
      itens: [{ tamanho: "M", quantidade: 1 }],
      inscricaoId: null,
    });
    assert.equal(enviado, false);
  });
});
