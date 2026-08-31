import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { ehMenorDeIdade } from "@/lib/idade";
import type { Inscricao } from "@/lib/types";

type PaginaInscricaoProps = {
  params: Promise<{ token: string }>;
};

const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE ?? "";

const formatarPreco = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const LogoLinha = () => (
  <div className="logo-linha retorno-logo display">
    <span className="logo-linha-samas">SAMAS</span>
    <span className="logo-linha-trail">TRAIL</span>
  </div>
);

export default async function PaginaInscricao({
  params,
}: PaginaInscricaoProps) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    notFound();
  }

  const inscricao = getDb()
    .prepare("SELECT * FROM inscricoes WHERE kit_token = ?")
    .get(token) as unknown as Inscricao | undefined;

  if (!inscricao) {
    notFound();
  }

  const paga = inscricao.status_pagamento === "pago";
  const menor = ehMenorDeIdade(inscricao.data_nascimento);

  return (
    <main className="pagina-retorno textura">
      <div className="retorno-splatter" />
      <div className="retorno-card">
        <LogoLinha />
        <h1 className="retorno-titulo display">Minha inscrição</h1>
        <p className="retorno-texto">
          {inscricao.nome} — inscrição #{inscricao.id}
        </p>

        <div className="retorno-divisor" />
        <div className="retorno-detalhes">
          <div className="retorno-detalhe">
            <span className="retorno-detalhe-rotulo">Distância</span>
            <span className="retorno-detalhe-valor">{inscricao.distancia}</span>
          </div>
          <div className="retorno-detalhe">
            <span className="retorno-detalhe-rotulo">Camiseta</span>
            <span className="retorno-detalhe-valor">
              {inscricao.tamanho_camiseta}
            </span>
          </div>
          {inscricao.equipe && (
            <div className="retorno-detalhe">
              <span className="retorno-detalhe-rotulo">Equipe</span>
              <span className="retorno-detalhe-valor">{inscricao.equipe}</span>
            </div>
          )}
          <div className="retorno-detalhe">
            <span className="retorno-detalhe-rotulo">Valor</span>
            <span className="retorno-detalhe-valor">
              {formatarPreco(inscricao.valor)}
            </span>
          </div>
          <div className="retorno-detalhe">
            <span className="retorno-detalhe-rotulo">Data da prova</span>
            <span className="retorno-detalhe-valor">{eventDate}</span>
          </div>
          <div className="retorno-detalhe">
            <span className="retorno-detalhe-rotulo">Pagamento</span>
            <span className="retorno-detalhe-valor">
              {inscricao.status_pagamento}
            </span>
          </div>
        </div>

        {paga ? (
          <>
            <div className="retorno-divisor" />
            {inscricao.kit_retirado_em ? (
              <div className="kit-status kit-status-retirado">
                ✔ Kit retirado em {inscricao.kit_retirado_em}
              </div>
            ) : (
              <>
                <div className="qr-moldura">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/qr/${token}`}
                    alt="QR code da inscrição para retirada do kit"
                    width={220}
                    height={220}
                  />
                </div>
                <div className="retorno-aviso">
                  Apresente este QR code à organização na retirada do seu kit
                  de atleta.
                </div>
                {menor && (
                  <div className="retorno-aviso retorno-aviso-atencao">
                    Atleta menor de 18 anos: leve também o Termo de
                    Responsabilidade impresso e assinado pelo responsável legal,
                    com o documento de identidade dele. Sem isso o kit não pode
                    ser liberado.
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="retorno-aviso">
            O QR code de retirada do kit fica disponível assim que o pagamento
            for confirmado.
          </div>
        )}

        <Link className="retorno-link" href="/">
          Voltar para a página de inscrição
        </Link>
      </div>
    </main>
  );
}
