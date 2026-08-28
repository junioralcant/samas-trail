import { NextResponse } from "next/server";
import { DISTANCIAS, getAppUrl, getEventName, getPreco } from "@/lib/config";
import { limparCpf, validarCpf } from "@/lib/cpf";
import { getDb } from "@/lib/db";
import { getPreferenceClient } from "@/lib/mercadopago";
import {
  buscarPagamentoAprovadoMp,
  registrarStatusPagamento,
} from "@/lib/pagamento";
import type { Inscricao, NovaInscricaoPayload } from "@/lib/types";

const CAMPOS_OBRIGATORIOS: (keyof NovaInscricaoPayload)[] = [
  "nome",
  "cpf",
  "email",
  "telefone",
  "dataNascimento",
  "sexo",
  "tamanhoCamiseta",
  "distancia",
];

export async function POST(request: Request) {
  let payload: NovaInscricaoPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  for (const campo of CAMPOS_OBRIGATORIOS) {
    if (!payload[campo] || String(payload[campo]).trim() === "") {
      return NextResponse.json(
        { erro: `Campo obrigatório: ${campo}` },
        { status: 400 },
      );
    }
  }

  if (!DISTANCIAS.includes(payload.distancia)) {
    return NextResponse.json({ erro: "Distância inválida" }, { status: 400 });
  }

  const cpf = limparCpf(payload.cpf);
  if (!validarCpf(cpf)) {
    return NextResponse.json({ erro: "CPF inválido" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    return NextResponse.json({ erro: "E-mail inválido" }, { status: 400 });
  }

  const db = getDb();

  const existente = db
    .prepare(
      `SELECT * FROM inscricoes WHERE cpf = ? AND status_pagamento != 'cancelado'`,
    )
    .get(cpf) as unknown as Inscricao | undefined;

  if (existente && existente.status_pagamento === "pago") {
    return NextResponse.json(
      { erro: "Já existe uma inscrição paga para este CPF" },
      { status: 409 },
    );
  }

  if (existente) {
    // Pendente: pode ser um pagamento aprovado que o webhook ainda não
    // registrou — confere no Mercado Pago antes de deixar pagar de novo.
    try {
      const aprovado = await buscarPagamentoAprovadoMp(existente.id);
      if (aprovado) {
        await registrarStatusPagamento(
          existente.id,
          "pago",
          aprovado.id ? String(aprovado.id) : null,
        );
        return NextResponse.json(
          { erro: "Já existe uma inscrição paga para este CPF" },
          { status: 409 },
        );
      }
    } catch (error) {
      console.error("Erro ao consultar pagamento no Mercado Pago", error);
    }
  }

  const valor = getPreco(payload.distancia);

  let inscricaoId: number;

  if (existente) {
    // Reaproveita a inscrição pendente abandonada: atualiza os dados e
    // gera um novo checkout, mantendo o mesmo id (external_reference).
    db.prepare(
      `UPDATE inscricoes SET
        nome = ?, email = ?, telefone = ?, data_nascimento = ?, sexo = ?,
        tamanho_camiseta = ?, equipe = ?, distancia = ?, valor = ?
       WHERE id = ?`,
    ).run(
      payload.nome.trim(),
      payload.email.trim().toLowerCase(),
      payload.telefone.trim(),
      payload.dataNascimento,
      payload.sexo,
      payload.tamanhoCamiseta,
      payload.equipe?.trim() || null,
      payload.distancia,
      valor,
      existente.id,
    );
    inscricaoId = existente.id;
  } else {
    const resultado = db
      .prepare(
        `INSERT INTO inscricoes
          (nome, cpf, email, telefone, data_nascimento, sexo, tamanho_camiseta, equipe, distancia, valor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        payload.nome.trim(),
        cpf,
        payload.email.trim().toLowerCase(),
        payload.telefone.trim(),
        payload.dataNascimento,
        payload.sexo,
        payload.tamanhoCamiseta,
        payload.equipe?.trim() || null,
        payload.distancia,
        valor,
      );
    inscricaoId = Number(resultado.lastInsertRowid);
  }
  const appUrl = getAppUrl();
  const isHttps = appUrl.startsWith("https://");

  try {
    const preference = await getPreferenceClient().create({
      body: {
        items: [
          {
            id: `inscricao-${payload.distancia}`,
            title: `Inscrição ${payload.distancia} — ${getEventName()}`,
            quantity: 1,
            unit_price: valor,
            currency_id: "BRL",
          },
        ],
        payer: {
          name: payload.nome.trim(),
          email: payload.email.trim().toLowerCase(),
          identification: { type: "CPF", number: cpf },
        },
        external_reference: String(inscricaoId),
        back_urls: {
          success: `${appUrl}/inscricao/retorno?resultado=sucesso`,
          pending: `${appUrl}/inscricao/retorno?resultado=pendente`,
          failure: `${appUrl}/inscricao/retorno?resultado=erro`,
        },
        ...(isHttps ? { auto_return: "approved" as const } : {}),
        notification_url: isHttps
          ? `${appUrl}/api/webhook/mercadopago`
          : undefined,
        statement_descriptor: getEventName().slice(0, 22),
      },
    });

    db.prepare("UPDATE inscricoes SET mp_preference_id = ? WHERE id = ?").run(
      preference.id ?? null,
      inscricaoId,
    );

    return NextResponse.json({
      id: inscricaoId,
      initPoint: preference.init_point,
    });
  } catch (error) {
    if (!existente) {
      db.prepare("DELETE FROM inscricoes WHERE id = ?").run(inscricaoId);
    }
    console.error("Erro ao criar preferência Mercado Pago", error);
    return NextResponse.json(
      { erro: "Não foi possível iniciar o pagamento. Tente novamente." },
      { status: 502 },
    );
  }
}
