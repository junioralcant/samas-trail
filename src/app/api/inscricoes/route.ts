import { NextResponse } from "next/server";
import {
  DISTANCIAS,
  getAppUrl,
  getEventName,
  getLoteAtual,
  getPreco,
} from "@/lib/config";
import { getPrecoCamisa } from "@/lib/configuracoes";
import { limparCpf, validarCpf } from "@/lib/cpf";
import { aplicarCupom } from "@/lib/cupom";
import { emTransacao, gerarKitToken, getDb } from "@/lib/db";
import { verificarDisponibilidade, type FaltaEstoque } from "@/lib/estoque";
import { getPreferenceClient } from "@/lib/mercadopago";
import {
  apagarPedidoCamisa,
  criarPedidoCamisa,
  itensPreferencia,
  respostaFalta,
  validarItens,
} from "@/lib/pedidoCamisa";
import { TERMO_VERSAO } from "@/lib/termo";
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
  "cidade",
  "dataNascimento",
  "sexo",
  "tamanhoCamiseta",
  "distancia",
];

type Gravado = { inscricaoId: number; pedidoId: number | null };

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

  // O checkbox do formulario nao vale como prova: o aceite tem que ser
  // exigido aqui tambem, junto da versao do termo aceita.
  if (payload.termoAceito !== true) {
    return NextResponse.json(
      { erro: "É necessário aceitar o Termo de Responsabilidade" },
      { status: 400 },
    );
  }

  const camisas = validarItens(payload.camisasExtras);
  if ("erro" in camisas) {
    return NextResponse.json({ erro: camisas.erro }, { status: 400 });
  }

  const termoIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const termoUserAgent = request.headers.get("user-agent");

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

  const valorBase = getPreco(payload.distancia);

  // Revalida o cupom no servidor: o que veio do formulário é só uma sugestão.
  let cupomCodigo: string | null = null;
  let desconto = 0;
  if (payload.cupom && payload.cupom.trim() !== "") {
    const cupom = aplicarCupom(payload.cupom, valorBase);
    if ("erro" in cupom) {
      return NextResponse.json({ erro: cupom.erro }, { status: 400 });
    }
    cupomCodigo = cupom.codigo;
    desconto = cupom.desconto;
  }
  // O valor da inscrição não inclui as camisas: elas têm valor próprio no
  // pedido, e o cupom vale só para a inscrição.
  const valor = valorBase - desconto;
  const lote = getLoteAtual();
  const nome = payload.nome.trim();
  const email = payload.email.trim().toLowerCase();
  const telefone = payload.telefone.trim();
  const precoCamisa = getPrecoCamisa();

  const gravar = (): Gravado | { faltas: FaltaEstoque[] } => {
    // Confere o estoque antes de tocar na inscrição: faltando peça, nada é
    // gravado e o atleta volta com tudo intacto para ajustar a escolha.
    const faltas = verificarDisponibilidade(camisas.itens);
    if (faltas.length > 0) {
      return { faltas };
    }

    let inscricaoId: number;

    if (existente) {
      // Reaproveita a inscrição pendente abandonada: atualiza os dados e
      // gera um novo checkout, mantendo o mesmo id (external_reference).
      db.prepare(
        `UPDATE inscricoes SET
          nome = ?, email = ?, telefone = ?, cidade = ?, data_nascimento = ?, sexo = ?,
          tamanho_camiseta = ?, equipe = ?, distancia = ?, valor = ?,
          cupom_codigo = ?, desconto = ?, lote = ?,
          termo_aceito_em = datetime('now', 'localtime'), termo_versao = ?,
          termo_ip = ?, termo_user_agent = ?
         WHERE id = ?`,
      ).run(
        nome,
        email,
        telefone,
        payload.cidade.trim(),
        payload.dataNascimento,
        payload.sexo,
        payload.tamanhoCamiseta,
        payload.equipe?.trim() || null,
        payload.distancia,
        valor,
        cupomCodigo,
        desconto,
        lote,
        TERMO_VERSAO,
        termoIp,
        termoUserAgent,
        existente.id,
      );
      inscricaoId = existente.id;
      // A tentativa anterior pode ter reservado outros tamanhos: some com
      // ela para devolver aquelas peças em vez de esperar a reserva vencer.
      db.prepare(
        `DELETE FROM pedidos_camisa
          WHERE inscricao_id = ? AND origem = 'inscricao'
            AND status_pagamento = 'pendente'`,
      ).run(inscricaoId);
    } else {
      const resultado = db
        .prepare(
          `INSERT INTO inscricoes
            (nome, cpf, email, telefone, cidade, data_nascimento, sexo, tamanho_camiseta, equipe, distancia, valor, cupom_codigo, desconto, lote, kit_token,
             termo_aceito_em, termo_versao, termo_ip, termo_user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
        )
        .run(
          nome,
          cpf,
          email,
          telefone,
          payload.cidade.trim(),
          payload.dataNascimento,
          payload.sexo,
          payload.tamanhoCamiseta,
          payload.equipe?.trim() || null,
          payload.distancia,
          valor,
          cupomCodigo,
          desconto,
          lote,
          gerarKitToken(),
          TERMO_VERSAO,
          termoIp,
          termoUserAgent,
        );
      inscricaoId = Number(resultado.lastInsertRowid);
    }

    if (camisas.quantidade === 0) {
      return { inscricaoId, pedidoId: null };
    }

    // Sem preferência própria: a camisa entra na do atleta e o status
    // dela passa a acompanhar o da inscrição.
    const pedido = criarPedidoCamisa({
      inscricaoId,
      nome,
      cpf,
      email,
      telefone,
      origem: "inscricao",
      itens: camisas.itens,
      preco: precoCamisa,
    });

    return { inscricaoId, pedidoId: pedido.pedidoId };
  };

  const gravado = emTransacao(gravar);
  if ("faltas" in gravado) {
    return NextResponse.json(respostaFalta(gravado.faltas), { status: 409 });
  }
  const { inscricaoId, pedidoId } = gravado;

  const appUrl = getAppUrl();
  const isHttps = appUrl.startsWith("https://");

  try {
    const preference = await getPreferenceClient().create({
      body: {
        items: [
          {
            id: `inscricao-${payload.distancia}`,
            title: cupomCodigo
              ? `Inscrição ${payload.distancia} — ${getEventName()} (cupom ${cupomCodigo})`
              : `Inscrição ${payload.distancia} — ${getEventName()}`,
            quantity: 1,
            unit_price: valor,
            currency_id: "BRL",
          },
          ...itensPreferencia(camisas.itens, precoCamisa.precoAtual),
        ],
        payer: {
          name: nome,
          email,
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
    if (pedidoId !== null) {
      db.prepare(
        "UPDATE pedidos_camisa SET mp_preference_id = ? WHERE id = ?",
      ).run(preference.id ?? null, pedidoId);
    }

    return NextResponse.json({
      id: inscricaoId,
      initPoint: preference.init_point,
    });
  } catch (error) {
    // Sem checkout não houve venda: apagar o pedido devolve as peças na
    // hora, em vez de deixá-las presas até a reserva vencer.
    if (pedidoId !== null) {
      apagarPedidoCamisa(pedidoId);
    }
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
