import type { Metadata } from "next";
import PaginaDocumento from "../PaginaDocumento";
import { ATUALIZADO_EM, EMAIL_JOGO, RESPONSAVEL_JOGO } from "../contato";

export const metadata: Metadata = {
  title: "Política de Privacidade — SAMAS TRAIL (jogo)",
  description:
    "Como o jogo SAMAS TRAIL trata seus dados: nada é coletado, tudo fica no seu aparelho.",
};

export default function PrivacidadeJogoPage() {
  return (
    <PaginaDocumento titulo="Política de Privacidade" atualizadoEm={ATUALIZADO_EM}>
      <p className="documento-destaque">
        Resumo: o SAMAS TRAIL não coleta, não envia e não compartilha nenhum
        dado pessoal. Seu progresso fica salvo só no seu aparelho.
      </p>

      <h2>1. Quem somos</h2>
      <p>
        O SAMAS TRAIL é um jogo de corrida de trilha para iOS e Android,
        desenvolvido e publicado por {RESPONSAVEL_JOGO} (&ldquo;nós&rdquo;).
        Esta política vale apenas para o jogo. As inscrições na corrida feitas
        neste site seguem regras próprias.
      </p>

      <h2>2. Dados que coletamos</h2>
      <p>
        Nenhum. O jogo não pede cadastro, login, nome, e-mail, localização,
        contatos, fotos nem qualquer outra informação pessoal. Ele não usa a
        internet, não exibe anúncios e não tem ferramentas de análise,
        rastreamento ou SDKs de terceiros.
      </p>

      <h2>3. O que fica salvo no seu aparelho</h2>
      <p>
        Para você não perder o progresso, o jogo grava um arquivo local com:
      </p>
      <ul>
        <li>recordes de distância e pontuação, e o ranking local;</li>
        <li>medalhas, itens desbloqueados, melhorias e missões;</li>
        <li>resultados por fase e estatísticas de corrida;</li>
        <li>configurações de som, vibração e qualidade gráfica.</li>
      </ul>
      <p>
        Esse arquivo nunca sai do aparelho e não chega até nós. Ao desinstalar
        o jogo, ele é apagado junto.
      </p>

      <h2>4. Compartilhamento</h2>
      <p>
        Como não coletamos dados, não há nada para vender, compartilhar ou
        transferir a terceiros.
      </p>

      <h2>5. Crianças</h2>
      <p>
        O jogo é adequado para todas as idades e não coleta dados de ninguém,
        inclusive de crianças e adolescentes, em linha com a Lei Geral de
        Proteção de Dados (LGPD, Lei nº 13.709/2018).
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        A LGPD garante a você o direito de saber se tratamos seus dados, de
        acessá-los, corrigi-los e pedir sua exclusão. Como o jogo não coleta
        dados, não guardamos nada sobre você. Para apagar o progresso local,
        basta desinstalar o app. Dúvidas podem ser enviadas para o contato
        abaixo.
      </p>

      <h2>7. Mudanças nesta política</h2>
      <p>
        Se uma versão futura do jogo passar a coletar algum dado (por exemplo,
        um ranking online), esta página será atualizada antes, explicando o
        quê, por quê e como. A data no topo indica a última alteração.
      </p>

      <h2>8. Contato</h2>
      <p>
        {RESPONSAVEL_JOGO}
        <br />
        E-mail: <a href={`mailto:${EMAIL_JOGO}`}>{EMAIL_JOGO}</a>
      </p>
    </PaginaDocumento>
  );
}
