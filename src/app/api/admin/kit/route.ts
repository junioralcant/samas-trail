import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { itensDoPedido, resumirItens, type ItemCamisa } from "@/lib/estoque";
import type { Inscricao, PedidoCamisa } from "@/lib/types";

const resumo = (inscricao: Inscricao) => ({
  id: inscricao.id,
  nome: inscricao.nome,
  distancia: inscricao.distancia,
  tamanho_camiseta: inscricao.tamanho_camiseta,
  equipe: inscricao.equipe,
  status_pagamento: inscricao.status_pagamento,
  kit_retirado_em: inscricao.kit_retirado_em,
  data_nascimento: inscricao.data_nascimento,
  termo_aceito_em: inscricao.termo_aceito_em,
});

const resumoPedido = (pedido: PedidoCamisa, itens: ItemCamisa[]) => ({
  id: pedido.id,
  nome: pedido.nome,
  quantidade: pedido.quantidade,
  resumo: resumirItens(itens),
  status_pagamento: pedido.status_pagamento,
  retirado_em: pedido.retirado_em,
  inscricao_id: pedido.inscricao_id,
});

/** Camisas pagas que saem junto do kit daquela inscrição. */
const camisasDaInscricao = (inscricaoId: number) => {
  const pedidos = getDb()
    .prepare(
      `SELECT * FROM pedidos_camisa
        WHERE inscricao_id = ? AND status_pagamento = 'pago'`,
    )
    .all(inscricaoId) as unknown as PedidoCamisa[];
  return {
    pedidos,
    itens: pedidos.flatMap((p) => itensDoPedido(p.id)),
  };
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let payload: { token?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  // Aceita o token puro ou a URL completa codificada no QR.
  const token = payload.token?.match(/[0-9a-f]{32}/)?.[0];
  if (!token) {
    return NextResponse.json(
      { erro: "QR code não reconhecido" },
      { status: 400 },
    );
  }

  const db = getDb();
  const inscricao = db
    .prepare("SELECT * FROM inscricoes WHERE kit_token = ?")
    .get(token) as unknown as Inscricao | undefined;

  if (inscricao) {
    if (inscricao.status_pagamento !== "pago") {
      return NextResponse.json(
        {
          erro: `Pagamento não confirmado (status: ${inscricao.status_pagamento})`,
          tipo: "inscricao",
          inscricao: resumo(inscricao),
        },
        { status: 409 },
      );
    }

    const camisas = camisasDaInscricao(inscricao.id);

    if (inscricao.kit_retirado_em) {
      return NextResponse.json({
        tipo: "inscricao",
        jaRetirado: true,
        inscricao: resumo(inscricao),
        camisasExtras: camisas.itens,
        camisasResumo: resumirItens(camisas.itens),
      });
    }

    db.prepare(
      `UPDATE inscricoes SET kit_retirado_em = datetime('now', 'localtime')
       WHERE id = ?`,
    ).run(inscricao.id);

    // Uma leitura entrega tudo: o kit e as camisas vinculadas saem juntos,
    // então marcar só o kit deixaria a camisa "pendente" para sempre.
    const marcar = db.prepare(
      `UPDATE pedidos_camisa SET retirado_em = datetime('now', 'localtime')
        WHERE id = ? AND retirado_em IS NULL`,
    );
    for (const pedido of camisas.pedidos) {
      marcar.run(pedido.id);
    }

    const atualizada = db
      .prepare("SELECT * FROM inscricoes WHERE id = ?")
      .get(inscricao.id) as unknown as Inscricao;

    return NextResponse.json({
      tipo: "inscricao",
      jaRetirado: false,
      inscricao: resumo(atualizada),
      camisasExtras: camisas.itens,
      camisasResumo: resumirItens(camisas.itens),
    });
  }

  // Não é kit de atleta: pode ser o QR de quem comprou camisa sem se
  // inscrever, lido pelo mesmo leitor.
  const pedido = db
    .prepare("SELECT * FROM pedidos_camisa WHERE token = ?")
    .get(token) as unknown as PedidoCamisa | undefined;

  if (!pedido) {
    return NextResponse.json(
      { erro: "Inscrição não encontrada para este QR code" },
      { status: 404 },
    );
  }

  const itens = itensDoPedido(pedido.id);

  if (pedido.status_pagamento !== "pago") {
    return NextResponse.json(
      {
        erro: `Pagamento não confirmado (status: ${pedido.status_pagamento})`,
        tipo: "camisa",
        pedido: resumoPedido(pedido, itens),
      },
      { status: 409 },
    );
  }

  if (pedido.retirado_em) {
    return NextResponse.json({
      tipo: "camisa",
      jaRetirado: true,
      pedido: resumoPedido(pedido, itens),
    });
  }

  db.prepare(
    `UPDATE pedidos_camisa SET retirado_em = datetime('now', 'localtime')
     WHERE id = ?`,
  ).run(pedido.id);

  const atualizado = db
    .prepare("SELECT * FROM pedidos_camisa WHERE id = ?")
    .get(pedido.id) as unknown as PedidoCamisa;

  return NextResponse.json({
    tipo: "camisa",
    jaRetirado: false,
    pedido: resumoPedido(atualizado, itens),
  });
}
