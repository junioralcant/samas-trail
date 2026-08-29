import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  let payload: { ativo?: boolean };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  if (payload.ativo === undefined) {
    return NextResponse.json({ erro: "Nada para atualizar" }, { status: 400 });
  }

  const resultado = getDb()
    .prepare("UPDATE cupons SET ativo = ? WHERE id = ?")
    .run(payload.ativo ? 1 : 0, Number(id));

  if (resultado.changes === 0) {
    return NextResponse.json({ erro: "Cupom não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const resultado = getDb()
    .prepare("DELETE FROM cupons WHERE id = ?")
    .run(Number(id));

  if (resultado.changes === 0) {
    return NextResponse.json({ erro: "Cupom não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
