import { NextResponse } from "next/server";
import { listarPedidosCamisa, statsCamisas } from "@/lib/adminCamisas";
import { isAdminAuthenticated } from "@/lib/auth";
import { getPrecoCamisa } from "@/lib/configuracoes";
import { quadroEstoque } from "@/lib/estoque";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  return NextResponse.json({
    pedidos: listarPedidosCamisa(),
    estoque: quadroEstoque(),
    preco: getPrecoCamisa(),
    stats: statsCamisas(),
  });
}
