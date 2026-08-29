import { getDb } from "./db";
import type { Cupom } from "./types";

// Mercado Pago recusa preferências abaixo deste valor, então o desconto
// nunca zera a cobrança — é limitado ao que sobra acima do mínimo.
export const VALOR_MINIMO = 1;

export const CODIGO_REGEX = /^[A-Z0-9-]{3,20}$/;

export const normalizarCodigo = (codigo: string) =>
  codigo.trim().toUpperCase().replace(/\s+/g, "");

const dataDeHoje = () => new Date().toLocaleDateString("en-CA");

export const arredondar = (valor: number) => Math.round(valor * 100) / 100;

export type CupomAplicado = {
  codigo: string;
  desconto: number;
  valorFinal: number;
};

export const buscarCupom = (codigo: string): Cupom | undefined =>
  getDb()
    .prepare("SELECT * FROM cupons WHERE codigo = ?")
    .get(normalizarCodigo(codigo)) as unknown as Cupom | undefined;

export const aplicarCupom = (
  codigoBruto: string,
  valor: number,
): CupomAplicado | { erro: string } => {
  const codigo = normalizarCodigo(codigoBruto);
  if (!codigo) {
    return { erro: "Informe um cupom" };
  }

  const cupom = buscarCupom(codigo);
  if (!cupom || !cupom.ativo) {
    return { erro: "Cupom inválido" };
  }

  if (cupom.validade && cupom.validade < dataDeHoje()) {
    return { erro: "Cupom expirado" };
  }

  const desconto = arredondar(
    Math.min(cupom.desconto, Math.max(valor - VALOR_MINIMO, 0)),
  );
  if (desconto <= 0) {
    return { erro: "Cupom não aplicável a este valor" };
  }

  return {
    codigo: cupom.codigo,
    desconto,
    valorFinal: arredondar(valor - desconto),
  };
};
