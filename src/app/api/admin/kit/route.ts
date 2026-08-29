import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Inscricao } from "@/lib/types";

const resumo = (inscricao: Inscricao) => ({
  id: inscricao.id,
  nome: inscricao.nome,
  distancia: inscricao.distancia,
  tamanho_camiseta: inscricao.tamanho_camiseta,
  equipe: inscricao.equipe,
  status_pagamento: inscricao.status_pagamento,
  kit_retirado_em: inscricao.kit_retirado_em,
});

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

  if (!inscricao) {
    return NextResponse.json(
      { erro: "Inscrição não encontrada para este QR code" },
      { status: 404 },
    );
  }

  if (inscricao.status_pagamento !== "pago") {
    return NextResponse.json(
      {
        erro: `Pagamento não confirmado (status: ${inscricao.status_pagamento})`,
        inscricao: resumo(inscricao),
      },
      { status: 409 },
    );
  }

  if (inscricao.kit_retirado_em) {
    return NextResponse.json({
      jaRetirado: true,
      inscricao: resumo(inscricao),
    });
  }

  db.prepare(
    `UPDATE inscricoes SET kit_retirado_em = datetime('now', 'localtime')
     WHERE id = ?`,
  ).run(inscricao.id);

  const atualizada = db
    .prepare("SELECT * FROM inscricoes WHERE id = ?")
    .get(inscricao.id) as unknown as Inscricao;

  return NextResponse.json({ jaRetirado: false, inscricao: resumo(atualizada) });
}
