"use client";

import { useState } from "react";
import type { PrecoCamisa } from "@/lib/configuracoes";
import { CAMISA_EXTRA } from "./camisaExtra";
import VisualizadorKit from "./VisualizadorKit";

export const formatarPreco = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SeloProps = {
  preco: PrecoCamisa;
  tamanho?: "grande" | "medio";
};

/**
 * Sem promocao o selo vermelho vira placa neutra do mesmo tamanho e o
 * riscado some — nunca "de R$ 45 por R$ 45", nunca um buraco no layout.
 */
export function SeloPromocao({ preco, tamanho = "grande" }: SeloProps) {
  if (!preco.emPromocao) {
    return (
      <div className={`selo-preco selo-preco-${tamanho} sem-promocao`}>
        <span className="selo-preco-valor">
          {formatarPreco(preco.precoCheio)}
        </span>
      </div>
    );
  }
  return (
    <div className={`selo-preco selo-preco-${tamanho}`}>
      <span className="selo-preco-de">
        De {formatarPreco(preco.precoCheio)} por
      </span>
      <span className="selo-preco-valor">
        {formatarPreco(preco.precoAtual)}
      </span>
    </div>
  );
}

/** As duas faces lado a lado, abrindo o visualizador do kit na face tocada. */
export function GaleriaCamisa() {
  const [aberto, setAberto] = useState<number | null>(null);

  return (
    <>
      <div className="camisa-faces">
        {CAMISA_EXTRA.map((face, indice) => (
          <button
            className="camisa-face"
            key={face.id}
            type="button"
            onClick={() => setAberto(indice)}
            aria-label={`Ampliar ${face.nome.toLowerCase()} da camisa extra`}
          >
            <span className="camisa-face-foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={face.imagem} alt={face.alt} />
            </span>
            <span className="camisa-face-nome">{face.nome}</span>
            <span className="camisa-face-descricao">{face.descricao}</span>
          </button>
        ))}
      </div>
      <div className="camisa-faces-dica">Toque em uma face para ampliar.</div>

      {aberto !== null && (
        <VisualizadorKit
          itens={CAMISA_EXTRA}
          indice={aberto}
          aoFechar={() => setAberto(null)}
          aoTrocar={setAberto}
        />
      )}
    </>
  );
}
