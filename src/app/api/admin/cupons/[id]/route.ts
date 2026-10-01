import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { validarRegra } from "@/lib/cupom";
import { getDb } from "@/lib/db";
import type { Cupom } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  let payload: {
    ativo?: boolean;
    tipo?: string;
    desconto?: number;
    validade?: string | null;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const editaRegra =
    payload.tipo !== undefined ||
    payload.desconto !== undefined ||
    payload.validade !== undefined;

  if (payload.ativo === undefined && !editaRegra) {
    return NextResponse.json({ erro: "Nada para atualizar" }, { status: 400 });
  }

  const db = getDb();
  const cupom = db
    .prepare("SELECT * FROM cupons WHERE id = ?")
    .get(Number(id)) as unknown as Cupom | undefined;

  if (!cupom) {
    return NextResponse.json({ erro: "Cupom não encontrado" }, { status: 404 });
  }

  // O que não veio no pedido fica como está; validade null tira a data.
  // Inscrições já feitas guardaram o desconto em reais e não mudam.
  const regra = validarRegra({
    tipo: payload.tipo ?? cupom.tipo,
    desconto: payload.desconto ?? cupom.desconto,
    validade:
      payload.validade === undefined ? cupom.validade : payload.validade,
  });
  if ("erro" in regra) {
    return NextResponse.json({ erro: regra.erro }, { status: 400 });
  }

  const ativo =
    payload.ativo === undefined ? cupom.ativo : payload.ativo ? 1 : 0;

  db.prepare(
    "UPDATE cupons SET tipo = ?, desconto = ?, validade = ?, ativo = ? WHERE id = ?",
  ).run(regra.tipo, regra.desconto, regra.validade, ativo, cupom.id);

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
