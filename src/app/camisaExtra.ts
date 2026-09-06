import type { ItemKit } from "./itensKit";

// A camisa extra tem duas artes com patrocinadores diferentes em cada face:
// mostrar so a frente esconde metade do produto. O formato e o mesmo de
// ITENS_KIT para o VisualizadorKit servir as duas sem alteracao nenhuma.
export const CAMISA_EXTRA: ItemKit[] = [
  {
    id: "frente",
    imagem: "/camisa-extra/frente.jpeg",
    alt: "Frente da camisa extra SAMAS TRAIL, azul-royal",
    nome: "Frente",
    descricao: "Bruto Suplementos · ProjetAgro",
    classeFoto: "camisa-extra-foto",
  },
  {
    id: "costas",
    imagem: "/camisa-extra/costas.jpeg",
    alt: "Costas da camisa extra SAMAS TRAIL, com a frase Nascidos no asfalto e criados na trilha",
    nome: "Costas",
    descricao:
      "“Nascidos no asfalto e criados na trilha” · Andrey Lucas · FM Studio Nail Desing",
    classeFoto: "camisa-extra-foto",
  },
];

/** Uma frase por lugar, sempre a mesma — a peca nunca vira "camiseta". */
export const SEPARACAO_KIT = {
  home: "Peça nova, à venda — não é a camiseta que vem no kit.",
  formulario:
    "Camisa azul-royal, à parte. A camiseta do kit continua inclusa.",
  camisa:
    "Camisa comemorativa azul-royal. Produto avulso — não substitui nem repete a camiseta do kit.",
  pedido: "Camisa extra azul-royal · compra avulsa.",
};
