import type { Distancia, TamanhoCamisaExtra } from "./config";

export type StatusPagamento = "pendente" | "pago" | "cancelado";

export type OrigemPedidoCamisa = "avulso" | "inscricao";

export type PedidoCamisa = {
  id: number;
  inscricao_id: number | null;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  origem: OrigemPedidoCamisa;
  quantidade: number;
  valor_unitario: number;
  valor: number;
  promocional: number;
  status_pagamento: StatusPagamento;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  token: string | null;
  reservado_ate: string | null;
  estoque_estourado: number;
  retirado_em: string | null;
  criado_em: string;
};

export type ItemCamisaPayload = {
  tamanho: TamanhoCamisaExtra;
  quantidade: number;
};

export type NovoPedidoCamisaPayload = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  tamanhos: ItemCamisaPayload[];
};

export type Inscricao = {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cidade: string | null;
  data_nascimento: string;
  sexo: string;
  tamanho_camiseta: string;
  equipe: string | null;
  distancia: Distancia;
  valor: number;
  status_pagamento: StatusPagamento;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  cupom_codigo: string | null;
  desconto: number;
  lote: string | null;
  kit_token: string | null;
  kit_retirado_em: string | null;
  termo_aceito_em: string | null;
  termo_versao: string | null;
  termo_ip: string | null;
  termo_user_agent: string | null;
  criado_em: string;
};

export type EnvioEmailParams = {
  para: string;
  assunto: string;
  html: string;
};

export type NovaInscricaoPayload = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cidade: string;
  dataNascimento: string;
  sexo: string;
  tamanhoCamiseta: string;
  equipe?: string;
  distancia: Distancia;
  cupom?: string;
  termoAceito?: boolean;
  camisasExtras?: ItemCamisaPayload[];
};

export type Cupom = {
  id: number;
  codigo: string;
  desconto: number;
  validade: string | null;
  ativo: number;
  criado_em: string;
};
