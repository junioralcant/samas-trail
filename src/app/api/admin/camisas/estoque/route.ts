import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { TAMANHOS_CAMISA_EXTRA, type TamanhoCamisaExtra } from "@/lib/config";
import { emTransacao, getDb } from "@/lib/db";
import { quadroEstoque } from "@/lib/estoque";

type PatchPayload = { totais?: Record<string, unknown> };

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json({ estoque: quadroEstoque() });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let payload: PatchPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const totais = payload.totais ?? {};
  const novos = new Map<TamanhoCamisaExtra, number>();

  for (const tamanho of TAMANHOS_CAMISA_EXTRA) {
    if (!(tamanho in totais)) {
      continue;
    }
    const total = Number(totais[tamanho]);
    if (!Number.isInteger(total) || total < 0) {
      return NextResponse.json(
        { erro: `Total inválido para o tamanho ${tamanho}` },
        { status: 400 },
      );
    }
    novos.set(tamanho, total);
  }

  if (novos.size === 0) {
    return NextResponse.json({ erro: "Nada para salvar" }, { status: 400 });
  }

  const resultado = emTransacao(() => {
    // O total não pode ficar abaixo do que já saiu ou está reservado, senão
    // o disponível vira negativo e o site passa a vender o que não existe.
    const quadro = quadroEstoque();
    for (const linha of quadro) {
      const novo = novos.get(linha.tamanho);
      if (novo === undefined) {
        continue;
      }
      const comprometido = linha.vendidas + linha.reservadas;
      if (novo < comprometido) {
        return {
          erro: `Você digitou ${novo}, mas ${linha.vendidas} peças ${linha.tamanho} já foram vendidas. O total não pode ficar abaixo de ${comprometido} (vendidas + reservadas).`,
          tamanho: linha.tamanho,
        };
      }
    }

    const gravar = getDb().prepare(
      `INSERT INTO estoque_camisa (tamanho, total) VALUES (?, ?)
       ON CONFLICT (tamanho) DO UPDATE
         SET total = excluded.total,
             atualizado_em = datetime('now', 'localtime')`,
    );
    for (const [tamanho, total] of novos) {
      gravar.run(tamanho, total);
    }
    return null;
  });

  if (resultado) {
    return NextResponse.json(resultado, { status: 409 });
  }

  return NextResponse.json({ estoque: quadroEstoque() });
}
