import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { DISTANCIAS, getPreco, type Distancia } from "@/lib/config";
import { VALOR_MINIMO, arredondar } from "@/lib/cupom";
import { getDb } from "@/lib/db";
import type { Inscricao, StatusPagamento } from "@/lib/types";

const STATUS_VALIDOS: StatusPagamento[] = ["pendente", "pago", "cancelado"];

type PatchPayload = {
  distancia?: Distancia;
  statusPagamento?: StatusPagamento;
  kitRetirado?: boolean;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  let payload: PatchPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const db = getDb();
  const inscricao = db
    .prepare("SELECT * FROM inscricoes WHERE id = ?")
    .get(Number(id)) as unknown as Inscricao | undefined;

  if (!inscricao) {
    return NextResponse.json(
      { erro: "Inscrição não encontrada" },
      { status: 404 },
    );
  }

  if (payload.distancia !== undefined) {
    if (!DISTANCIAS.includes(payload.distancia)) {
      return NextResponse.json({ erro: "Distância inválida" }, { status: 400 });
    }
    // Só recalcula enquanto está pendente; mantém o desconto do cupom usado.
    const novoValor =
      inscricao.status_pagamento === "pendente"
        ? Math.max(
            arredondar(getPreco(payload.distancia) - inscricao.desconto),
            VALOR_MINIMO,
          )
        : inscricao.valor;
    db.prepare(
      "UPDATE inscricoes SET distancia = ?, valor = ? WHERE id = ?",
    ).run(payload.distancia, novoValor, inscricao.id);
  }

  if (payload.statusPagamento !== undefined) {
    if (!STATUS_VALIDOS.includes(payload.statusPagamento)) {
      return NextResponse.json({ erro: "Status inválido" }, { status: 400 });
    }
    db.prepare("UPDATE inscricoes SET status_pagamento = ? WHERE id = ?").run(
      payload.statusPagamento,
      inscricao.id,
    );
  }

  if (payload.kitRetirado !== undefined) {
    db.prepare(
      `UPDATE inscricoes SET kit_retirado_em =
         CASE WHEN ? THEN datetime('now', 'localtime') ELSE NULL END
       WHERE id = ?`,
    ).run(payload.kitRetirado ? 1 : 0, inscricao.id);
  }

  const atualizada = db
    .prepare("SELECT * FROM inscricoes WHERE id = ?")
    .get(inscricao.id);

  return NextResponse.json({ inscricao: atualizada });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const resultado = getDb()
    .prepare("DELETE FROM inscricoes WHERE id = ?")
    .run(Number(id));

  if (resultado.changes === 0) {
    return NextResponse.json(
      { erro: "Inscrição não encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
