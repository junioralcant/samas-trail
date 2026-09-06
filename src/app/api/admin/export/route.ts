import { NextResponse } from "next/server";
import { camisasPorInscricao } from "@/lib/adminCamisas";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { resumirItens } from "@/lib/estoque";
import { calcularIdade, ehMenorDeIdade } from "@/lib/idade";
import type { Inscricao } from "@/lib/types";

const CSV_HEADER = [
  "ID",
  "Nome",
  "CPF",
  "E-mail",
  "Telefone",
  "Cidade",
  "Nascimento",
  "Sexo",
  "Camiseta",
  "Equipe",
  "Distância",
  "Lote",
  "Camisas extras",
  "Tamanhos camisas",
  "Cupom",
  "Desconto",
  "Valor",
  "Status",
  "Kit retirado em",
  "Idade",
  "Menor de idade",
  "Termo aceito em",
  "Termo versao",
  "Termo IP",
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

  const camisas = camisasPorInscricao();

  const linhas = inscricoes.map((i) => {
    const itens = camisas[i.id] ?? [];
    return [
      i.id,
      i.nome,
      i.cpf,
      i.email,
      i.telefone,
      i.cidade,
      i.data_nascimento,
      i.sexo,
      i.tamanho_camiseta,
      i.equipe,
      i.distancia,
      i.lote,
      itens.reduce((soma, item) => soma + item.quantidade, 0),
      resumirItens(itens),
      i.cupom_codigo,
      i.desconto.toFixed(2).replace(".", ","),
      i.valor.toFixed(2).replace(".", ","),
      i.status_pagamento,
      i.kit_retirado_em,
      calcularIdade(i.data_nascimento),
      ehMenorDeIdade(i.data_nascimento) ? "sim" : "nao",
      i.termo_aceito_em,
      i.termo_versao,
      i.termo_ip,
      i.criado_em,
    ]
      .map(escapeCsv)
      .join(";");
  });

  const csv = "﻿" + [CSV_HEADER.join(";"), ...linhas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inscricoes.csv"',
    },
  });
}
