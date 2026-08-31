"use client";

import { useEffect, useRef } from "react";
import type { ItemKit } from "./itensKit";

type VisualizadorKitProps = {
  itens: ItemKit[];
  indice: number;
  aoFechar: () => void;
  aoTrocar: (indice: number) => void;
};

export default function VisualizadorKit({
  itens,
  indice,
  aoFechar,
  aoTrocar,
}: VisualizadorKitProps) {
  const item = itens[indice];
  const inicioToque = useRef<number | null>(null);

  const anterior = () => aoTrocar((indice - 1 + itens.length) % itens.length);
  const proximo = () => aoTrocar((indice + 1) % itens.length);

  useEffect(() => {
    const porTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        aoFechar();
      }
      if (evento.key === "ArrowLeft") {
        aoTrocar((indice - 1 + itens.length) % itens.length);
      }
      if (evento.key === "ArrowRight") {
        aoTrocar((indice + 1) % itens.length);
      }
    };
    document.addEventListener("keydown", porTecla);
    // Trava o scroll do fundo enquanto a imagem esta aberta.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", porTecla);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aoFechar, aoTrocar, indice, itens.length]);

  if (!item) {
    return null;
  }

  return (
    <div
      className="visualizador-overlay"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) {
          aoFechar();
        }
      }}
      onTouchStart={(evento) => {
        inicioToque.current = evento.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(evento) => {
        const inicio = inicioToque.current;
        const fim = evento.changedTouches[0]?.clientX;
        inicioToque.current = null;
        if (inicio === null || fim === undefined) {
          return;
        }
        const distancia = fim - inicio;
        if (Math.abs(distancia) < 50) {
          return;
        }
        if (distancia > 0) {
          anterior();
        } else {
          proximo();
        }
      }}
    >
      <div
        className="visualizador-card"
        role="dialog"
        aria-modal="true"
        aria-label={item.nome}
      >
        <div className="visualizador-palco">
          <img
            className="visualizador-imagem"
            src={item.imagem}
            alt={item.alt}
          />
          <button
            className="visualizador-fechar"
            type="button"
            onClick={aoFechar}
            aria-label="Fechar imagem"
          >
            ✕
          </button>
        </div>

        <div className="visualizador-legenda">
          <div className="visualizador-nome display">{item.nome}</div>
          <div className="visualizador-descricao">{item.descricao}</div>

          {itens.length > 1 && (
            <div className="visualizador-navegacao">
              <button
                className="visualizador-seta"
                type="button"
                onClick={anterior}
                aria-label="Item anterior do kit"
              >
                ‹
              </button>
              <div className="visualizador-pontos">
                {itens.map((outro, posicao) => (
                  <button
                    key={outro.id}
                    className={
                      posicao === indice
                        ? "visualizador-ponto visualizador-ponto-ativo"
                        : "visualizador-ponto"
                    }
                    type="button"
                    onClick={() => aoTrocar(posicao)}
                    aria-label={`Ver ${outro.nome}`}
                    aria-current={posicao === indice}
                  />
                ))}
              </div>
              <button
                className="visualizador-seta"
                type="button"
                onClick={proximo}
                aria-label="Próximo item do kit"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
