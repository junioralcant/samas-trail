import { NextResponse } from "next/server";
import { listarPedidosCamisa } from "@/lib/adminCamisas";
import { isAdminAuthenticated } from "@/lib/auth";

const CSV_HEADER = [
  "Pedido",
  "Comprador",
  "CPF",
  "E-mail",
  "Telefone",
  "Origem",
  "Tamanhos",
  "Qtd",
  "Valor",
  "Status",
  "Sem peça",
  "Inscrição vinculada",
  "Atleta vinculado",
  "Entrega",
  "Retirado em",
  "Comprado em",
];

const escapeCsv = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const linhas = listarPedidosCamisa().map((p) =>
    [
      `C-${p.id}`,
      p.nome,
      p.cpf,
      p.email,
      p.telefone,
      p.origem,
      p.resumo,
      p.quantidade,
      p.valor.toFixed(2).replace(".", ","),
      p.status_pagamento,
      p.estoque_estourado ? "sim" : "nao",
      p.inscricao ? p.inscricao.id : "",
      p.inscricao ? p.inscricao.nome : "",
      // O que a tenda precisa saber de relance na hora de entregar.
      p.inscricao ? "com o kit" : "QR próprio",
      p.retirado_em,
      p.criado_em,
    ]
      .map(escapeCsv)
      .join(";"),
  );

  const csv = "﻿" + [CSV_HEADER.join(";"), ...linhas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="camisas-extras.csv"',
    },
  });
}
