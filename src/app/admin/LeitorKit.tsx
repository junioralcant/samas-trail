"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

type ResumoInscricao = {
  id: number;
  nome: string;
  distancia: string;
  tamanho_camiseta: string;
  equipe: string | null;
  status_pagamento: string;
  kit_retirado_em: string | null;
};

type Resultado =
  | { tipo: "confirmado"; inscricao: ResumoInscricao }
  | { tipo: "ja-retirado"; inscricao: ResumoInscricao }
  | { tipo: "erro"; mensagem: string; inscricao?: ResumoInscricao };

type LeitorKitProps = {
  onConfirmado: () => void;
};

export default function LeitorKit({ onConfirmado }: LeitorKitProps) {
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const quadroRef = useRef<number>(0);
  const lendoRef = useRef(false);
  const enviandoRef = useRef(false);

  const pararCamera = useCallback(() => {
    lendoRef.current = false;
    cancelAnimationFrame(quadroRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const confirmarToken = useCallback(
    async (texto: string) => {
      if (enviandoRef.current) {
        return;
      }
      enviandoRef.current = true;
      lendoRef.current = false;
      try {
        const response = await fetch("/api/admin/kit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: texto }),
        });
        const data = await response.json();
        if (!response.ok) {
          setResultado({
            tipo: "erro",
            mensagem: data.erro ?? "Erro ao confirmar retirada",
            inscricao: data.inscricao,
          });
          return;
        }
        if (data.jaRetirado) {
          setResultado({ tipo: "ja-retirado", inscricao: data.inscricao });
          return;
        }
        setResultado({ tipo: "confirmado", inscricao: data.inscricao });
        onConfirmado();
      } catch {
        setResultado({ tipo: "erro", mensagem: "Erro de conexão" });
      } finally {
        enviandoRef.current = false;
      }
    },
    [onConfirmado],
  );

  const lerQuadros = useCallback(() => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    const processar = () => {
      if (!lendoRef.current || !video || !contexto) {
        return;
      }
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imagem = contexto.getImageData(0, 0, canvas.width, canvas.height);
        const codigo = jsQR(imagem.data, imagem.width, imagem.height);
        if (codigo?.data && /[0-9a-f]{32}/.test(codigo.data)) {
          confirmarToken(codigo.data);
          return;
        }
      }
      quadroRef.current = requestAnimationFrame(processar);
    };
    quadroRef.current = requestAnimationFrame(processar);
  }, [confirmarToken]);

  const iniciarCamera = useCallback(async () => {
    setErroCamera(null);
    setResultado(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      lendoRef.current = true;
      lerQuadros();
    } catch {
      setErroCamera(
        "Não foi possível acessar a câmera. Verifique a permissão do navegador.",
      );
    }
  }, [lerQuadros]);

  useEffect(() => {
    if (aberto) {
      iniciarCamera();
    }
    return pararCamera;
  }, [aberto, iniciarCamera, pararCamera]);

  const fechar = () => {
    pararCamera();
    setAberto(false);
    setResultado(null);
    setErroCamera(null);
  };

  const lerProximo = () => {
    setResultado(null);
    if (streamRef.current) {
      lendoRef.current = true;
      lerQuadros();
    } else {
      iniciarCamera();
    }
  };

  if (!aberto) {
    return (
      <button
        className="botao-vermelho"
        type="button"
        onClick={() => setAberto(true)}
      >
        Retirada de kit
      </button>
    );
  }

  return (
    <div className="leitor-overlay">
      <div className="leitor-card">
        <div className="leitor-cabecalho">
          <div className="leitor-titulo display">Retirada de kit</div>
          <button className="botao-contorno" type="button" onClick={fechar}>
            Fechar
          </button>
        </div>

        {erroCamera ? (
          <div className="leitor-resultado leitor-erro">{erroCamera}</div>
        ) : resultado ? (
          <div
            className={`leitor-resultado ${
              resultado.tipo === "confirmado"
                ? "leitor-sucesso"
                : resultado.tipo === "ja-retirado"
                  ? "leitor-alerta"
                  : "leitor-erro"
            }`}
          >
            <div className="leitor-resultado-titulo">
              {resultado.tipo === "confirmado" && "✔ Kit liberado!"}
              {resultado.tipo === "ja-retirado" &&
                `⚠ Kit já retirado em ${resultado.inscricao.kit_retirado_em}`}
              {resultado.tipo === "erro" && `✕ ${resultado.mensagem}`}
            </div>
            {"inscricao" in resultado && resultado.inscricao && (
              <div className="leitor-atleta">
                <div className="leitor-atleta-nome">
                  #{resultado.inscricao.id} — {resultado.inscricao.nome}
                </div>
                <div className="leitor-atleta-info">
                  {resultado.inscricao.distancia} · Camiseta{" "}
                  {resultado.inscricao.tamanho_camiseta}
                  {resultado.inscricao.equipe
                    ? ` · ${resultado.inscricao.equipe}`
                    : ""}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="leitor-instrucao">
            Aponte a câmera para o QR code do atleta
          </div>
        )}

        <div
          className="leitor-video-moldura"
          data-lendo={!resultado && !erroCamera}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} playsInline muted />
        </div>

        {(resultado || erroCamera) && (
          <button className="botao-cta" type="button" onClick={lerProximo}>
            Ler próximo QR code
          </button>
        )}
      </div>
    </div>
  );
}
