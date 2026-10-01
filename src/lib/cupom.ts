import { getDb } from "./db";
import type { Cupom, TipoCupom } from "./types";

// Mercado Pago recusa preferências abaixo deste valor, então o desconto
// nunca zera a cobrança — é limitado ao que sobra acima do mínimo.
export const VALOR_MINIMO = 1;

export const CODIGO_REGEX = /^[A-Z0-9-]{3,20}$/;

export const normalizarCodigo = (codigo: string) =>
  codigo.trim().toUpperCase().replace(/\s+/g, "");

const dataDeHoje = () => new Date().toLocaleDateString("en-CA");

export const arredondar = (valor: number) => Math.round(valor * 100) / 100;

export const TIPOS_CUPOM: TipoCupom[] = ["valor", "percentual"];

export type RegraCupom = {
  tipo: TipoCupom;
  desconto: number;
  validade: string | null;
};

// Mesma regra na criação e na edição: tipo, desconto e validade só fazem
// sentido juntos (30 vale como reais, mas não como porcentagem acima de 100).
export const validarRegra = (dados: {
  tipo?: unknown;
  desconto?: unknown;
  validade?: unknown;
}): RegraCupom | { erro: string } => {
  const tipo = dados.tipo ?? "valor";
  if (!TIPOS_CUPOM.includes(tipo as TipoCupom)) {
    return { erro: "Tipo de desconto inválido" };
  }

  const desconto = arredondar(Number(dados.desconto));
  if (!Number.isFinite(desconto) || desconto <= 0) {
    return { erro: "O desconto deve ser maior que zero" };
  }
  if (tipo === "percentual" && desconto > 100) {
    return { erro: "A porcentagem não pode passar de 100%" };
  }

  const validade =
    typeof dados.validade === "string" ? dados.validade.trim() || null : null;
  if (validade && !/^\d{4}-\d{2}-\d{2}$/.test(validade)) {
    return { erro: "Validade inválida" };
  }

  return { tipo: tipo as TipoCupom, desconto, validade };
};

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

  const descontoCheio =
    cupom.tipo === "percentual"
      ? (valor * cupom.desconto) / 100
      : cupom.desconto;
  const desconto = arredondar(
    Math.min(descontoCheio, Math.max(valor - VALOR_MINIMO, 0)),
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
