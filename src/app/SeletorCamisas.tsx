"use client";

import { MAX_CAMISAS_POR_PEDIDO, TAMANHOS_CAMISA_EXTRA } from "@/lib/config";

export type Selecao = Record<string, number>;

export const totalSelecionado = (selecao: Selecao) =>
  Object.values(selecao).reduce((soma, n) => soma + n, 0);

export const paraItens = (selecao: Selecao) =>
  TAMANHOS_CAMISA_EXTRA.filter((tamanho) => (selecao[tamanho] ?? 0) > 0).map(
    (tamanho) => ({ tamanho, quantidade: selecao[tamanho] }),
  );

/** "2 × M, 1 × G" — mesma ordem da grade. */
export const resumoSelecao = (selecao: Selecao) =>
  paraItens(selecao)
    .map((item) => `${item.quantidade} × ${item.tamanho}`)
    .join(", ");

type SeletorCamisasProps = {
  disponivel: Record<string, number>;
  selecao: Selecao;
  aoMudar: (selecao: Selecao) => void;
};

export default function SeletorCamisas({
  disponivel,
  selecao,
  aoMudar,
}: SeletorCamisasProps) {
  const total = totalSelecionado(selecao);
  const noLimite = total >= MAX_CAMISAS_POR_PEDIDO;
  const restam = MAX_CAMISAS_POR_PEDIDO - total;

  const trocar = (tamanho: string, delta: number) =>
    aoMudar({ ...selecao, [tamanho]: (selecao[tamanho] ?? 0) + delta });

  return (
    <div className="seletor-camisas">
      <div className="seletor-cabecalho">
        <span className="seletor-rotulo">Escolha os tamanhos</span>
        <span
          className={`seletor-contador ${
            noLimite ? "no-limite" : total > 0 ? "com-selecao" : ""
          }`}
        >
          {total} de {MAX_CAMISAS_POR_PEDIDO}
        </span>
      </div>

      <div className="seletor-linhas">
        {TAMANHOS_CAMISA_EXTRA.map((tamanho) => {
          const emEstoque = disponivel[tamanho] ?? 0;
          const quantidade = selecao[tamanho] ?? 0;
          const esgotado = emEstoque === 0;
          // Duas razoes diferentes para o + travar, e a pessoa precisa
          // saber qual e: o limite do carrinho tem saida (tirar de outro
          // tamanho), o estoque nao tem.
          const travadoPorEstoque = !esgotado && quantidade >= emEstoque;
          const podeSomar = !esgotado && !travadoPorEstoque && !noLimite;

          return (
            <div
              className={`seletor-linha ${esgotado ? "esgotada" : ""} ${
                quantidade > 0 ? "escolhida" : ""
              } ${travadoPorEstoque ? "com-nota" : ""}`}
              key={tamanho}
            >
              <div className="seletor-linha-topo">
                <div className="seletor-tamanho-bloco">
                  <span className="seletor-tamanho">{tamanho}</span>
                  {esgotado && (
                    <span className="seletor-esgotado">Esgotado</span>
                  )}
                </div>
                <div className="seletor-controles">
                  <button
                    type="button"
                    className="seletor-botao"
                    disabled={quantidade === 0}
                    onClick={() => trocar(tamanho, -1)}
                    aria-label={`Tirar uma camisa ${tamanho}`}
                  >
                    −
                  </button>
                  <span
                    className="seletor-numero"
                    aria-live="polite"
                    aria-label={`${quantidade} camisas tamanho ${tamanho}`}
                  >
                    {quantidade}
                  </span>
                  <button
                    type="button"
                    className="seletor-botao"
                    disabled={!podeSomar}
                    onClick={() => trocar(tamanho, 1)}
                    aria-label={`Adicionar uma camisa ${tamanho}`}
                  >
                    +
                  </button>
                </div>
              </div>
              {travadoPorEstoque && (
                <div className="seletor-nota-linha">
                  {emEstoque === 1
                    ? "Só resta 1 deste tamanho."
                    : `Só restam ${emEstoque} deste tamanho.`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {noLimite ? (
        <div className="seletor-nota-limite">
          Você chegou no limite de {MAX_CAMISAS_POR_PEDIDO} camisas. Para
          trocar de tamanho, tire uma de outro.
        </div>
      ) : (
        <div className="seletor-nota">
          {total === 0
            ? `Até ${MAX_CAMISAS_POR_PEDIDO} camisas por compra, misturando tamanhos.`
            : `Ainda cabem ${restam} ${
                restam === 1 ? "camisa" : "camisas"
              } nesta compra.`}
        </div>
      )}
    </div>
  );
}
