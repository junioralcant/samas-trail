import {
  MAX_CAMISAS_POR_PEDIDO,
  TAMANHOS_CAMISA_EXTRA,
  type TamanhoCamisaExtra,
} from "./config";
import { getReservaMinutos } from "./configuracoes";
import { getDb } from "./db";

export type ItemCamisa = { tamanho: TamanhoCamisaExtra; quantidade: number };

export type LinhaEstoque = {
  tamanho: TamanhoCamisaExtra;
  total: number;
  vendidas: number;
  reservadas: number;
  disponivel: number;
};

// Peca paga esta vendida para sempre; pendente so segura o estoque
// enquanto a reserva nao vence. Vencida, volta a valer sem faxina nenhuma.
const CONDICAO_PAGA = "p.status_pagamento = 'pago'";
const CONDICAO_RESERVADA = `p.status_pagamento = 'pendente'
   AND p.reservado_ate > datetime('now', 'localtime')`;

const somaPorTamanho = (condicao: string) => `
  COALESCE((
    SELECT SUM(i.quantidade) FROM itens_camisa i
      JOIN pedidos_camisa p ON p.id = i.pedido_id
     WHERE i.tamanho = e.tamanho AND (${condicao})
  ), 0)`;

const ordem = (tamanho: string) =>
  TAMANHOS_CAMISA_EXTRA.indexOf(tamanho as TamanhoCamisaExtra);

/**
 * Total, vendidas, reservadas e disponiveis de cada tamanho.
 *
 * `excluirPedidoId` tira um pedido da conta. Serve para perguntar "cabe
 * este pedido?" sem que a reserva dele proprio conte contra ele — do
 * contrario todo pedido que leva a ultima peca de um tamanho pareceria
 * nao caber.
 */
export const quadroEstoque = (excluirPedidoId?: number): LinhaEstoque[] => {
  const semOPedido = excluirPedidoId === undefined ? "" : " AND p.id != ?";
  const params =
    excluirPedidoId === undefined
      ? []
      : [excluirPedidoId, excluirPedidoId];

  const linhas = getDb()
    .prepare(
      `SELECT e.tamanho, e.total,
         ${somaPorTamanho(CONDICAO_PAGA + semOPedido)} AS vendidas,
         ${somaPorTamanho(CONDICAO_RESERVADA + semOPedido)} AS reservadas
       FROM estoque_camisa e`,
    )
    .all(...params) as unknown as Omit<LinhaEstoque, "disponivel">[];

  return linhas
    .map((linha) => ({
      ...linha,
      // Pode ficar negativo quando um pagamento entra fora da reserva; o
      // painel precisa ver o buraco, entao nao e zerado aqui.
      disponivel: linha.total - linha.vendidas - linha.reservadas,
    }))
    .sort((a, b) => ordem(a.tamanho) - ordem(b.tamanho));
};

/**
 * Quanto ainda da para vender de cada tamanho (nunca negativo). Sempre traz
 * a grade inteira, mesmo tamanho sem linha de estoque, para quem consome
 * nao ter de tratar ausencia.
 */
export const disponibilidade = (
  excluirPedidoId?: number,
): Record<string, number> => {
  const mapa: Record<string, number> = {};
  for (const tamanho of TAMANHOS_CAMISA_EXTRA) {
    mapa[tamanho] = 0;
  }
  for (const linha of quadroEstoque(excluirPedidoId)) {
    mapa[linha.tamanho] = Math.max(0, linha.disponivel);
  }
  return mapa;
};

/** Teto de um tamanho no formulario: o estoque, limitado pelo teto do pedido. */
export const limitePorTamanho = (
  disponivel: Record<string, number>,
): Record<string, number> => {
  const mapa: Record<string, number> = {};
  for (const tamanho of TAMANHOS_CAMISA_EXTRA) {
    mapa[tamanho] = Math.min(
      MAX_CAMISAS_POR_PEDIDO,
      disponivel[tamanho] ?? 0,
    );
  }
  return mapa;
};

export type FaltaEstoque = {
  tamanho: TamanhoCamisaExtra;
  pedido: number;
  disponivel: number;
};

/**
 * Confere os itens contra o estoque. Chamar dentro de `emTransacao` — a
 * leitura so vale se o lock de escrita ja estiver na mao.
 */
export const verificarDisponibilidade = (
  itens: ItemCamisa[],
): FaltaEstoque[] => {
  const disponivel = disponibilidade();
  return itens
    .map((item) => ({
      tamanho: item.tamanho,
      pedido: item.quantidade,
      disponivel: disponivel[item.tamanho],
    }))
    .filter((linha) => linha.pedido > linha.disponivel);
};

export const gravarItens = (pedidoId: number, itens: ItemCamisa[]): void => {
  const inserir = getDb().prepare(
    "INSERT INTO itens_camisa (pedido_id, tamanho, quantidade) VALUES (?, ?, ?)",
  );
  for (const item of itens) {
    inserir.run(pedidoId, item.tamanho, item.quantidade);
  }
};

/** Sempre na ordem da grade: o SQLite devolveria na ordem do indice. */
export const itensDoPedido = (pedidoId: number): ItemCamisa[] =>
  (
    getDb()
      .prepare(
        "SELECT tamanho, quantidade FROM itens_camisa WHERE pedido_id = ?",
      )
      .all(pedidoId) as unknown as ItemCamisa[]
  ).sort((a, b) => ordem(a.tamanho) - ordem(b.tamanho));

/** "2× M, 1× G" — usado no e-mail, no admin e no CSV. */
export const resumirItens = (itens: ItemCamisa[]): string =>
  [...itens]
    .sort((a, b) => ordem(a.tamanho) - ordem(b.tamanho))
    .map((item) => `${item.quantidade}× ${item.tamanho}`)
    .join(", ");

export const calcularReservadoAte = (): string => {
  const linha = getDb()
    .prepare(
      `SELECT datetime('now', 'localtime', '+' || ? || ' minutes') AS ate`,
    )
    .get(getReservaMinutos()) as unknown as { ate: string };
  return linha.ate;
};
