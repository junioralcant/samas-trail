import { getDb } from "./db";
import { enviarEmailInscricaoConfirmada } from "./emailInscricaoConfirmada";
import { getPaymentClient } from "./mercadopago";
import type { Inscricao, StatusPagamento } from "./types";

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

export const buscarPagamentoAprovadoMp = async (inscricaoId: number) => {
  const busca = await getPaymentClient().search({
    options: {
      external_reference: String(inscricaoId),
      sort: "date_last_updated",
      criteria: "desc",
    },
  });
  return busca.results?.find((p) => p.status === "approved") ?? null;
};

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
      await enviarEmailInscricaoConfirmada({
        ...inscricao,
        status_pagamento: "pago",
      });
    }
    return;
  }

  db.prepare(
    "UPDATE inscricoes SET status_pagamento = ?, mp_payment_id = ? WHERE id = ?",
  ).run(status, paymentId ?? inscricao.mp_payment_id, inscricaoId);
};
