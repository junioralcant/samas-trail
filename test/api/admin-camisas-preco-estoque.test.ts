import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  GET as GET_PRECO,
  PATCH as PATCH_PRECO,
} from "@/app/api/admin/camisas/preco/route";
import {
  GET as GET_ESTOQUE,
  PATCH as PATCH_ESTOQUE,
} from "@/app/api/admin/camisas/estoque/route";
import {
  inserirPedidoCamisa,
  limparBanco,
  logarComoAdmin,
  pedido,
  sairDoAdmin,
} from "../helpers";

const URL_PRECO = "http://localhost:3000/api/admin/camisas/preco";
const URL_ESTOQUE = "http://localhost:3000/api/admin/camisas/estoque";

const AMBIENTE = { ...process.env };

const salvarPreco = (body: unknown) =>
  PATCH_PRECO(pedido(URL_PRECO, { method: "PATCH", body }));

const salvarEstoque = (body: unknown) =>
  PATCH_ESTOQUE(pedido(URL_ESTOQUE, { method: "PATCH", body }));

beforeEach(() => {
  limparBanco();
  logarComoAdmin();
  delete process.env.PRECO_CAMISA;
  delete process.env.PRECO_CAMISA_PROMO;
});

afterEach(() => {
  sairDoAdmin();
  process.env = { ...AMBIENTE };
});

describe("preço da camisa no painel", () => {
  it("exige login nos dois métodos", async () => {
    sairDoAdmin();
    assert.equal((await GET_PRECO()).status, 401);
    assert.equal((await salvarPreco({ precoCheio: "45" })).status, 401);
  });

  it("le o preco atual", async () => {
    const corpo = (await (await GET_PRECO()).json()) as {
      preco: { precoCheio: number; precoAtual: number };
    };
    assert.equal(corpo.preco.precoCheio, 45);
    assert.equal(corpo.preco.precoAtual, 20);
  });

  it("recusa corpo que nao e JSON", async () => {
    const resposta = await salvarPreco("nao-e-json");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  it("aceita virgula como separador decimal", async () => {
    const resposta = await salvarPreco({
      precoCheio: "50,00",
      precoPromo: "25,50",
    });
    const corpo = (await resposta.json()) as {
      preco: { precoCheio: number; precoPromo: number };
    };
    assert.equal(corpo.preco.precoCheio, 50);
    assert.equal(corpo.preco.precoPromo, 25.5);
  });

  // Esvaziar o campo e como se desliga a promocao no painel.
  it("promocional vazio desliga a promocao", async () => {
    const resposta = await salvarPreco({ precoCheio: "45", precoPromo: "" });
    const corpo = (await resposta.json()) as {
      preco: { emPromocao: boolean; precoAtual: number };
    };
    assert.equal(corpo.preco.emPromocao, false);
    assert.equal(corpo.preco.precoAtual, 45);
  });

  it("recusa preco cheio invalido ou abaixo do minimo do Mercado Pago", async () => {
    for (const precoCheio of ["", "abc", "0", "-5", "0,50"]) {
      const resposta = await salvarPreco({ precoCheio });
      assert.equal(resposta.status, 400, `deveria recusar ${precoCheio}`);
    }
  });

  it("recusa promocional abaixo do minimo", async () => {
    const resposta = await salvarPreco({
      precoCheio: "45",
      precoPromo: "0,50",
    });
    assert.equal(resposta.status, 400);
  });

  // "De R$ 45 por R$ 50" nao e promocao.
  it("recusa promocional maior ou igual ao cheio", async () => {
    for (const precoPromo of ["45", "80"]) {
      const resposta = await salvarPreco({ precoCheio: "45", precoPromo });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), {
        erro: "O preço promocional precisa ser menor que o preço cheio",
      });
    }
  });
});

describe("estoque da camisa no painel", () => {
  it("exige login nos dois métodos", async () => {
    sairDoAdmin();
    assert.equal((await GET_ESTOQUE()).status, 401);
    assert.equal((await salvarEstoque({ totais: { M: 1 } })).status, 401);
  });

  it("le o quadro completo na ordem da grade", async () => {
    const corpo = (await (await GET_ESTOQUE()).json()) as {
      estoque: { tamanho: string }[];
    };
    assert.deepEqual(
      corpo.estoque.map((l) => l.tamanho),
      ["P", "M", "G", "GG", "XG"],
    );
  });

  it("recusa corpo que nao e JSON", async () => {
    const resposta = await salvarEstoque("nao-e-json");
    assert.equal(resposta.status, 400);
  });

  it("recusa quando nao veio nenhum tamanho conhecido", async () => {
    for (const totais of [undefined, {}, { PP: 5 }]) {
      const resposta = await salvarEstoque({ totais });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), { erro: "Nada para salvar" });
    }
  });

  it("recusa total quebrado ou negativo", async () => {
    for (const total of [1.5, -1, "muitas"]) {
      const resposta = await salvarEstoque({ totais: { M: total } });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), {
        erro: "Total inválido para o tamanho M",
      });
    }
  });

  it("salva os totais informados sem mexer nos outros", async () => {
    const resposta = await salvarEstoque({ totais: { M: 40, XG: 3 } });
    const corpo = (await resposta.json()) as {
      estoque: { tamanho: string; total: number }[];
    };
    const porTamanho = Object.fromEntries(
      corpo.estoque.map((l) => [l.tamanho, l.total]),
    );
    assert.equal(porTamanho.M, 40);
    assert.equal(porTamanho.XG, 3);
    assert.equal(porTamanho.G, 16);
  });

  // Total abaixo do vendido tornaria o disponivel negativo e o site
  // passaria a vender peca que nao existe.
  it("recusa total abaixo do que ja foi vendido", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "G", quantidade: 11 },
    ]);

    const resposta = await salvarEstoque({ totais: { G: 8 } });

    assert.equal(resposta.status, 409);
    const corpo = (await resposta.json()) as { erro: string; tamanho: string };
    assert.equal(corpo.tamanho, "G");
    assert.match(corpo.erro, /11 peças G já foram vendidas/);
    assert.match(corpo.erro, /não pode ficar abaixo de 11/);
  });

  it("conta a reserva viva no minimo permitido", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "G", quantidade: 2 },
    ]);
    inserirPedidoCamisa({ status_pagamento: "pendente" }, [
      { tamanho: "G", quantidade: 3 },
    ]);

    const recusado = await salvarEstoque({ totais: { G: 4 } });
    assert.equal(recusado.status, 409);
    assert.match(
      ((await recusado.json()) as { erro: string }).erro,
      /abaixo de 5/,
    );

    assert.equal((await salvarEstoque({ totais: { G: 5 } })).status, 200);
  });

  it("aceita baixar o total ate exatamente o que ja saiu", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "M", quantidade: 4 },
    ]);
    const resposta = await salvarEstoque({ totais: { M: 4 } });
    assert.equal(resposta.status, 200);
  });
});

describe("preço — promocional ausente no corpo", () => {
  it("trata campo ausente como promocao desligada", async () => {
    const resposta = await salvarPreco({ precoCheio: "45" });
    const corpo = (await resposta.json()) as {
      preco: { emPromocao: boolean; precoAtual: number };
    };
    assert.equal(resposta.status, 200);
    assert.equal(corpo.preco.emPromocao, false);
    assert.equal(corpo.preco.precoAtual, 45);
  });
});
