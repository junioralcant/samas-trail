// Os stubs de test/stubs sao carregados pelo hook de resolucao (test/setup.mjs)
// no lugar de "next/headers" e "mercadopago". Como o teste nao importa esses
// arquivos diretamente, o controle deles passa por globalThis.

type PagamentoMp = {
  id?: string | number;
  status?: string;
  external_reference?: string;
};

type ControleMp = {
  /** Credenciais recebidas por cada MercadoPagoConfig construido. */
  configs: { accessToken?: string }[];
  /** Historico de chamadas ao SDK, na ordem. */
  chamadas: { metodo: string; args: unknown }[];
  preferenceCreate: (
    args: unknown,
  ) => Promise<{ id?: string; init_point?: string }>;
  paymentSearch: (args: unknown) => Promise<{ results?: PagamentoMp[] }>;
  paymentGet: (args: unknown) => Promise<PagamentoMp>;
};

declare global {
  /** Cookies vistos por `cookies()` de next/headers. */
  var __testeCookies: Map<string, string>;
  var __testeMp: ControleMp;
}

export {};
