import { getDb } from "./db";
import { itensDoPedido, resumirItens, type ItemCamisa } from "./estoque";
import type { Distancia } from "./config";
import type { PedidoCamisa, StatusPagamento } from "./types";

export type PedidoAdmin = {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  origem: string;
  quantidade: number;
  valor: number;
  status_pagamento: StatusPagamento;
  estoque_estourado: number;
  retirado_em: string | null;
  reservado_ate: string | null;
  token: string | null;
  criado_em: string;
  itens: ItemCamisa[];
  resumo: string;
  /** Preenchido quando o CPF bateu com uma inscrição: sai junto do kit. */
  inscricao: { id: number; nome: string; distancia: Distancia } | null;
};

/**
 * Camisas de cada inscricao, agregadas numa consulta so — a listagem do
 * painel nao pode fazer uma query por atleta.
 */
export const camisasPorInscricao = (): Record<number, ItemCamisa[]> => {
  const linhas = getDb()
    .prepare(
      `SELECT p.inscricao_id AS inscricaoId, i.tamanho,
              SUM(i.quantidade) AS quantidade
         FROM pedidos_camisa p
         JOIN itens_camisa i ON i.pedido_id = p.id
        WHERE p.inscricao_id IS NOT NULL
          AND p.status_pagamento != 'cancelado'
        GROUP BY p.inscricao_id, i.tamanho`,
    )
    .all() as unknown as {
    inscricaoId: number;
    tamanho: string;
    quantidade: number;
  }[];

  const mapa: Record<number, ItemCamisa[]> = {};
  for (const linha of linhas) {
    const lista = mapa[linha.inscricaoId] ?? [];
    lista.push({
      tamanho: linha.tamanho as ItemCamisa["tamanho"],
      quantidade: linha.quantidade,
    });
    mapa[linha.inscricaoId] = lista;
  }
  return mapa;
};

export const listarPedidosCamisa = (): PedidoAdmin[] => {
  const db = getDb();
  const pedidos = db
    .prepare("SELECT * FROM pedidos_camisa ORDER BY criado_em DESC, id DESC")
    .all() as unknown as PedidoCamisa[];

  return pedidos.map((pedido) => {
    const itens = itensDoPedido(pedido.id);
    // Com a FK ligada, inscricao_id ou e nulo ou aponta para linha viva:
    // excluir a inscricao no painel solta o vinculo em vez de deixar orfao.
    const inscricao =
      pedido.inscricao_id === null
        ? null
        : (db
            .prepare("SELECT id, nome, distancia FROM inscricoes WHERE id = ?")
            .get(pedido.inscricao_id) as unknown as {
            id: number;
            nome: string;
            distancia: Distancia;
          });

    return {
      id: pedido.id,
      nome: pedido.nome,
      cpf: pedido.cpf,
      email: pedido.email,
      telefone: pedido.telefone,
      origem: pedido.origem,
      quantidade: pedido.quantidade,
      valor: pedido.valor,
      status_pagamento: pedido.status_pagamento,
      estoque_estourado: pedido.estoque_estourado,
      retirado_em: pedido.retirado_em,
      reservado_ate: pedido.reservado_ate,
      token: pedido.token,
      criado_em: pedido.criado_em,
      itens,
      resumo: resumirItens(itens),
      inscricao,
    };
  });
};

export type StatsCamisas = {
  pagas: number;
  receita: number;
  pecas: number;
  pedidos: number;
  entregues: number;
  semPeca: number;
};

export const statsCamisas = (): StatsCamisas =>
  getDb()
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status_pagamento = 'pago' THEN quantidade ELSE 0 END), 0) AS pagas,
         COALESCE(SUM(CASE WHEN status_pagamento = 'pago' THEN valor ELSE 0 END), 0) AS receita,
         (SELECT COALESCE(SUM(total), 0) FROM estoque_camisa) AS pecas,
         COUNT(*) AS pedidos,
         COALESCE(SUM(CASE WHEN retirado_em IS NOT NULL THEN 1 ELSE 0 END), 0) AS entregues,
         COALESCE(SUM(CASE WHEN estoque_estourado = 1 THEN 1 ELSE 0 END), 0) AS semPeca
       FROM pedidos_camisa`,
    )
    .get() as unknown as StatsCamisas;
