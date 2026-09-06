import { getDb } from "./db";
import { enviarEmailCamisaConfirmada } from "./emailCamisaConfirmada";
import { enviarEmailInscricaoConfirmada } from "./emailInscricaoConfirmada";
import { disponibilidade, itensDoPedido } from "./estoque";
import { getPaymentClient } from "./mercadopago";
import type { Inscricao, PedidoCamisa, StatusPagamento } from "./types";

export const MP_STATUS_PARA_LOCAL: Record<string, StatusPagamento> = {
  approved: "pago",
  pending: "pendente",
  in_process: "pendente",
  authorized: "pendente",
  rejected: "cancelado",
  cancelled: "cancelado",
  refunded: "cancelado",
  charged_back: "cancelado",
};

/**
 * `referencia` e o external_reference: id puro para inscricao, "camisa-<id>"
 * para pedido de camisa.
 */
export const buscarPagamentoAprovadoMp = async (
  referencia: string | number,
) => {
  const busca = await getPaymentClient().search({
    options: {
      external_reference: String(referencia),
      sort: "date_last_updated",
      criteria: "desc",
    },
  });
  return busca.results?.find((p) => p.status === "approved") ?? null;
};

const camisasDaInscricao = (inscricaoId: number): PedidoCamisa[] =>
  getDb()
    .prepare(
      `SELECT * FROM pedidos_camisa
        WHERE inscricao_id = ? AND origem = 'inscricao'`,
    )
    .all(inscricaoId) as unknown as PedidoCamisa[];

export const registrarStatusPagamento = async (
  inscricaoId: number,
  status: StatusPagamento,
  paymentId: string | null,
): Promise<void> => {
  const db = getDb();
  const inscricao = db
    .prepare("SELECT * FROM inscricoes WHERE id = ?")
    .get(inscricaoId) as unknown as Inscricao | undefined;

  if (!inscricao) {
    return;
  }

  // Camisa comprada junto acompanha o pagamento da inscricao e nao gera
  // e-mail proprio: ela e citada no e-mail da inscricao.
  const pedidos = camisasDaInscricao(inscricaoId);
  for (const pedido of pedidos) {
    db.prepare(
      `UPDATE pedidos_camisa SET status_pagamento = ?, mp_payment_id = ?
        WHERE id = ? AND status_pagamento != 'pago'`,
    ).run(status, paymentId ?? pedido.mp_payment_id, pedido.id);
  }

  if (status === "pago") {
    // Condição no UPDATE garante um único e-mail mesmo se webhook e
    // verificação de status confirmarem o pagamento ao mesmo tempo.
    const resultado = db
      .prepare(
        `UPDATE inscricoes SET status_pagamento = 'pago', mp_payment_id = ?
         WHERE id = ? AND status_pagamento != 'pago'`,
      )
      .run(paymentId ?? inscricao.mp_payment_id, inscricaoId);

    if (resultado.changes > 0) {
      await enviarEmailInscricaoConfirmada(
        { ...inscricao, status_pagamento: "pago" },
        pedidos.flatMap((pedido) => itensDoPedido(pedido.id)),
      );
    }
    return;
  }

  db.prepare(
    "UPDATE inscricoes SET status_pagamento = ?, mp_payment_id = ? WHERE id = ?",
  ).run(status, paymentId ?? inscricao.mp_payment_id, inscricaoId);
};

/**
 * O pagamento pode chegar depois da reserva vencer, com a peca ja vendida
 * para outra pessoa. Recusar dinheiro capturado nao e opcao: marca o
 * estouro para a organizacao resolver em vez de esconder o problema.
 */
const marcarEstoqueEstourado = (pedido: PedidoCamisa): void => {
  // Sem excluir o próprio pedido, a reserva dele contaria contra ele e todo
  // pedido que leva a última peça de um tamanho seria acusado de estouro.
  const sobra = disponibilidade(pedido.id);
  const faltou = itensDoPedido(pedido.id).some(
    (item) => item.quantidade > sobra[item.tamanho],
  );
  if (faltou) {
    getDb()
      .prepare("UPDATE pedidos_camisa SET estoque_estourado = 1 WHERE id = ?")
      .run(pedido.id);
  }
};

export const registrarStatusPagamentoCamisa = async (
  pedidoId: number,
  status: StatusPagamento,
  paymentId: string | null,
): Promise<void> => {
  const db = getDb();
  const pedido = db
    .prepare("SELECT * FROM pedidos_camisa WHERE id = ?")
    .get(pedidoId) as unknown as PedidoCamisa | undefined;

  if (!pedido) {
    return;
  }

  if (status === "pago") {
    // A conferencia roda antes do UPDATE: depois de gravar, o proprio
    // pedido ja contaria como vendido e o estoque nunca pareceria estourado.
    marcarEstoqueEstourado(pedido);

    const resultado = db
      .prepare(
        `UPDATE pedidos_camisa SET status_pagamento = 'pago', mp_payment_id = ?
          WHERE id = ? AND status_pagamento != 'pago'`,
      )
      .run(paymentId ?? pedido.mp_payment_id, pedidoId);

    if (resultado.changes > 0) {
      await enviarEmailCamisaConfirmada({
        pedido: { ...pedido, status_pagamento: "pago" },
        itens: itensDoPedido(pedidoId),
        inscricaoId: pedido.inscricao_id,
      });
    }
    return;
  }

  db.prepare(
    "UPDATE pedidos_camisa SET status_pagamento = ?, mp_payment_id = ? WHERE id = ?",
  ).run(status, paymentId ?? pedido.mp_payment_id, pedidoId);
};
