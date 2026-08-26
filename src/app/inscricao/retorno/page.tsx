import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Inscricao } from "@/lib/types";

type RetornoPageProps = {
  searchParams: Promise<{ resultado?: string; external_reference?: string }>;
};

const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE ?? "";

const buscarInscricao = (externalReference?: string): Inscricao | null => {
  if (!externalReference || !/^\d+$/.test(externalReference)) {
    return null;
  }
  try {
    const inscricao = getDb()
      .prepare("SELECT * FROM inscricoes WHERE id = ?")
      .get(Number(externalReference)) as unknown as Inscricao | undefined;
    return inscricao ?? null;
  } catch {
    return null;
  }
};

const formatarPreco = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const LogoLinha = () => (
  <div className="logo-linha retorno-logo display">
    <span className="logo-linha-samas">SAMAS</span>
    <span className="logo-linha-trail">TRAIL</span>
  </div>
);

export default async function RetornoPage({ searchParams }: RetornoPageProps) {
  const { resultado, external_reference } = await searchParams;
  const inscricao = buscarInscricao(external_reference);

  if (resultado === "sucesso") {
    return (
      <main className="pagina-retorno textura">
        <div className="retorno-splatter" />
        <div className="retorno-card">
          <LogoLinha />
          <div className="icone-circulo icone-sucesso">✔</div>
          <h1 className="retorno-titulo display">Inscrição confirmada!</h1>
          <p className="retorno-texto">
            Pagamento aprovado. Nos vemos na trilha!
          </p>
          {inscricao && (
            <>
              <div className="retorno-divisor" />
              <div className="retorno-detalhes">
                <div className="retorno-detalhe">
                  <span className="retorno-detalhe-rotulo">Distância</span>
                  <span className="retorno-detalhe-valor">
                    {inscricao.distancia}
                  </span>
                </div>
                <div className="retorno-detalhe">
                  <span className="retorno-detalhe-rotulo">Valor pago</span>
                  <span className="retorno-detalhe-valor">
                    {formatarPreco(inscricao.valor)}
                  </span>
                </div>
                <div className="retorno-detalhe">
                  <span className="retorno-detalhe-rotulo">Data da prova</span>
                  <span className="retorno-detalhe-valor">{eventDate}</span>
                </div>
              </div>
            </>
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
              <circle
                cx="17"
                cy="17"
                r="14"
                stroke="#E10600"
                strokeWidth="2.4"
              />
              <path
                d="M17 9v9l6 4"
                stroke="#FFFFFF"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="retorno-titulo display">Pagamento em processamento</h1>
          <p className="retorno-texto">
            Seu pagamento está sendo analisado pelo banco. Assim que for
            aprovado, sua inscrição é confirmada automaticamente.
          </p>
          <div className="retorno-aviso">Não é necessário pagar novamente.</div>
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
        <h1 className="retorno-titulo display">Pagamento não concluído</h1>
        <p className="retorno-texto">
          Não conseguimos concluir a cobrança. Nenhum valor foi debitado —
          refaça a inscrição ou tente outra forma de pagamento.
        </p>
        <Link className="botao-cta-pequeno" href="/">
          Tentar novamente
        </Link>
        <Link className="retorno-link" href="/">
          Voltar para a página de inscrição
        </Link>
      </div>
    </main>
  );
}
