// Termo de Responsabilidade aceito no ato da inscricao.
//
// O texto e LITERAL de proposito: o aceite de cada atleta guarda a versao que
// ele aceitou (coluna termo_versao), e isso so tem valor se a versao permitir
// reproduzir a redacao exata. Toda alteracao de texto exige bump em
// TERMO_VERSAO -- inclusive trocar a data do evento.
export const TERMO_VERSAO = "2026.1";

export const TERMO_TITULO = "Termo de Responsabilidade";

export const TERMO_EVENTO = "SAMAS TRAIL 2026 — São Mateus do Maranhão/MA";

export const TERMO_DATA_PROVA = "22 de novembro de 2026";

/** Abertura do termo, com os dados do atleta preenchidos. */
export const montarAbertura = (nome: string, documento: string) => {
  const quem = nome.trim() || "________________________________";
  const doc = documento.trim() || "________________";
  return (
    `${quem}, documento de identidade (CPF) nº ${doc}, por si, se maior de ` +
    `idade, ou assistido por seu responsável legal, se menor de 18 anos, em ` +
    `adiante designado "O PARTICIPANTE", solicita sua participação no evento ` +
    `${TERMO_EVENTO}, a ser realizado no dia ${TERMO_DATA_PROVA}, sob as ` +
    `seguintes condições. O Participante declara e garante:`
  );
};

export const TERMO_CLAUSULAS: { letra: string; texto: string }[] = [
  {
    letra: "a",
    texto:
      "Aceitar totalmente o REGULAMENTO da prova publicado no site oficial.",
  },
  {
    letra: "b",
    texto:
      "Ter pleno conhecimento que o uso da camisa padronizada do evento e " +
      "mochila de hidratação para todos os percursos são obrigatórios.",
  },
  {
    letra: "c",
    texto:
      "Ter plena capacidade física e psíquica para aceitar e compreender o " +
      "disposto no presente termo.",
  },
  {
    letra: "d",
    texto:
      "Estar física e psicologicamente apto para participar desta PROVA. " +
      "Gozar de boa saúde e estar ciente que não existe nenhuma recomendação " +
      "médica que lhe impeça de praticar atividades físicas.",
  },
  {
    letra: "e",
    texto:
      "Estar ciente da importância em realizar um controle médico prévio à " +
      "corrida.",
  },
  {
    letra: "f",
    texto:
      "Estar liberado por seu médico para participar e ter treinado " +
      "apropriadamente para a prova.",
  },
  {
    letra: "g",
    texto:
      "Assumir, por livre e espontânea vontade, todos os riscos envolvidos e " +
      "suas consequências pela participação nesta PROVA (que incluem " +
      "possibilidade de invalidez e morte), isentando o SAMAS TRAIL, seus " +
      "organizadores, colaboradores e patrocinadores de TODA E QUALQUER " +
      "RESPONSABILIDADE por quaisquer danos materiais, morais ou físicos que " +
      "porventura venha a sofrer, advindos da participação nesta PROVA.",
  },
  {
    letra: "h",
    texto:
      "Ter pleno conhecimento do percurso e consciência das especificidades " +
      "da prova.",
  },
  {
    // Menor de idade aceita o termo pelo site, mas a via assinada pelo
    // responsavel e conferida na retirada do kit.
    letra: "i",
    texto:
      "Se menor de 18 anos, apresentar na entrega dos kits este Termo de " +
      "Responsabilidade impresso e assinado pelo responsável legal, " +
      "acompanhado do documento de identidade do responsável.",
  },
  {
    letra: "j",
    texto:
      "Respeitar as regras de competição, assim como as normas de circulação " +
      "e as instruções dos responsáveis de cada prova.",
  },
  {
    letra: "k",
    texto:
      "Ter ciência das dificuldades para realizar operações de resgate em " +
      "algumas zonas do percurso, inclusive que haverá zonas onde não se " +
      "possa chegar com veículos, nas quais a atenção imediata é limitada.",
  },
  {
    letra: "l",
    texto:
      "Entender que, por razões de segurança, a organização priorizará a " +
      "atenção e evacuação das emergências e urgências médicas, " +
      "considerando-se como tais aqueles casos que possam evoluir com risco " +
      "de morte, podendo então demandar mais tempo a atenção de lesões como " +
      "as antes descritas.",
  },
  {
    letra: "m",
    texto:
      "Usar o número de peito com chip de cronometragem na parte frontal e " +
      "ser responsável pelo uso correto deste.",
  },
  {
    letra: "n",
    texto:
      "Não deixar nenhum material nos setores de reabastecimento ou com os " +
      "staffs do percurso. A organização não se responsabiliza por objetos " +
      "deixados nesses locais.",
  },
  {
    letra: "o",
    texto:
      "Eximir os organizadores, os proprietários das terras pelas quais " +
      "passe a corrida e os patrocinadores de responsabilidade por extravios " +
      "no percurso, acidentes pessoais, danos e/ou perdas de objetos que " +
      "possam ocorrer antes, durante ou após sua participação na prova.",
  },
  {
    letra: "p",
    texto:
      "Autorizar que suas imagens na competição possam ser utilizadas pela " +
      "organização e pelas empresas patrocinadoras para fins de difusão e " +
      "publicidade do evento e/ou de produtos associados ao mesmo.",
  },
  {
    letra: "q",
    texto:
      "Ter ciência que a organização poderá determinar a suspensão, " +
      "adiamento ou cancelamento da corrida sem aviso prévio por questões de " +
      "segurança pública, vandalismo e/ou motivos de força maior.",
  },
  {
    letra: "r",
    texto:
      "Assumir que todos os eventuais custos referentes à locomoção até o " +
      "local do evento, preparação, estadia, inscrição, entre outros gastos " +
      "despendidos pelo atleta, serão suportados única e exclusivamente pelo " +
      "mesmo, isentando a Comissão Organizadora e a empresa responsável do " +
      "ressarcimento de qualquer destes custos.",
  },
];
