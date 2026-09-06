import { NextResponse } from "next/server";
import { getPaymentClient } from "@/lib/mercadopago";
import {
  MP_STATUS_PARA_LOCAL,
  registrarStatusPagamento,
  registrarStatusPagamentoCamisa,
} from "@/lib/pagamento";
import type { StatusPagamento } from "@/lib/types";

const extrairPaymentId = async (request: Request): Promise<string | null> => {
  const url = new URL(request.url);
  const queryId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const queryType =
    url.searchParams.get("type") ?? url.searchParams.get("topic");

  let body: { type?: string; data?: { id?: string | number } } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (body?.type === "payment" && body.data?.id) {
    return String(body.data.id);
  }
  if (queryType === "payment" && queryId) {
    return queryId;
  }
  return null;
};

/**
 * Inscricao usa o id puro ("12") desde sempre — mudar quebraria as
 * pendentes. Camisa avulsa nasceu com prefixo.
 */
const rotear = async (
  referencia: string,
  status: StatusPagamento,
  paymentId: string,
): Promise<void> => {
  if (/^\d+$/.test(referencia)) {
    await registrarStatusPagamento(Number(referencia), status, paymentId);
    return;
  }
  const camisa = /^camisa-(\d+)$/.exec(referencia);
  if (camisa) {
    await registrarStatusPagamentoCamisa(Number(camisa[1]), status, paymentId);
  }
};

export async function POST(request: Request) {
  const paymentId = await extrairPaymentId(request);
  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  try {
    const payment = await getPaymentClient().get({ id: paymentId });
    const referencia = payment.external_reference;
    const status = payment.status
      ? MP_STATUS_PARA_LOCAL[payment.status]
      : undefined;

    if (referencia && status) {
      await rotear(referencia, status, paymentId);
    }
  } catch (error) {
    console.error("Erro ao processar webhook Mercado Pago", error);
  }

  return NextResponse.json({ ok: true });
}
