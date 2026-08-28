import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  buscarPagamentoAprovadoMp,
  registrarStatusPagamento,
} from "@/lib/pagamento";
import type { Inscricao } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ erro: "Inscrição inválida" }, { status: 400 });
  }

  const inscricao = getDb()
    .prepare("SELECT * FROM inscricoes WHERE id = ?")
    .get(Number(id)) as unknown as Inscricao | undefined;

  if (!inscricao) {
    return NextResponse.json(
      { erro: "Inscrição não encontrada" },
      { status: 404 },
    );
  }

  if (inscricao.status_pagamento !== "pendente") {
    return NextResponse.json({ status: inscricao.status_pagamento });
  }

  // Fallback do webhook: consulta o Mercado Pago direto. Só promove para
  // "pago" — uma tentativa rejeitada não cancela a inscrição, o usuário
  // ainda pode pagar de novo pelo checkout.
  try {
    const aprovado = await buscarPagamentoAprovadoMp(inscricao.id);
    if (aprovado) {
      await registrarStatusPagamento(
        inscricao.id,
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
