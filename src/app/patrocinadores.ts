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
export const PATROCINADORES: Patrocinador[] = [
  {
    id: "christian",
    cota: "master",
    nome: "Loja Christian",
    nomeCurto: "Christian",
    descricao:
      "Na Avenida Rodoviária, 97, ao lado da Loja do Pedreiro, em Alto Alegre do Maranhão.",
    logo: "/patrocinadores/christian.png",
    placa: "clara",
    instagram: "lojaschristian",
    endereco:
      "https://www.google.com/maps/search/?api=1&query=Avenida%20Rodovi%C3%A1ria%2C%2097%2C%20Alto%20Alegre%20do%20Maranh%C3%A3o%20-%20MA",
  },
  {
    id: "sos",
    cota: "master",
    nome: "SOS Chinelos e Calçados",
    nomeCurto: "SOS",
    descricao:
      "Chinelos e calçados em duas lojas no centro: Praça do Mercado, 19, e Avenida Antônio Pereira Aragão, 1.480.",
    logo: "/patrocinadores/sos.png",
    placa: "clara",
    instagram: "soschinelos",
    endereco:
      "https://www.google.com/maps/search/?api=1&query=Pra%C3%A7a%20do%20Mercado%2C%2019%2C%20Centro%2C%20S%C3%A3o%20Mateus%20do%20Maranh%C3%A3o%20-%20MA",
  },
  {
    id: "casadasvariedades",
    cota: "master",
    nome: "Casa das Variedades",
    nomeCurto: "Casa das Variedades",
    descricao:
      "Na Avenida Antônio Pereira Aragão, 1.788, no centro de São Mateus do Maranhão.",
    logo: "/patrocinadores/casa-das-variedades.jpg",
    placa: "clara",
    instagram: "casadasviredades",
    endereco:
      "https://www.google.com/maps/search/?api=1&query=Avenida%20Ant%C3%B4nio%20Pereira%20Arag%C3%A3o%2C%201788%2C%20S%C3%A3o%20Mateus%20do%20Maranh%C3%A3o%20-%20MA",
  },
  {
    id: "lupo",
    cota: "master",
    nome: "Lojazul Lupo",
    nomeCurto: "Lupo",
    descricao:
      "Na Avenida Antônio Pereira Aragão, 960, em São Mateus do Maranhão.",
    logo: "/patrocinadores/lupo.png",
    placa: "escura",
    instagram: "luposaomateus",
    endereco:
      "https://www.google.com/maps/search/?api=1&query=Avenida%20Ant%C3%B4nio%20Pereira%20Arag%C3%A3o%2C%20960%2C%20S%C3%A3o%20Mateus%20do%20Maranh%C3%A3o%20-%20MA",
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
