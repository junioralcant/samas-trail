import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  buscarPagamentoAprovadoMp,
  registrarStatusPagamentoCamisa,
} from "@/lib/pagamento";
import { referenciaCamisa } from "@/lib/pedidoCamisa";
import type { PedidoCamisa } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ erro: "Pedido inválido" }, { status: 400 });
  }

  const pedido = getDb()
    .prepare("SELECT * FROM pedidos_camisa WHERE id = ?")
    .get(Number(id)) as unknown as PedidoCamisa | undefined;

  if (!pedido) {
    return NextResponse.json(
      { erro: "Pedido não encontrado" },
      { status: 404 },
    );
  }

  if (pedido.status_pagamento !== "pendente") {
    return NextResponse.json({ status: pedido.status_pagamento });
  }

  // Mesmo remendo do webhook da inscricao: so promove para "pago", nunca
  // cancela — o comprador ainda pode pagar pelo checkout aberto.
  try {
    const aprovado = await buscarPagamentoAprovadoMp(
      referenciaCamisa(pedido.id),
    );
    if (aprovado) {
      await registrarStatusPagamentoCamisa(
        pedido.id,
        "pago",
        aprovado.id ? String(aprovado.id) : null,
      );
      return NextResponse.json({ status: "pago" });
    }
  } catch (error) {
    console.error("Erro ao consultar pagamento no Mercado Pago", error);
  }

  return NextResponse.json({ status: "pendente" });
}
