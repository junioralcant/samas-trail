import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Inscricao } from "@/lib/types";

const CSV_HEADER = [
  "ID",
  "Nome",
  "CPF",
  "E-mail",
  "Telefone",
  "Nascimento",
  "Sexo",
  "Camiseta",
  "Equipe",
  "Distância",
  "Valor",
  "Status",
  "Kit retirado em",
  "Inscrito em",
];

const escapeCsv = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const inscricoes = getDb()
    .prepare("SELECT * FROM inscricoes ORDER BY distancia, nome")
    .all() as unknown as Inscricao[];

  const linhas = inscricoes.map((i) =>
    [
      i.id,
      i.nome,
      i.cpf,
      i.email,
      i.telefone,
      i.data_nascimento,
      i.sexo,
      i.tamanho_camiseta,
      i.equipe,
      i.distancia,
      i.valor.toFixed(2).replace(".", ","),
      i.status_pagamento,
      i.kit_retirado_em,
      i.criado_em,
    ]
      .map(escapeCsv)
      .join(";"),
  );

  const csv = "﻿" + [CSV_HEADER.join(";"), ...linhas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inscricoes.csv"',
    },
  });
}
