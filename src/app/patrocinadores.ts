// Cotas em ordem de hierarquia. "institucional" nao e cota paga: entra em faixa
// separada, sem pill vermelho e sem slot de "sua marca aqui".
export type CotaPatrocinio = "master" | "ouro" | "apoio" | "institucional";

export type Patrocinador = {
  id: string;
  cota: CotaPatrocinio;
  nome: string;
  // Nome curto usado embaixo da logo nos cards pequenos.
  nomeCurto: string;
  descricao: string;
  // Arquivo em /public/patrocinadores. Sem logo, o nome entra na tipografia do site.
  logo?: string;
  // Placa clara para logo de fundo branco ou marca escura; escura para PNG/SVG
  // transparente de marca clara. Contraste manda, nao o formato do arquivo.
  placa: "clara" | "escura";
  // Handle do Instagram sem o @.
  instagram?: string;
  // Somente digitos, com DDD.
  whatsapp?: string;
  // Link de mapa para o botao "Como chegar".
  endereco?: string;
};

export const ROTULO_COTA: Record<CotaPatrocinio, string> = {
  master: "Patrocinador master",
  ouro: "Patrocinador ouro",
  apoio: "Apoio",
  institucional: "Apoio institucional",
};

export const ROTULO_FAIXA: Record<CotaPatrocinio, string> = {
  master: "Master",
  ouro: "Ouro",
  apoio: "Apoio",
  institucional: "Apoio institucional",
};

// Preencher conforme as marcas fecharem. Exemplo de entrada:
//
// {
//   id: "vidanova",
//   cota: "ouro",
//   nome: "Farmácia Vida Nova",
//   nomeCurto: "Vida Nova",
//   descricao: "Duas lojas em São Mateus do Maranhão e o posto médico da chegada.",
//   logo: "/patrocinadores/vidanova.png",
//   placa: "escura",
//   instagram: "farmaciavidanova.ma",
//   whatsapp: "5599999999999",
// }
// EXEMPLO — marcas ficticias so para ver a secao de pe. Trocar pelas marcas
// reais (e apagar as que sobrarem) antes de publicar.
export const PATROCINADORES: Patrocinador[] = [
  {
    id: "acai",
    cota: "ouro",
    nome: "Açaí da Praça",
    nomeCurto: "Açaí da Praça",
    descricao: "Açaí batido na hora. Ponto de hidratação e fruta do km 5.",
    placa: "clara",
    instagram: "acaidapraca.smm",
  },
  {
    id: "posto",
    cota: "ouro",
    nome: "Posto Trilha Norte",
    nomeCurto: "Trilha Norte",
    descricao: "Combustível das vans de apoio e do caminhão de estrutura.",
    placa: "escura",
    instagram: "postotrilhanorte",
  },
  {
    id: "esporte",
    cota: "ouro",
    nome: "Esporte & Cia",
    nomeCurto: "Esporte & Cia",
    descricao: "Loja de material esportivo na praça da matriz.",
    placa: "clara",
    instagram: "esportecia.ma",
  },
  {
    id: "clinica",
    cota: "apoio",
    nome: "Clínica São Mateus",
    nomeCurto: "Clínica SM",
    descricao: "Avaliação física e fisioterapia para os inscritos.",
    placa: "escura",
    instagram: "clinicasaomateus.ma",
  },
  {
    id: "padaria",
    cota: "apoio",
    nome: "Padaria Boa Farinha",
    nomeCurto: "Boa Farinha",
    descricao: "Café da manhã da equipe de percurso.",
    placa: "clara",
    instagram: "padariaboafarinha",
  },
  {
    id: "marmitas",
    cota: "apoio",
    nome: "Marmitas da Dona Lu",
    nomeCurto: "Dona Lu",
    descricao: "Almoço da equipe de percurso e da comissão de largada.",
    placa: "clara",
    whatsapp: "5599999990002",
  },
  {
    id: "prefeitura",
    cota: "institucional",
    nome: "Prefeitura de São Mateus do Maranhão",
    nomeCurto: "Prefeitura",
    descricao: "Cessão das vias e apoio da Guarda Municipal.",
    placa: "clara",
    instagram: "prefeiturasmm",
  },
];

export const patrocinadoresDaCota = (cota: CotaPatrocinio) =>
  PATROCINADORES.filter((patrocinador) => patrocinador.cota === cota);

export const linkInstagram = (handle: string) =>
  `https://instagram.com/${handle.replace(/^@/, "")}`;

export const linkWhatsapp = (numero: string, texto?: string) => {
  const digitos = numero.replace(/\D/g, "");
  return texto
    ? `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/${digitos}`;
};
