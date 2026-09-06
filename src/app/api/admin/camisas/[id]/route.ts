import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { registrarStatusPagamentoCamisa } from "@/lib/pagamento";
import type { PedidoCamisa, StatusPagamento } from "@/lib/types";

const STATUS_VALIDOS: StatusPagamento[] = ["pendente", "pago", "cancelado"];

type PatchPayload = {
  statusPagamento?: StatusPagamento;
  retirado?: boolean;
  estoqueResolvido?: boolean;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  let payload: PatchPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const db = getDb();
  const pedido = db
    .prepare("SELECT * FROM pedidos_camisa WHERE id = ?")
    .get(Number(id)) as unknown as PedidoCamisa | undefined;

  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  }

  if (payload.statusPagamento !== undefined) {
    if (!STATUS_VALIDOS.includes(payload.statusPagamento)) {
      return NextResponse.json({ erro: "Status inválido" }, { status: 400 });
    }
    // Mesmo caminho do webhook: a confirmacao manual tambem dispara o
    // e-mail (e a guarda de e-mail unico).
    await registrarStatusPagamentoCamisa(
      pedido.id,
      payload.statusPagamento,
      null,
    );
  }

  if (payload.retirado !== undefined) {
    db.prepare(
      `UPDATE pedidos_camisa SET retirado_em =
         CASE WHEN ? THEN datetime('now', 'localtime') ELSE NULL END
       WHERE id = ?`,
    ).run(payload.retirado ? 1 : 0, pedido.id);
  }

  // Estouro de estoque resolvido por contato (troca de tamanho ou estorno):
  // some com o alerta sem mexer no pagamento.
  if (payload.estoqueResolvido !== undefined) {
    db.prepare(
      "UPDATE pedidos_camisa SET estoque_estourado = ? WHERE id = ?",
    ).run(payload.estoqueResolvido ? 0 : 1, pedido.id);
  }

  const atualizado = db
    .prepare("SELECT * FROM pedidos_camisa WHERE id = ?")
    .get(pedido.id);

  return NextResponse.json({ pedido: atualizado });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const resultado = getDb()
    .prepare("DELETE FROM pedidos_camisa WHERE id = ?")
    .run(Number(id));

  if (resultado.changes === 0) {
    return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
