import type { Distancia } from "./config";

export type StatusPagamento = "pendente" | "pago" | "cancelado";

export type Inscricao = {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
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
  kit_token: string | null;
  kit_retirado_em: string | null;
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
  dataNascimento: string;
  sexo: string;
  tamanhoCamiseta: string;
  equipe?: string;
  distancia: Distancia;
  cupom?: string;
};

export type Cupom = {
  id: number;
  codigo: string;
  desconto: number;
  validade: string | null;
  ativo: number;
  criado_em: string;
};
