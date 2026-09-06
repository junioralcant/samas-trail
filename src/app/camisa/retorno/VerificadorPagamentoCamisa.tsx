"use client";

import { useEffect, useRef, useState } from "react";

const INTERVALO_MS = 5000;
const LIMITE_MS = 15 * 60 * 1000;

type VerificadorPagamentoCamisaProps = {
  pedidoId: number;
};

/**
 * O webhook do Mercado Pago pode não chegar (em HTTP local ele nem é
 * registrado, e em produção pode atrasar). Esta consulta é o que promove o
 * pedido para pago — e é o que dispara o e-mail de confirmação.
 */
export default function VerificadorPagamentoCamisa({
  pedidoId,
}: VerificadorPagamentoCamisaProps) {
  const [expirado, setExpirado] = useState(false);
  const recarregou = useRef(false);

  useEffect(() => {
    const inicio = Date.now();
    let ativo = true;

    const verificar = async () => {
      try {
        const response = await fetch(`/api/camisas/${pedidoId}/status`, {
          cache: "no-store",
        });
        if (!ativo || !response.ok) {
          return;
        }
        const data: { status?: string } = await response.json();
        if (data.status === "pago" && !recarregou.current) {
          recarregou.current = true;
          window.location.reload();
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
  }, [pedidoId]);

  if (expirado) {
    return (
      <div className="verificador-pagamento">
        <span className="verificador-texto">
          Ainda não recebemos a confirmação. Assim que o pagamento for
          aprovado, você recebe um e-mail com o QR de retirada.
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
