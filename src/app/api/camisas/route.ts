import { NextResponse } from "next/server";
import { getAppUrl, getEventName } from "@/lib/config";
import { getPrecoCamisa } from "@/lib/configuracoes";
import { limparCpf, validarCpf } from "@/lib/cpf";
import { emTransacao, getDb } from "@/lib/db";
import { verificarDisponibilidade } from "@/lib/estoque";
import { getPreferenceClient } from "@/lib/mercadopago";
import {
  apagarPedidoCamisa,
  buscarInscricaoPorCpf,
  criarPedidoCamisa,
  itensPreferencia,
  referenciaCamisa,
  respostaFalta,
  validarItens,
} from "@/lib/pedidoCamisa";
import type { NovoPedidoCamisaPayload } from "@/lib/types";

const CAMPOS_OBRIGATORIOS: (keyof NovoPedidoCamisaPayload)[] = [
  "nome",
  "cpf",
  "email",
  "telefone",
];

export async function POST(request: Request) {
  let payload: NovoPedidoCamisaPayload;
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

  const cpf = limparCpf(payload.cpf);
  if (!validarCpf(cpf)) {
    return NextResponse.json({ erro: "CPF inválido" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    return NextResponse.json({ erro: "E-mail inválido" }, { status: 400 });
  }

  const validacao = validarItens(payload.tamanhos);
  if ("erro" in validacao) {
    return NextResponse.json({ erro: validacao.erro }, { status: 400 });
  }
  if (validacao.quantidade === 0) {
    return NextResponse.json(
      { erro: "Escolha ao menos uma camisa" },
      { status: 400 },
    );
  }

  const preco = getPrecoCamisa();
  const nome = payload.nome.trim();
  const email = payload.email.trim().toLowerCase();

  // Quem ja corre recebe a camisa junto do kit; quem nao corre ganha QR
  // proprio. Os dois compram do mesmo jeito.
  const inscricao = buscarInscricaoPorCpf(cpf);

  // Conferir e gravar na mesma transação: sem o lock, duas compras leem
  // "1 XG disponível" ao mesmo tempo e as duas passam.
  const resultado = emTransacao(() => {
    const faltas = verificarDisponibilidade(validacao.itens);
    if (faltas.length > 0) {
      return { faltas };
    }
    return criarPedidoCamisa({
      inscricaoId: inscricao?.id ?? null,
      nome,
      cpf,
      email,
      telefone: payload.telefone.trim(),
      origem: "avulso",
      itens: validacao.itens,
      preco,
    });
  });

  if ("faltas" in resultado) {
    return NextResponse.json(respostaFalta(resultado.faltas), { status: 409 });
  }

  const appUrl = getAppUrl();
  const isHttps = appUrl.startsWith("https://");

  try {
    const preference = await getPreferenceClient().create({
      body: {
        items: itensPreferencia(validacao.itens, preco.precoAtual),
        payer: {
          name: nome,
          email,
          identification: { type: "CPF", number: cpf },
        },
        external_reference: referenciaCamisa(resultado.pedidoId),
        back_urls: {
          success: `${appUrl}/camisa/retorno?resultado=sucesso`,
          pending: `${appUrl}/camisa/retorno?resultado=pendente`,
          failure: `${appUrl}/camisa/retorno?resultado=erro`,
        },
        ...(isHttps ? { auto_return: "approved" as const } : {}),
        notification_url: isHttps
          ? `${appUrl}/api/webhook/mercadopago`
          : undefined,
        statement_descriptor: getEventName().slice(0, 22),
      },
    });

    getDb()
      .prepare("UPDATE pedidos_camisa SET mp_preference_id = ? WHERE id = ?")
      .run(preference.id ?? null, resultado.pedidoId);

    return NextResponse.json({
      id: resultado.pedidoId,
      initPoint: preference.init_point,
      vinculada: inscricao ? inscricao.id : null,
    });
  } catch (error) {
    // Sem checkout nao ha venda: apagar devolve a reserva na hora, em vez
    // de deixar a peca presa ate a reserva vencer.
    apagarPedidoCamisa(resultado.pedidoId);
    console.error("Erro ao criar preferência Mercado Pago", error);
    return NextResponse.json(
      { erro: "Não foi possível iniciar o pagamento. Tente novamente." },
      { status: 502 },
    );
  }
}
