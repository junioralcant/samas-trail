export type ItemKit = {
  id: string;
  imagem: string;
  alt: string;
  nome: string;
  descricao: string;
  classeFoto: string;
  badge?: { texto: string; contorno?: boolean };
};

export const ITENS_KIT: ItemKit[] = [
  {
    id: "camiseta",
    imagem: "/kit/camiseta.jpeg",
    alt: "Camiseta oficial SAMAS TRAIL",
    nome: "Camiseta oficial",
    descricao:
      "Camiseta oficial do evento, em tecido esportivo, com mangas exclusivas.",
    classeFoto: "kit-foto-camiseta",
    badge: { texto: "Incluso" },
  },
  {
    id: "medalha",
    imagem: "/kit/medalha.jpeg",
    alt: "Medalha de finisher SAMAS TRAIL",
    nome: "Medalha de finisher",
    descricao:
      "Medalha exclusiva SAMAS TRAIL para quem cruza a linha de chegada.",
    classeFoto: "kit-foto-medalha",
  },
  {
    id: "pulseira",
    imagem: "/kit/pulseira.jpeg",
    alt: "Pulseira exclusiva SAMAS TRAIL 2026",
    nome: "Pulseira exclusiva",
    descricao: "Pulseira colecionável da edição 2026.",
    classeFoto: "kit-foto-pulseira",
    badge: { texto: "Edição 2026", contorno: true },
  },
];
