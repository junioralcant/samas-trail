import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { itensDoPedido, resumirItens } from "@/lib/estoque";
import type { Inscricao, PedidoCamisa } from "@/lib/types";
import { SEPARACAO_KIT } from "../../camisaExtra";

type PaginaPedidoProps = {
  params: Promise<{ token: string }>;
};

const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE ?? "";
const eventLocation = process.env.NEXT_PUBLIC_EVENT_LOCATION ?? "";

const formatarPreco = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const LogoLinha = () => (
  <div className="logo-linha retorno-logo display">
    <span className="logo-linha-samas">SAMAS</span>
    <span className="logo-linha-trail">TRAIL</span>
  </div>
);

export default async function PaginaPedidoCamisa({
  params,
}: PaginaPedidoProps) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    notFound();
  }

  const db = getDb();
  const pedido = db
    .prepare("SELECT * FROM pedidos_camisa WHERE token = ?")
    .get(token) as unknown as PedidoCamisa | undefined;

  if (!pedido) {
    notFound();
  }

  const itens = itensDoPedido(pedido.id);
  const inscricao = pedido.inscricao_id
    ? (db
        .prepare("SELECT * FROM inscricoes WHERE id = ?")
        .get(pedido.inscricao_id) as unknown as Inscricao | undefined)
    : undefined;
  const pago = pedido.status_pagamento === "pago";

  return (
    <main className="pagina-retorno textura">
      <div className="retorno-splatter" />
      <div className="retorno-card">
        <LogoLinha />
        <div className="pedido-cabecalho">
          <h1 className="retorno-titulo display">Pedido #C-{pedido.id}</h1>
          <span className={`badge ${pedido.status_pagamento}`}>
            {pedido.status_pagamento}
          </span>
        </div>
        <p className="retorno-texto">{SEPARACAO_KIT.pedido}</p>

        <div className="retorno-divisor" />
        <div className="retorno-detalhes">
          <div className="retorno-detalhe">
            <span className="retorno-detalhe-rotulo">Tamanhos</span>
            <span className="retorno-detalhe-valor">{resumirItens(itens)}</span>
          </div>
          <div className="retorno-detalhe">
            <span className="retorno-detalhe-rotulo">
              {pago ? "Valor pago" : "Valor"}
            </span>
            <span className="retorno-detalhe-valor">
              {formatarPreco(pedido.valor)}
            </span>
          </div>
          <div className="retorno-detalhe">
            <span className="retorno-detalhe-rotulo">Data da prova</span>
            <span className="retorno-detalhe-valor">{eventDate}</span>
          </div>
        </div>

        <div className="retorno-divisor" />

        {!pago ? (
          <div className="retorno-aviso">
            O QR aparece aqui quando o pagamento for aprovado.
          </div>
        ) : pedido.retirado_em ? (
          <div className="kit-status kit-status-retirado">
            ✔ Camisa retirada em {pedido.retirado_em}
          </div>
        ) : inscricao ? (
          // Uma entrega só: o QR do kit já cobre as camisas, e um segundo
          // QR só confundiria quem entrega.
          <>
            <div className="pedido-sem-qr">Sem QR — sai no kit</div>
            <div className="retorno-aviso">
              A retirada é junto com o kit da inscrição #{inscricao.id} (
              {inscricao.nome}, {inscricao.distancia}). O QR do kit já cobre as
              camisas.
            </div>
            {inscricao.kit_token && (
              <Link
                className="botao-cta-pequeno"
                href={`/inscricao/${inscricao.kit_token}`}
              >
                Ver a inscrição #{inscricao.id}
              </Link>
            )}
          </>
        ) : (
          <>
            <div className="qr-moldura">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/${token}`}
                alt="QR code do pedido para retirada da camisa"
                width={220}
                height={220}
              />
            </div>
            <div className="retorno-aviso">
              Mostre este QR na tenda de retirada no dia {eventDate}
              {eventLocation ? `, no ${eventLocation.split(" — ")[0]}` : ""}.
            </div>
          </>
        )}

        <Link className="retorno-link" href="/camisa">
          Comprar outra camisa
        </Link>
      </div>
    </main>
  );
}
