"use client";

import { useState } from "react";
import ModalPatrocinador from "./ModalPatrocinador";
import {
  PATROCINADORES,
  ROTULO_FAIXA,
  linkWhatsapp,
  patrocinadoresDaCota,
  type CotaPatrocinio,
  type Patrocinador,
} from "./patrocinadores";

const whatsappOrganizacao = process.env.NEXT_PUBLIC_WHATSAPP_PATROCINIO ?? "";
const CONVITE =
  "Olá! Quero saber sobre as cotas de patrocínio da SAMAS TRAIL 2026.";

type MarcaAberta = { cota: CotaPatrocinio; indice: number };

const Lupa = ({ tamanho }: { tamanho: number }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
    <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    <path
      d="M15.5 15.5 20 20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Placa = ({ patrocinador }: { patrocinador: Patrocinador }) => (
  <div
    className={
      patrocinador.placa === "clara"
        ? "patrocinador-placa patrocinador-placa-clara"
        : "patrocinador-placa patrocinador-placa-escura"
    }
  >
    {patrocinador.logo ? (
      <img
        className="patrocinador-logo"
        src={patrocinador.logo}
        alt={`Logo ${patrocinador.nome}`}
        loading="lazy"
      />
    ) : (
      <div className="patrocinador-logotipo display">
        {patrocinador.nomeCurto}
      </div>
    )}
  </div>
);

export default function SecaoPatrocinadores() {
  const [marcaAberta, setMarcaAberta] = useState<MarcaAberta | null>(null);

  const master = patrocinadoresDaCota("master");
  const ouro = patrocinadoresDaCota("ouro");
  const apoio = patrocinadoresDaCota("apoio");
  const institucional = patrocinadoresDaCota("institucional");
  const comerciais = master.length + ouro.length + apoio.length;

  if (comerciais === 0 && institucional.length === 0) {
    return null;
  }

  // Com uma ou duas marcas a secao vira blocos largos: grade de 2 ou 3 colunas
  // com um card so deixa buraco no lugar de vitrine.
  const magro = comerciais <= 2;

  // O slot vago aparece na cota mais baixa que ja tem marca e na Ouro enquanto
  // houver menos de 3 — nunca no Master nem no Apoio institucional.
  const cotaMaisBaixa: CotaPatrocinio | null = apoio.length
    ? "apoio"
    : ouro.length
      ? "ouro"
      : null;
  const temSlot = (cota: CotaPatrocinio) =>
    Boolean(whatsappOrganizacao) &&
    (cota === cotaMaisBaixa ||
      (cota === "ouro" && ouro.length > 0 && ouro.length < 3));

  const abrir = (cota: CotaPatrocinio, indice: number) =>
    setMarcaAberta({ cota, indice });

  const listaAberta = marcaAberta ? patrocinadoresDaCota(marcaAberta.cota) : [];

  const cartao = (
    patrocinador: Patrocinador,
    cota: CotaPatrocinio,
    indice: number,
  ) => (
    <button
      className={`card-patrocinador card-patrocinador-${cota}`}
      key={patrocinador.id}
      type="button"
      onClick={() => abrir(cota, indice)}
      aria-label={`Ver a marca ${patrocinador.nome}`}
    >
      {cota !== "apoio" && (
        <span className="patrocinador-lupa" aria-hidden="true">
          <Lupa tamanho={cota === "master" ? 13 : 11} />
        </span>
      )}
      <Placa patrocinador={patrocinador} />
      <div className="patrocinador-texto">
        <div
          className={
            cota === "master"
              ? "patrocinador-nome display"
              : "patrocinador-nome"
          }
        >
          {cota === "apoio" ? patrocinador.nomeCurto : patrocinador.nome}
        </div>
        {cota === "master" && (
          <div className="patrocinador-descricao">{patrocinador.descricao}</div>
        )}
        {cota !== "apoio" && patrocinador.instagram && (
          <div className="patrocinador-handle">@{patrocinador.instagram}</div>
        )}
      </div>
    </button>
  );

  const slot = (
    <a
      className="slot-marca"
      href={linkWhatsapp(whatsappOrganizacao, CONVITE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a organização sobre patrocínio no WhatsApp"
    >
      <span className="slot-marca-titulo display">Sua marca aqui</span>
      <span className="slot-marca-texto">Fale no WhatsApp →</span>
    </a>
  );

  const rotuloFaixa = (cota: CotaPatrocinio) => (
    <div className="faixa-rotulo">
      <span className={`pill-cota cota-${cota}`}>{ROTULO_FAIXA[cota]}</span>
      <div className="faixa-linha" />
    </div>
  );

  return (
    <>
      <div className="divisor-rasgado" />

      <section
        id="patrocinadores"
        className={
          magro ? "secao-patrocinadores secao-magra" : "secao-patrocinadores"
        }
      >
        <div className="patrocinadores-cabecalho">
          <div className="patrocinadores-cabecalho-texto">
            <div className="patrocinadores-titulo-linha">
              <div className="patrocinadores-barra" />
              <h2 className="titulo-secao display">Patrocinadores</h2>
            </div>
            <div className="patrocinadores-subtitulo">
              {magro
                ? "Os primeiros a acreditar na 2ª edição"
                : "Quem faz a SAMAS TRAIL acontecer"}
            </div>
          </div>
          <svg
            className="patrocinadores-trilha"
            width="360"
            height="26"
            viewBox="0 0 360 26"
            fill="none"
          >
            <path
              d="M3 20C60 4 110 24 168 12s112-12 189 4"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="0.1 12"
            />
          </svg>
        </div>

        {master.length > 0 && (
          <div className="patrocinadores-faixa">
            {rotuloFaixa("master")}
            <div className="grade-master">
              {master.map((patrocinador, indice) =>
                cartao(patrocinador, "master", indice),
              )}
            </div>
          </div>
        )}

        {ouro.length > 0 && (
          <div className="patrocinadores-faixa">
            {rotuloFaixa("ouro")}
            <div className="grade-ouro">
              {ouro.map((patrocinador, indice) =>
                cartao(patrocinador, "ouro", indice),
              )}
              {temSlot("ouro") && slot}
            </div>
          </div>
        )}

        {apoio.length > 0 && (
          <div className="patrocinadores-faixa">
            {rotuloFaixa("apoio")}
            <div className="grade-apoio">
              {apoio.map((patrocinador, indice) =>
                cartao(patrocinador, "apoio", indice),
              )}
              {temSlot("apoio") && slot}
            </div>
          </div>
        )}

        {comerciais > 0 && (
          <div className="patrocinadores-dica">
            <Lupa tamanho={11} />
            <span>Toque na logo para ver a marca</span>
          </div>
        )}

        {institucional.length > 0 && (
          <div className="patrocinadores-faixa">
            {rotuloFaixa("institucional")}
            <div className="grade-institucional">
              {institucional.map((patrocinador, indice) => (
                <button
                  className="card-institucional"
                  key={patrocinador.id}
                  type="button"
                  onClick={() => abrir("institucional", indice)}
                  aria-label={`Ver ${patrocinador.nome}`}
                >
                  <Placa patrocinador={patrocinador} />
                  <div className="patrocinador-texto">
                    <div className="patrocinador-nome">{patrocinador.nome}</div>
                    <div className="patrocinador-descricao">
                      {patrocinador.descricao}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {comerciais > 0 && (
          <div className="patrocinadores-rodape">
            <div className="patrocinadores-agradecimento">
              Sem essas marcas não tem trilha marcada, não tem água no percurso
              e não tem medalha na chegada. Obrigado.
            </div>
            {whatsappOrganizacao && (
              <a
                className="patrocinadores-cta"
                href={linkWhatsapp(whatsappOrganizacao, CONVITE)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  Quer patrocinar a SAMAS TRAIL?
                  <br />
                  <span className="patrocinadores-cta-apoio">
                    Fale com a organização no WhatsApp
                  </span>
                </span>
                <span className="patrocinadores-cta-seta display">→</span>
              </a>
            )}
          </div>
        )}
      </section>

      {marcaAberta && listaAberta.length > 0 && (
        <ModalPatrocinador
          lista={listaAberta}
          indice={Math.min(marcaAberta.indice, listaAberta.length - 1)}
          aoFechar={() => setMarcaAberta(null)}
          aoTrocar={(indice) =>
            setMarcaAberta({ cota: marcaAberta.cota, indice })
          }
        />
      )}
    </>
  );
}
