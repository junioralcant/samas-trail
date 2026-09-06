"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { calcularIdade, ehMenorDeIdade } from "@/lib/idade";

type ResumoInscricao = {
  id: number;
  nome: string;
  distancia: string;
  tamanho_camiseta: string;
  equipe: string | null;
  status_pagamento: string;
  kit_retirado_em: string | null;
  data_nascimento: string;
  termo_aceito_em: string | null;
};

type ResumoPedidoCamisa = {
  id: number;
  nome: string;
  quantidade: number;
  resumo: string;
  status_pagamento: string;
  retirado_em: string | null;
  inscricao_id: number | null;
};

type ItemCamisa = { tamanho: string; quantidade: number };

type Resultado =
  | {
      tipo: "confirmado";
      inscricao: ResumoInscricao;
      camisasResumo?: string;
      camisasExtras?: ItemCamisa[];
    }
  | {
      tipo: "ja-retirado";
      inscricao: ResumoInscricao;
      camisasResumo?: string;
      camisasExtras?: ItemCamisa[];
    }
  | { tipo: "erro"; mensagem: string; inscricao?: ResumoInscricao }
  | { tipo: "camisa-confirmada"; pedido: ResumoPedidoCamisa }
  | { tipo: "camisa-ja-retirada"; pedido: ResumoPedidoCamisa }
  | { tipo: "camisa-erro"; mensagem: string; pedido?: ResumoPedidoCamisa };

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
        // O mesmo leitor recebe os dois códigos: o kit do atleta e o do
        // pedido de quem comprou camisa sem se inscrever.
        const ehCamisa = data.tipo === "camisa";
        if (!response.ok) {
          setResultado(
            ehCamisa
              ? {
                  tipo: "camisa-erro",
                  mensagem: data.erro ?? "Erro ao confirmar entrega",
                  pedido: data.pedido,
                }
              : {
                  tipo: "erro",
                  mensagem: data.erro ?? "Erro ao confirmar retirada",
                  inscricao: data.inscricao,
                },
          );
          return;
        }
        if (ehCamisa) {
          setResultado({
            tipo: data.jaRetirado ? "camisa-ja-retirada" : "camisa-confirmada",
            pedido: data.pedido,
          });
          if (!data.jaRetirado) {
            onConfirmado();
          }
          return;
        }
        if (data.jaRetirado) {
          setResultado({
            tipo: "ja-retirado",
            inscricao: data.inscricao,
            camisasResumo: data.camisasResumo,
            camisasExtras: data.camisasExtras,
          });
          return;
        }
        setResultado({
          tipo: "confirmado",
          inscricao: data.inscricao,
          camisasResumo: data.camisasResumo,
          camisasExtras: data.camisasExtras,
        });
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
              resultado.tipo === "confirmado" ||
              resultado.tipo === "camisa-confirmada"
                ? "leitor-sucesso"
                : resultado.tipo === "ja-retirado" ||
                    resultado.tipo === "camisa-ja-retirada"
                  ? "leitor-alerta"
                  : "leitor-erro"
            }`}
          >
            {/* O tipo do código precisa ser identificável antes de ler o
                texto: o operador está no sol, com fila na frente. */}
            <div className="leitor-tipo">
              {resultado.tipo.startsWith("camisa")
                ? "Código de camisa"
                : "Código de kit"}
            </div>
            <div className="leitor-resultado-titulo">
              {resultado.tipo === "confirmado" && "✔ Kit liberado!"}
              {resultado.tipo === "ja-retirado" &&
                `⚠ Kit já retirado em ${resultado.inscricao.kit_retirado_em}`}
              {resultado.tipo === "erro" && `✕ ${resultado.mensagem}`}
              {resultado.tipo === "camisa-confirmada" && "✔ Camisa entregue!"}
              {resultado.tipo === "camisa-ja-retirada" &&
                `⚠ Camisa já entregue em ${resultado.pedido.retirado_em}`}
              {resultado.tipo === "camisa-erro" && `✕ ${resultado.mensagem}`}
            </div>

            {"pedido" in resultado && resultado.pedido && (
              <div className="leitor-atleta">
                <div className="leitor-atleta-nome">
                  #C-{resultado.pedido.id} — {resultado.pedido.nome}
                </div>
                <div className="leitor-atleta-info">
                  Camisa avulsa · {resultado.pedido.resumo}
                </div>
                {resultado.pedido.inscricao_id && (
                  <div className="leitor-atleta-alerta">
                    ⚠ Este comprador tem a inscrição #
                    {resultado.pedido.inscricao_id} — a camisa normalmente sai
                    junto com o kit. Confira se o kit já foi entregue.
                  </div>
                )}
              </div>
            )}

            {"camisasResumo" in resultado && resultado.camisasResumo && (
              // Entrega única: o operador não pode esquecer as camisas.
              <div className="leitor-camisas">
                <span className="leitor-camisas-rotulo">Entrega junto</span>+
                {resultado.camisasExtras?.reduce(
                  (s, c) => s + c.quantidade,
                  0,
                )}{" "}
                camisas extras: {resultado.camisasResumo}
              </div>
            )}

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
                {ehMenorDeIdade(resultado.inscricao.data_nascimento) && (
                  <div className="leitor-atleta-alerta">
                    ⚠ MENOR DE IDADE (
                    {calcularIdade(resultado.inscricao.data_nascimento)} anos) —
                    exija o Termo de Responsabilidade impresso e assinado pelo
                    responsável legal, com o documento de identidade dele.
                  </div>
                )}
                {!resultado.inscricao.termo_aceito_em && (
                  <div className="leitor-atleta-alerta">
                    ⚠ SEM ACEITE DO TERMO no sistema — colha o termo assinado em
                    papel antes de liberar o kit.
                  </div>
                )}
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
