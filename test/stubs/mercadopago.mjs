// Stub do SDK do Mercado Pago. Nenhum teste pode sair para a rede: cada
// metodo delega para um handler de globalThis.__testeMp, que o teste
// sobrescreve para simular resposta ou falha.
export class MercadoPagoConfig {
  constructor(opcoes) {
    this.opcoes = opcoes;
    globalThis.__testeMp.configs.push(opcoes);
  }
}

export class Preference {
  constructor(client) {
    this.client = client;
  }

  async create(args) {
    globalThis.__testeMp.chamadas.push({ metodo: "preference.create", args });
    return globalThis.__testeMp.preferenceCreate(args);
  }
}

export class Payment {
  constructor(client) {
    this.client = client;
  }

  async search(args) {
    globalThis.__testeMp.chamadas.push({ metodo: "payment.search", args });
    return globalThis.__testeMp.paymentSearch(args);
  }

  async get(args) {
    globalThis.__testeMp.chamadas.push({ metodo: "payment.get", args });
    return globalThis.__testeMp.paymentGet(args);
  }
}
