"use client";

import { useEffect, useRef, useState } from "react";

const INTERVALO_MS = 5000;
const LIMITE_MS = 15 * 60 * 1000;

type VerificadorPagamentoProps = {
  inscricaoId: number;
};

export default function VerificadorPagamento({
  inscricaoId,
}: VerificadorPagamentoProps) {
  const [expirado, setExpirado] = useState(false);
  const redirecionou = useRef(false);

  useEffect(() => {
    const inicio = Date.now();
    let ativo = true;

    const verificar = async () => {
      try {
        const response = await fetch(`/api/inscricoes/${inscricaoId}/status`, {
          cache: "no-store",
        });
        if (!ativo || !response.ok) {
          return;
        }
        const data: { status?: string } = await response.json();
        if (data.status === "pago" && !redirecionou.current) {
          redirecionou.current = true;
          window.location.replace(
            `/inscricao/retorno?resultado=sucesso&external_reference=${inscricaoId}`,
          );
        }
        if (data.status === "cancelado" && !redirecionou.current) {
          redirecionou.current = true;
          window.location.replace("/inscricao/retorno?resultado=erro");
        }
      } catch {
        // Falha de rede: tenta de novo no próximo ciclo.
      }
    };

    verificar();
    const intervalo = setInterval(() => {
      if (Date.now() - inicio > LIMITE_MS) {
        clearInterval(intervalo);
        if (ativo) {
          setExpirado(true);
        }
        return;
      }
      verificar();
    }, INTERVALO_MS);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [inscricaoId]);

  if (expirado) {
    return (
      <div className="verificador-pagamento">
        <span className="verificador-texto">
          Ainda não recebemos a confirmação. Assim que o pagamento for
          aprovado, você recebe um e-mail com todos os detalhes.
        </span>
      </div>
    );
  }

  return (
    <div className="verificador-pagamento">
      <span className="verificador-spinner" />
      <span className="verificador-texto">
        Esta página se atualiza sozinha assim que o pagamento for aprovado —
        não precisa recarregar.
      </span>
    </div>
  );
}
