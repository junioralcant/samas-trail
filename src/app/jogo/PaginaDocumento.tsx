import Link from "next/link";
import type { ReactNode } from "react";

type PaginaDocumentoProps = {
  titulo: string;
  atualizadoEm: string;
  children: ReactNode;
};

/** Moldura das páginas de texto do jogo (privacidade, suporte). */
export default function PaginaDocumento({
  titulo,
  atualizadoEm,
  children,
}: PaginaDocumentoProps) {
  return (
    <main className="pagina-documento textura">
      <div className="retorno-splatter" />
      <article className="documento-card">
        <div className="logo-linha documento-logo display">
          <span className="logo-linha-samas">SAMAS</span>
          <span className="logo-linha-trail">TRAIL</span>
        </div>
        <span className="documento-selo">O jogo</span>
        <h1 className="documento-titulo display">{titulo}</h1>
        <p className="documento-data">Última atualização: {atualizadoEm}</p>
        <div className="documento-corpo">{children}</div>
        <nav className="documento-rodape">
          <Link className="retorno-link" href="/jogo/privacidade">
            Privacidade
          </Link>
          <Link className="retorno-link" href="/jogo/suporte">
            Suporte
          </Link>
          <Link className="retorno-link" href="/">
            Site oficial
          </Link>
        </nav>
      </article>
    </main>
  );
}
