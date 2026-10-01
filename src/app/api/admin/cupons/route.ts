import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { CODIGO_REGEX, normalizarCodigo, validarRegra } from "@/lib/cupom";
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

  let payload: {
    codigo?: string;
    desconto?: number;
    tipo?: string;
    validade?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const codigo = normalizarCodigo(payload.codigo ?? "");
  if (!CODIGO_REGEX.test(codigo)) {
    return NextResponse.json(
      { erro: "O código deve ter de 3 a 20 caracteres (letras, números ou -)" },
      { status: 400 },
    );
  }

  const regra = validarRegra(payload);
  if ("erro" in regra) {
    return NextResponse.json({ erro: regra.erro }, { status: 400 });
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
    "INSERT INTO cupons (codigo, desconto, tipo, validade) VALUES (?, ?, ?, ?)",
  ).run(codigo, regra.desconto, regra.tipo, regra.validade);

  return NextResponse.json({ cupons: listar() }, { status: 201 });
}
