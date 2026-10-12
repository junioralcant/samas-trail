import type { Metadata } from "next";
import PaginaDocumento from "../PaginaDocumento";
import { ATUALIZADO_EM, EMAIL_JOGO } from "../contato";

export const metadata: Metadata = {
  title: "Suporte — SAMAS TRAIL (jogo)",
  description: "Ajuda, dúvidas frequentes e contato do jogo SAMAS TRAIL.",
};

export default function SuporteJogoPage() {
  return (
    <PaginaDocumento titulo="Suporte" atualizadoEm={ATUALIZADO_EM}>
      <p className="documento-destaque">
        Achou um bug, travou numa fase ou tem uma sugestão? Escreva para{" "}
        <a href={`mailto:${EMAIL_JOGO}?subject=SAMAS%20TRAIL%20-%20Suporte`}>
          {EMAIL_JOGO}
        </a>
        .
      </p>

      <h2>Como jogar</h2>
      <ul>
        <li>Deslize para a esquerda ou direita para trocar de faixa.</li>
        <li>Deslize para cima para pular e para baixo para deslizar sob os obstáculos.</li>
        <li>Pegue medalhas pelo caminho e use-as para desbloquear itens.</li>
      </ul>

      <h2>Perguntas frequentes</h2>
      <h3>Perdi meu progresso. Dá para recuperar?</h3>
      <p>
        O progresso fica salvo só no aparelho. Se o jogo foi desinstalado, os
        dados foram apagados junto e não há cópia em servidor.
      </p>
      <h3>O jogo precisa de internet?</h3>
      <p>Não. Dá para jogar totalmente offline.</p>
      <h3>O jogo tem anúncios ou compras?</h3>
      <p>Não.</p>
      <h3>O jogo está lento no meu aparelho.</h3>
      <p>
        Nas configurações do jogo, desligue a opção de alta qualidade
        gráfica.
      </p>

      <h2>Ao relatar um problema, informe</h2>
      <ul>
        <li>modelo do aparelho e versão do sistema (iOS ou Android);</li>
        <li>versão do jogo;</li>
        <li>o que aconteceu e, se puder, um print ou vídeo da tela.</li>
      </ul>
    </PaginaDocumento>
  );
}
