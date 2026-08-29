import { NextResponse } from "next/server";
import { DISTANCIAS, getPreco } from "@/lib/config";
import { aplicarCupom } from "@/lib/cupom";
import type { Distancia } from "@/lib/config";

export async function POST(request: Request) {
  let payload: { codigo?: string; distancia?: Distancia };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  if (!payload.distancia || !DISTANCIAS.includes(payload.distancia)) {
    return NextResponse.json({ erro: "Distância inválida" }, { status: 400 });
  }

  const valor = getPreco(payload.distancia);
  const resultado = aplicarCupom(payload.codigo ?? "", valor);

  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: 404 });
  }

  return NextResponse.json({ ...resultado, valor });
}
