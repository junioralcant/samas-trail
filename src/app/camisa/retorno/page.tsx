import Link from "next/link";
import { getDb } from "@/lib/db";
import { itensDoPedido, resumirItens } from "@/lib/estoque";
import { getReservaMinutos } from "@/lib/configuracoes";
import type { Inscricao, PedidoCamisa } from "@/lib/types";
import { SEPARACAO_KIT } from "../../camisaExtra";
import VerificadorPagamentoCamisa from "./VerificadorPagamentoCamisa";

type RetornoCamisaProps = {
  searchParams: Promise<{ resultado?: string; external_reference?: string }>;
};

const formatarPreco = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const LogoLinha = () => (
  <div className="logo-linha retorno-logo display">
    <span className="logo-linha-samas">SAMAS</span>
    <span className="logo-linha-trail">TRAIL</span>
  </div>
);

/** O Mercado Pago devolve "camisa-<id>" no external_reference. */
const buscarPedido = (referencia?: string): PedidoCamisa | null => {
  const id = /^camisa-(\d+)$/.exec(referencia ?? "")?.[1];
  if (!id) {
    return null;
  }
  try {
    const pedido = getDb()
      .prepare("SELECT * FROM pedidos_camisa WHERE id = ?")
      .get(Number(id)) as unknown as PedidoCamisa | undefined;
    return pedido ?? null;
  } catch {
    return null;
  }
};

const buscarInscricao = (id: number | null): Inscricao | null => {
  if (id === null) {
    return null;
  }
  const inscricao = getDb()
    .prepare("SELECT * FROM inscricoes WHERE id = ?")
    .get(id) as unknown as Inscricao | undefined;
  return inscricao ?? null;
};

export default async function RetornoCamisaPage({
  searchParams,
}: RetornoCamisaProps) {
  const { resultado, external_reference } = await searchParams;
  const pedido = buscarPedido(external_reference);
  const itens = pedido ? itensDoPedido(pedido.id) : [];
  const inscricao = pedido ? buscarInscricao(pedido.inscricao_id) : null;

  const detalhes = pedido && (
    <>
      <div className="retorno-divisor" />
      <div className="retorno-detalhes">
        <div className="retorno-detalhe">
          <span className="retorno-detalhe-rotulo">Pedido</span>
          <span className="retorno-detalhe-valor">#C-{pedido.id}</span>
        </div>
        <div className="retorno-detalhe">
          <span className="retorno-detalhe-rotulo">Tamanhos</span>
          <span className="retorno-detalhe-valor">{resumirItens(itens)}</span>
        </div>
        <div className="retorno-detalhe">
          <span className="retorno-detalhe-rotulo">Valor</span>
          <span className="retorno-detalhe-valor">
            {formatarPreco(pedido.valor)}
          </span>
        </div>
      </div>
    </>
  );

  const aindaPendente = pedido?.status_pagamento === "pendente";

  // O banco é a fonte da verdade: se o webhook já confirmou, mostra a
  // confirmação mesmo que o Mercado Pago redirecione como pendente.
  if (resultado === "sucesso" || pedido?.status_pagamento === "pago") {
    return (
      <main className="pagina-retorno textura">
        <div className="retorno-splatter" />
        <div className="retorno-card">
          <LogoLinha />
          <div className="icone-circulo icone-sucesso">✔</div>
          <h1 className="retorno-titulo display">Pedido confirmado!</h1>
          <p className="retorno-texto">
            {inscricao
              ? `Sai junto com o kit da inscrição #${inscricao.id} (${inscricao.nome}, ${inscricao.distancia}). Você não precisa de QR próprio.`
              : "Seu QR code chega por e-mail. É com ele que você retira a camisa no dia da prova."}
          </p>
          {/* O Mercado Pago redireciona como sucesso antes de o webhook
              chegar. Sem esta consulta o pedido ficaria pendente para
              sempre e o e-mail nunca sairia. */}
          {pedido && aindaPendente && (
            <VerificadorPagamentoCamisa pedidoId={pedido.id} />
          )}
          {detalhes}
          <div className="retorno-aviso">{SEPARACAO_KIT.pedido}</div>
          {pedido?.token && (
            <Link className="botao-cta-pequeno" href={`/camisa/${pedido.token}`}>
              Ver meu pedido
            </Link>
          )}
          <Link className="retorno-link" href="/">
            Voltar para a página de inscrição
          </Link>
        </div>
      </main>
    );
  }

  if (resultado === "pendente") {
    return (
      <main className="pagina-retorno textura">
        <div className="retorno-splatter" />
        <div className="retorno-card">
          <LogoLinha />
          <div className="icone-circulo icone-pendente">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="17" r="14" stroke="#E10600" strokeWidth="2.4" />
              <path
                d="M17 9v9l6 4"
                stroke="#FFFFFF"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="retorno-titulo display">Pagamento pendente</h1>
          <p className="retorno-texto">
            As peças ficam reservadas por {getReservaMinutos()} minutos; assim
            que o pagamento cair, mandamos o QR por e-mail.
          </p>
          {detalhes}
          {pedido && <VerificadorPagamentoCamisa pedidoId={pedido.id} />}
          <Link className="retorno-link" href="/">
            Voltar para a página de inscrição
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pagina-retorno textura">
      <div className="retorno-splatter" />
      <div className="retorno-card">
        <LogoLinha />
        <div className="icone-circulo icone-erro">✕</div>
        <h1 className="retorno-titulo display">Pagamento não aprovado</h1>
        <p className="retorno-texto">
          Nada foi cobrado e nenhuma peça ficou reservada. Você pode tentar de
          novo agora.
        </p>
        <Link className="botao-cta-pequeno" href="/camisa">
          Tentar de novo
        </Link>
        <Link className="retorno-link" href="/">
          Voltar para a página de inscrição
        </Link>
      </div>
    </main>
  );
}
