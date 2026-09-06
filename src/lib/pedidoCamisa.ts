import {
  MAX_CAMISAS_POR_PEDIDO,
  TAMANHOS_CAMISA_EXTRA,
  getEventName,
  type TamanhoCamisaExtra,
} from "./config";
import type { PrecoCamisa } from "./configuracoes";
import { arredondar } from "./cupom";
import { gerarKitToken, getDb } from "./db";
import {
  calcularReservadoAte,
  gravarItens,
  type FaltaEstoque,
  type ItemCamisa,
} from "./estoque";
import type { Inscricao, OrigemPedidoCamisa } from "./types";

const ehTamanho = (valor: unknown): valor is TamanhoCamisaExtra =>
  TAMANHOS_CAMISA_EXTRA.includes(valor as TamanhoCamisaExtra);

export type ItensValidados =
  | { itens: ItemCamisa[]; quantidade: number }
  | { erro: string };

/**
 * Normaliza o que veio do formulario. Aceita lista vazia — quem decide se
 * zero camisas serve e a rota (na inscricao serve, na compra avulsa nao).
 */
export const validarItens = (bruto: unknown): ItensValidados => {
  if (bruto === undefined || bruto === null) {
    return { itens: [], quantidade: 0 };
  }
  if (!Array.isArray(bruto)) {
    return { erro: "Camisas inválidas" };
  }

  const itens: ItemCamisa[] = [];
  const vistos = new Set<string>();

  for (const linha of bruto) {
    const tamanho = (linha as { tamanho?: unknown })?.tamanho;
    const quantidade = Number((linha as { quantidade?: unknown })?.quantidade);

    if (!ehTamanho(tamanho)) {
      return { erro: "Tamanho de camisa inválido" };
    }
    if (vistos.has(tamanho)) {
      return { erro: "Tamanho repetido na lista de camisas" };
    }
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      return { erro: "Quantidade de camisas inválida" };
    }
    vistos.add(tamanho);
    // Stepper zerado chega como 0: nao e erro, so nao entra no pedido.
    if (quantidade > 0) {
      itens.push({ tamanho, quantidade });
    }
  }

  const quantidade = itens.reduce((soma, item) => soma + item.quantidade, 0);
  if (quantidade > MAX_CAMISAS_POR_PEDIDO) {
    return {
      erro: `No máximo ${MAX_CAMISAS_POR_PEDIDO} camisas por compra`,
    };
  }

  return { itens, quantidade };
};

/** Inscricao viva daquele CPF, preferindo a paga e a mais recente. */
export const buscarInscricaoPorCpf = (cpf: string): Inscricao | undefined =>
  getDb()
    .prepare(
      `SELECT * FROM inscricoes
        WHERE cpf = ? AND status_pagamento != 'cancelado'
        ORDER BY (status_pagamento = 'pago') DESC, id DESC
        LIMIT 1`,
    )
    .get(cpf) as unknown as Inscricao | undefined;

export type DadosPedidoCamisa = {
  inscricaoId: number | null;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  origem: OrigemPedidoCamisa;
  itens: ItemCamisa[];
  preco: PrecoCamisa;
};

export type ResultadoPedido = { pedidoId: number; token: string };

/**
 * Grava o pedido e reserva as pecas. Precisa rodar dentro de `emTransacao`,
 * depois de `verificarDisponibilidade` na mesma transacao: quem chama e
 * quem decide o que fazer com a falta, e a conferencia so vale com o lock
 * de escrita ja na mao.
 */
export const criarPedidoCamisa = (
  dados: DadosPedidoCamisa,
): ResultadoPedido => {
  const quantidade = dados.itens.reduce(
    (soma, item) => soma + item.quantidade,
    0,
  );
  const token = gerarKitToken();
  const resultado = getDb()
    .prepare(
      `INSERT INTO pedidos_camisa
        (inscricao_id, nome, cpf, email, telefone, origem, quantidade,
         valor_unitario, valor, promocional, token, reservado_ate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      dados.inscricaoId,
      dados.nome,
      dados.cpf,
      dados.email,
      dados.telefone,
      dados.origem,
      quantidade,
      dados.preco.precoAtual,
      arredondar(dados.preco.precoAtual * quantidade),
      dados.preco.emPromocao ? 1 : 0,
      token,
      calcularReservadoAte(),
    );

  const pedidoId = Number(resultado.lastInsertRowid);
  gravarItens(pedidoId, dados.itens);
  return { pedidoId, token };
};

export const apagarPedidoCamisa = (pedidoId: number): void => {
  getDb().prepare("DELETE FROM pedidos_camisa WHERE id = ?").run(pedidoId);
};

/** Um item por tamanho, para o comprovante do Mercado Pago ficar legivel. */
export const itensPreferencia = (itens: ItemCamisa[], preco: number) =>
  itens.map((item) => ({
    id: `camisa-extra-${item.tamanho}`,
    title: `Camisa extra ${getEventName()} — tamanho ${item.tamanho}`,
    quantity: item.quantidade,
    unit_price: preco,
    currency_id: "BRL",
  }));

/** Referencia do pedido no Mercado Pago (a da inscricao segue o id puro). */
export const referenciaCamisa = (pedidoId: number) => `camisa-${pedidoId}`;

/** O que o formulario precisa saber para corrigir a selecao apos um 409. */
export const respostaFalta = (faltas: FaltaEstoque[]) => ({
  erro:
    faltas.length === 1
      ? `Não temos mais ${faltas[0].pedido} camisa(s) tamanho ${faltas[0].tamanho}`
      : "Alguns tamanhos escolhidos não estão mais disponíveis",
  faltas,
});
