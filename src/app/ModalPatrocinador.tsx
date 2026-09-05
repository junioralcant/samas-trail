"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROTULO_COTA,
  linkInstagram,
  linkWhatsapp,
  type Patrocinador,
} from "./patrocinadores";

// Fechar e mais rapido que abrir (0,16s contra 0,20s).
const DURACAO_SAIDA = 160;

type ModalPatrocinadorProps = {
  lista: Patrocinador[];
  indice: number;
  aoFechar: () => void;
  aoTrocar: (indice: number) => void;
};

export default function ModalPatrocinador({
  lista,
  indice,
  aoFechar,
  aoTrocar,
}: ModalPatrocinadorProps) {
  const patrocinador = lista[indice];
  const inicioToque = useRef<number | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saindo, setSaindo] = useState(false);

  const fechar = useCallback(() => {
    if (temporizador.current) {
      return;
    }
    setSaindo(true);
    temporizador.current = setTimeout(aoFechar, DURACAO_SAIDA);
  }, [aoFechar]);

  const anterior = useCallback(
    () => aoTrocar((indice - 1 + lista.length) % lista.length),
    [aoTrocar, indice, lista.length],
  );
  const proximo = useCallback(
    () => aoTrocar((indice + 1) % lista.length),
    [aoTrocar, indice, lista.length],
  );

  useEffect(() => {
    const porTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        fechar();
      }
      if (evento.key === "ArrowLeft") {
        anterior();
      }
      if (evento.key === "ArrowRight") {
        proximo();
      }
    };
    document.addEventListener("keydown", porTecla);
    // Trava o scroll do fundo enquanto o modal da marca esta aberto.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", porTecla);
      document.body.style.overflow = overflowAnterior;
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
    };
  }, [anterior, fechar, proximo]);

  if (!patrocinador) {
    return null;
  }

  const rotulo = ROTULO_COTA[patrocinador.cota];
  const temInstagram = Boolean(patrocinador.instagram);
  const temWhatsapp = Boolean(patrocinador.whatsapp);

  return (
    <div
      className={saindo ? "marca-overlay marca-saindo" : "marca-overlay"}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) {
          fechar();
        }
      }}
      onTouchStart={(evento) => {
        inicioToque.current = evento.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(evento) => {
        const inicio = inicioToque.current;
        const fim = evento.changedTouches[0]?.clientX;
        inicioToque.current = null;
        if (inicio === null || fim === undefined || lista.length < 2) {
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
        className="marca-card"
        role="dialog"
        aria-modal="true"
        aria-label={patrocinador.nome}
      >
        <button
          className="marca-fechar"
          type="button"
          onClick={fechar}
          aria-label="Fechar"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 5l14 14M19 5 5 19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="marca-palco">
          <div
            className={
              patrocinador.placa === "clara"
                ? "marca-placa marca-placa-clara"
                : "marca-placa marca-placa-escura"
            }
          >
            {patrocinador.logo ? (
              <img
                className="marca-logo"
                src={patrocinador.logo}
                alt={`Logo ${patrocinador.nome}`}
              />
            ) : (
              <div className="marca-logotipo display">
                {patrocinador.nomeCurto}
              </div>
            )}
          </div>
        </div>

        <div className="marca-conteudo" key={patrocinador.id}>
          <span className={`pill-cota cota-${patrocinador.cota}`}>
            {rotulo}
          </span>
          <div className="marca-nome display">{patrocinador.nome}</div>
          <div className="marca-descricao">{patrocinador.descricao}</div>

          {temInstagram && (
            <a
              className="marca-botao"
              href={linkInstagram(patrocinador.instagram as string)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3.2"
                  y="3.2"
                  width="17.6"
                  height="17.6"
                  rx="5.2"
                  stroke="currentColor"
                  strokeWidth="1.9"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="4.1"
                  stroke="currentColor"
                  strokeWidth="1.9"
                />
                <circle cx="17.2" cy="6.8" r="1.3" fill="currentColor" />
              </svg>
              <span className="marca-botao-texto display">
                Ver no Instagram
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 16 16 8M9.5 8H16v6.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          )}

          {!temInstagram && temWhatsapp && (
            <a
              className="marca-botao marca-botao-alternativo"
              href={linkWhatsapp(patrocinador.whatsapp as string)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="marca-botao-texto display">
                Chamar no WhatsApp
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 16 16 8M9.5 8H16v6.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          )}

          {(temInstagram || temWhatsapp) && (
            <div className="marca-saida">
              {temInstagram && (
                <span className="marca-handle">@{patrocinador.instagram}</span>
              )}
              <span className="marca-saida-nota">
                {temInstagram ? "· abre em nova aba" : "· contato direto"}
              </span>
            </div>
          )}

          {(patrocinador.endereco || (temInstagram && temWhatsapp)) && (
            <div className="marca-secundarios">
              {temInstagram && temWhatsapp && (
                <a
                  className="marca-secundario"
                  href={linkWhatsapp(patrocinador.whatsapp as string)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              )}
              {patrocinador.endereco && (
                <a
                  className="marca-secundario"
                  href={patrocinador.endereco}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Como chegar
                </a>
              )}
            </div>
          )}

          {lista.length > 1 && (
            <div className="marca-navegacao">
              <button
                className="marca-seta"
                type="button"
                onClick={anterior}
                aria-label="Marca anterior"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M14.5 5 8 12l6.5 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="marca-contador">
                {indice + 1} de {lista.length} · {rotulo}
              </span>
              <button
                className="marca-seta"
                type="button"
                onClick={proximo}
                aria-label="Próxima marca"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9.5 5 16 12l-6.5 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
