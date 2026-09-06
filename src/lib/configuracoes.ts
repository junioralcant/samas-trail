import { arredondar } from "./cupom";
import { getDb } from "./db";

export const CHAVE_CAMISA_PRECO = "camisa_preco";
export const CHAVE_CAMISA_PRECO_PROMO = "camisa_preco_promo";
export const CHAVE_CAMISA_RESERVA_MINUTOS = "camisa_reserva_minutos";

export const RESERVA_MINUTOS_PADRAO = 30;

export const lerConfiguracao = (chave: string): string | null => {
  const linha = getDb()
    .prepare("SELECT valor FROM configuracoes WHERE chave = ?")
    .get(chave) as unknown as { valor: string } | undefined;
  return linha ? linha.valor : null;
};

/**
 * Desligar a promocao grava string vazia, nao apaga a linha: apagar faria
 * o valor do .env voltar a valer e a promocao religar sozinha.
 */
export const gravarConfiguracao = (chave: string, valor: string): void => {
  getDb()
    .prepare(
      `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
       ON CONFLICT (chave) DO UPDATE
         SET valor = excluded.valor,
             atualizado_em = datetime('now', 'localtime')`,
    )
    .run(chave, valor);
};

/** Valor do banco quando existe; senao o do ambiente. */
const comPadrao = (chave: string, doAmbiente: string | undefined, fixo: string) => {
  const gravado = lerConfiguracao(chave);
  return gravado === null ? doAmbiente ?? fixo : gravado;
};

export type PrecoCamisa = {
  precoCheio: number;
  precoPromo: number | null;
  precoAtual: number;
  emPromocao: boolean;
};

export const getPrecoCamisa = (): PrecoCamisa => {
  const precoCheio = arredondar(
    Number(comPadrao(CHAVE_CAMISA_PRECO, process.env.PRECO_CAMISA, "45.00")),
  );
  const bruto = comPadrao(
    CHAVE_CAMISA_PRECO_PROMO,
    process.env.PRECO_CAMISA_PROMO,
    "20.00",
  );
  const candidato = arredondar(Number(bruto));
  // Vazio, invalido ou nao mais barato que o cheio: nao ha promocao.
  const promoValida =
    bruto.trim() !== "" &&
    Number.isFinite(candidato) &&
    candidato > 0 &&
    candidato < precoCheio;
  const precoPromo = promoValida ? candidato : null;

  return {
    precoCheio,
    precoPromo,
    precoAtual: precoPromo ?? precoCheio,
    emPromocao: precoPromo !== null,
  };
};

export const getReservaMinutos = (): number => {
  const bruto = comPadrao(
    CHAVE_CAMISA_RESERVA_MINUTOS,
    process.env.CAMISA_RESERVA_MINUTOS,
    String(RESERVA_MINUTOS_PADRAO),
  );
  const minutos = Number(bruto);
  return Number.isFinite(minutos) && minutos > 0
    ? Math.floor(minutos)
    : RESERVA_MINUTOS_PADRAO;
};
