import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { CODIGO_REGEX, arredondar, normalizarCodigo } from "@/lib/cupom";
import { getDb } from "@/lib/db";
import type { Cupom } from "@/lib/types";

type CupomComUsos = Cupom & { usos: number };

const listar = (): CupomComUsos[] =>
  getDb()
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(*) FROM inscricoes i
           WHERE i.cupom_codigo = c.codigo
             AND i.status_pagamento != 'cancelado') AS usos
       FROM cupons c
       ORDER BY c.ativo DESC, c.criado_em DESC`,
    )
    .all() as unknown as CupomComUsos[];

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  return NextResponse.json({ cupons: listar() });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let payload: { codigo?: string; desconto?: number; validade?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const codigo = normalizarCodigo(payload.codigo ?? "");
  if (!CODIGO_REGEX.test(codigo)) {
    return NextResponse.json(
      { erro: "Código deve ter de 3 a 20 caracteres (letras, números ou -)" },
      { status: 400 },
    );
  }

  const desconto = arredondar(Number(payload.desconto));
  if (!Number.isFinite(desconto) || desconto <= 0) {
    return NextResponse.json(
      { erro: "Desconto deve ser maior que zero" },
      { status: 400 },
    );
  }

  const validade = payload.validade?.trim() || null;
  if (validade && !/^\d{4}-\d{2}-\d{2}$/.test(validade)) {
    return NextResponse.json({ erro: "Validade inválida" }, { status: 400 });
  }

  const db = getDb();
  const jaExiste = db
    .prepare("SELECT id FROM cupons WHERE codigo = ?")
    .get(codigo);

  if (jaExiste) {
    return NextResponse.json(
      { erro: "Já existe um cupom com este código" },
      { status: 409 },
    );
  }

  db.prepare(
    "INSERT INTO cupons (codigo, desconto, validade) VALUES (?, ?, ?)",
  ).run(codigo, desconto, validade);

  return NextResponse.json({ cupons: listar() }, { status: 201 });
}
