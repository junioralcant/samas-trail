"use client";

import { useEffect } from "react";
import {
  montarAbertura,
  TERMO_CLAUSULAS,
  TERMO_TITULO,
  TERMO_VERSAO,
} from "@/lib/termo";

type ModalTermoProps = {
  nome: string;
  documento: string;
  aoFechar: () => void;
  aoAceitar: () => void;
};

export default function ModalTermo({
  nome,
  documento,
  aoFechar,
  aoAceitar,
}: ModalTermoProps) {
  useEffect(() => {
    const porEsc = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        aoFechar();
      }
    };
    document.addEventListener("keydown", porEsc);
    // Trava o scroll do fundo enquanto o termo esta aberto.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", porEsc);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aoFechar]);

  return (
    <div
      className="termo-overlay"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) {
          aoFechar();
        }
      }}
    >
      <div
        className="termo-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="termo-titulo"
      >
        <div className="termo-cabecalho">
          <div>
            <div className="termo-titulo display" id="termo-titulo">
              {TERMO_TITULO}
            </div>
            <div className="termo-versao">versão {TERMO_VERSAO}</div>
          </div>
          <button className="botao-contorno" type="button" onClick={aoFechar}>
            Fechar
          </button>
        </div>

        <div className="termo-corpo">
          <p className="termo-abertura">{montarAbertura(nome, documento)}</p>
          <ol className="termo-clausulas">
            {TERMO_CLAUSULAS.map((clausula) => (
              <li key={clausula.letra}>
                <span className="termo-letra">{clausula.letra})</span>{" "}
                {clausula.texto}
              </li>
            ))}
          </ol>
        </div>

        <div className="termo-rodape">
          <button className="botao-cta" type="button" onClick={aoAceitar}>
            Li e aceito o termo
          </button>
        </div>
      </div>
    </div>
  );
}
