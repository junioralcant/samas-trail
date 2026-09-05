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
// Vazio esconde a secao inteira na home.
export const PATROCINADORES: Patrocinador[] = [];

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
