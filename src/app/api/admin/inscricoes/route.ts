import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Inscricao } from "@/lib/types";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const distancia = url.searchParams.get("distancia");
  const status = url.searchParams.get("status");
  const busca = url.searchParams.get("busca");

  const condicoes: string[] = [];
  const params: string[] = [];

  if (distancia) {
    condicoes.push("distancia = ?");
    params.push(distancia);
  }
  if (status) {
    condicoes.push("status_pagamento = ?");
    params.push(status);
  }
  if (busca) {
    condicoes.push("(nome LIKE ? OR cpf LIKE ? OR email LIKE ?)");
    const like = `%${busca}%`;
    params.push(like, like, like);
  }

  const where = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";
  const db = getDb();

  const inscricoes = db
    .prepare(`SELECT * FROM inscricoes ${where} ORDER BY criado_em DESC`)
    .all(...params) as unknown as Inscricao[];

  const stats = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN distancia = '8km' THEN 1 ELSE 0 END), 0) AS total8km,
         COALESCE(SUM(CASE WHEN distancia = '18km' THEN 1 ELSE 0 END), 0) AS total18km,
         COALESCE(SUM(CASE WHEN status_pagamento = 'pago' THEN 1 ELSE 0 END), 0) AS pagos,
         COALESCE(SUM(CASE WHEN status_pagamento = 'pendente' THEN 1 ELSE 0 END), 0) AS pendentes,
         COALESCE(SUM(CASE WHEN status_pagamento = 'pago' THEN valor ELSE 0 END), 0) AS receita
       FROM inscricoes`,
    )
    .get();

  return NextResponse.json({ inscricoes, stats });
}
