// Utilidades compartilhadas pelos testes: banco limpo, fixtures de inscricao
// e cupom, sessao de admin e atalhos para montar Request/params de rota.
import { buildSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { gerarKitToken, getDb } from "@/lib/db";
import type { Cupom, Inscricao } from "@/lib/types";

export const limparBanco = () => {
  const db = getDb();
  db.exec("DELETE FROM inscricoes");
  db.exec("DELETE FROM cupons");
  db.exec("DELETE FROM sqlite_sequence");
  globalThis.__testeMp.configs = [];
  globalThis.__testeMp.chamadas = [];
  return db;
};

const INSCRICAO_PADRAO = {
  nome: "Atleta Teste",
  cpf: "52998224725",
  email: "atleta@teste.com",
  telefone: "(98) 99999-0000",
  cidade: "São Mateus do Maranhão",
  data_nascimento: "1990-05-10",
  sexo: "masculino",
  tamanho_camiseta: "M",
  equipe: null as string | null,
  distancia: "8km",
  valor: 130,
  cupom_codigo: null as string | null,
  desconto: 0,
  lote: "2º lote" as string | null,
  status_pagamento: "pendente",
  mp_payment_id: null as string | null,
  kit_token: undefined as string | null | undefined,
  termo_aceito_em: "2026-09-05 10:30:00" as string | null,
  termo_versao: "2026.1" as string | null,
};

/** Insere uma inscricao (os campos passados sobrescrevem o padrao). */
export const inserirInscricao = (
  campos: Partial<typeof INSCRICAO_PADRAO> = {},
): Inscricao => {
  const dados = { ...INSCRICAO_PADRAO, ...campos };
  const kitToken =
    "kit_token" in campos ? (campos.kit_token ?? null) : gerarKitToken();
  const resultado = getDb()
    .prepare(
      `INSERT INTO inscricoes
        (nome, cpf, email, telefone, cidade, data_nascimento, sexo,
         tamanho_camiseta, equipe, distancia, valor, cupom_codigo, desconto,
         lote, status_pagamento, mp_payment_id, kit_token, termo_aceito_em,
         termo_versao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      dados.nome,
      dados.cpf,
      dados.email,
      dados.telefone,
      dados.cidade,
      dados.data_nascimento,
      dados.sexo,
      dados.tamanho_camiseta,
      dados.equipe,
      dados.distancia,
      dados.valor,
      dados.cupom_codigo,
      dados.desconto,
      dados.lote,
      dados.status_pagamento,
      dados.mp_payment_id,
      kitToken,
      dados.termo_aceito_em,
      dados.termo_versao,
    );
  return buscarInscricao(Number(resultado.lastInsertRowid)) as Inscricao;
};

export const contarInscricoes = (): number =>
  (
    getDb()
      .prepare("SELECT COUNT(*) AS total FROM inscricoes")
      .get() as unknown as { total: number }
  ).total;

export const ultimaInscricao = (): Inscricao | undefined =>
  getDb()
    .prepare("SELECT * FROM inscricoes ORDER BY id DESC LIMIT 1")
    .get() as unknown as Inscricao | undefined;

export const buscarInscricao = (id: number): Inscricao | undefined =>
  getDb()
    .prepare("SELECT * FROM inscricoes WHERE id = ?")
    .get(id) as unknown as Inscricao | undefined;

export const inserirCupom = ({
  codigo = "TRILHA10",
  desconto = 10,
  validade = null as string | null,
  ativo = 1,
} = {}): Cupom => {
  const db = getDb();
  const resultado = db
    .prepare(
      "INSERT INTO cupons (codigo, desconto, validade, ativo) VALUES (?, ?, ?, ?)",
    )
    .run(codigo, desconto, validade, ativo);
  return db
    .prepare("SELECT * FROM cupons WHERE id = ?")
    .get(Number(resultado.lastInsertRowid)) as unknown as Cupom;
};

export const definirCriadoEm = (id: number, quando: string) =>
  getDb()
    .prepare("UPDATE inscricoes SET criado_em = ? WHERE id = ?")
    .run(quando, id);

export const marcarKitRetirado = (
  id: number,
  quando = "2026-11-22 07:00:00",
) =>
  getDb()
    .prepare("UPDATE inscricoes SET kit_retirado_em = ? WHERE id = ?")
    .run(quando, id);

export const logarComoAdmin = () => {
  globalThis.__testeCookies.set(SESSION_COOKIE, buildSessionToken());
};

export const sairDoAdmin = () => {
  globalThis.__testeCookies.clear();
};

type OpcoesPedido = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

/** Request com corpo JSON (sem corpo quando `body` e omitido). */
export const pedido = (url: string, opcoes: OpcoesPedido = {}) =>
  new Request(url, {
    method: opcoes.method ?? "POST",
    headers: {
      ...(opcoes.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...opcoes.headers,
    },
    ...(opcoes.body === undefined
      ? {}
      : {
          body:
            typeof opcoes.body === "string"
              ? opcoes.body
              : JSON.stringify(opcoes.body),
        }),
  });

/** Segundo argumento das rotas dinamicas: no Next 16 params e uma Promise. */
export const ctx = <T extends Record<string, string>>(params: T) => ({
  params: Promise.resolve(params),
});

type RespostaFetch = Response | ((url: unknown, init: unknown) => Response);

/** Troca o fetch global; devolve as chamadas feitas e como restaurar. */
export const espionarFetch = (resposta: RespostaFetch) => {
  const original = globalThis.fetch;
  const chamadas: { url: unknown; opcoes: unknown }[] = [];
  globalThis.fetch = (async (url: unknown, opcoes: unknown) => {
    chamadas.push({ url, opcoes });
    return typeof resposta === "function" ? resposta(url, opcoes) : resposta;
  }) as typeof globalThis.fetch;
  return {
    chamadas,
    restaurar: () => {
      globalThis.fetch = original;
    },
  };
};

/** Silencia console.error durante o teste e devolve o que foi registrado. */
export const silenciarErros = () => {
  const original = console.error;
  const registros: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    registros.push(args);
  };
  return {
    registros,
    restaurar: () => {
      console.error = original;
    },
  };
};
