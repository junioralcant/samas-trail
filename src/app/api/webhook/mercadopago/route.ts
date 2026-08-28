import { NextResponse } from "next/server";
import { getPaymentClient } from "@/lib/mercadopago";
import { MP_STATUS_PARA_LOCAL, registrarStatusPagamento } from "@/lib/pagamento";

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

export async function POST(request: Request) {
  const paymentId = await extrairPaymentId(request);
  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  try {
    const payment = await getPaymentClient().get({ id: paymentId });
    const inscricaoId = payment.external_reference;
    const status = payment.status
      ? MP_STATUS_PARA_LOCAL[payment.status]
      : undefined;

    if (inscricaoId && /^\d+$/.test(inscricaoId) && status) {
      await registrarStatusPagamento(Number(inscricaoId), status, paymentId);
    }
  } catch (error) {
    console.error("Erro ao processar webhook Mercado Pago", error);
  }

  return NextResponse.json({ ok: true });
}
