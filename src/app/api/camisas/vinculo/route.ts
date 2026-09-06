import { NextResponse } from "next/server";
import { limparCpf, validarCpf } from "@/lib/cpf";
import { buscarInscricaoPorCpf } from "@/lib/pedidoCamisa";

/**
 * Primeiro nome e a inicial do sobrenome, nunca o nome inteiro: a rota e
 * publica e devolver CPF -> nome completo seria enumeracao facil demais.
 */
const abreviar = (nome: string): string => {
  const partes = nome.trim().split(/\s+/);
  const primeiro = partes[0];
  return partes.length > 1 ? `${primeiro} ${partes[1][0]}.` : primeiro;
};

export async function GET(request: Request) {
  const cpf = limparCpf(
    new URL(request.url).searchParams.get("cpf") ?? "",
  );
  if (!validarCpf(cpf)) {
    return NextResponse.json({ erro: "CPF inválido" }, { status: 400 });
  }

  const inscricao = buscarInscricaoPorCpf(cpf);
  if (!inscricao) {
    return NextResponse.json({ vinculada: false });
  }

  return NextResponse.json({
    vinculada: true,
    inscricaoId: inscricao.id,
    primeiroNome: abreviar(inscricao.nome),
    distancia: inscricao.distancia,
    paga: inscricao.status_pagamento === "pago",
  });
}
