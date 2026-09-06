import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/admin/inscricoes/route";
import type { Inscricao } from "@/lib/types";
import {
  definirCriadoEm,
  inserirInscricao,
  inserirPedidoCamisa,
  limparBanco,
  logarComoAdmin,
  marcarKitRetirado,
  pedido,
  sairDoAdmin,
} from "../helpers";

const URL_ROTA = "http://localhost:3000/api/admin/inscricoes";

type Resposta = {
  inscricoes: Inscricao[];
  stats: Record<string, number>;
};

const listar = async (query = "") => {
  const resposta = await GET(
    pedido(`${URL_ROTA}${query}`, { method: "GET" }),
  );
  return { resposta, corpo: (await resposta.json()) as Resposta };
};

const menorDeIdade = () => {
  const data = new Date();
  data.setFullYear(data.getFullYear() - 15);
  return data.toLocaleDateString("en-CA");
};

beforeEach(() => {
  limparBanco();
  logarComoAdmin();
});

describe("GET /api/admin/inscricoes", () => {
  it("exige sessao de admin", async () => {
    sairDoAdmin();
    const { resposta, corpo } = await listar();
    assert.equal(resposta.status, 401);
    assert.deepEqual(corpo, { erro: "Não autorizado" });
  });

  it("lista as inscricoes da mais recente para a mais antiga", async () => {
    // criado_em tem resolucao de segundos: sem datas distintas duas
    // inscricoes do mesmo segundo empatam e a ordem fica a criterio do SQLite.
    const primeira = inserirInscricao({ nome: "Primeira", cpf: "52998224725" });
    const segunda = inserirInscricao({ nome: "Segunda", cpf: "00000000604" });
    definirCriadoEm(primeira.id, "2026-09-01 08:00:00");
    definirCriadoEm(segunda.id, "2026-09-02 08:00:00");

    const { corpo } = await listar();

    assert.deepEqual(
      corpo.inscricoes.map((i) => i.nome),
      ["Segunda", "Primeira"],
    );
  });

  it("filtra por distancia", async () => {
    inserirInscricao({ distancia: "8km", cpf: "52998224725" });
    inserirInscricao({ distancia: "18km", cpf: "00000000604" });

    const { corpo } = await listar("?distancia=18km");

    assert.equal(corpo.inscricoes.length, 1);
    assert.equal(corpo.inscricoes[0].distancia, "18km");
  });

  it("filtra por status de pagamento", async () => {
    inserirInscricao({ status_pagamento: "pago", cpf: "52998224725" });
    inserirInscricao({ status_pagamento: "pendente", cpf: "00000000604" });

    const { corpo } = await listar("?status=pago");

    assert.equal(corpo.inscricoes.length, 1);
    assert.equal(corpo.inscricoes[0].status_pagamento, "pago");
  });

  it("busca por nome, CPF ou e-mail", async () => {
    inserirInscricao({
      nome: "Maria Souza",
      cpf: "52998224725",
      email: "maria@teste.com",
    });
    inserirInscricao({
      nome: "Joao Lima",
      cpf: "00000000604",
      email: "joao@teste.com",
    });

    assert.equal((await listar("?busca=Souza")).corpo.inscricoes.length, 1);
    assert.equal((await listar("?busca=00000000604")).corpo.inscricoes.length, 1);
    assert.equal((await listar("?busca=joao@")).corpo.inscricoes.length, 1);
    assert.equal((await listar("?busca=teste.com")).corpo.inscricoes.length, 2);
  });

  it("combina os filtros", async () => {
    inserirInscricao({
      nome: "Maria Souza",
      distancia: "18km",
      status_pagamento: "pago",
      cpf: "52998224725",
    });
    inserirInscricao({
      nome: "Maria Lima",
      distancia: "18km",
      status_pagamento: "pendente",
      cpf: "00000000604",
    });

    const { corpo } = await listar("?distancia=18km&status=pago&busca=Maria");

    assert.equal(corpo.inscricoes.length, 1);
    assert.equal(corpo.inscricoes[0].nome, "Maria Souza");
  });

  it("resume os numeros do painel", async () => {
    inserirInscricao({
      distancia: "8km",
      status_pagamento: "pago",
      valor: 130,
      cpf: "52998224725",
    });
    inserirInscricao({
      distancia: "18km",
      status_pagamento: "pago",
      valor: 160,
      cpf: "00000000604",
      data_nascimento: menorDeIdade(),
    });
    inserirInscricao({
      distancia: "18km",
      status_pagamento: "pendente",
      valor: 160,
      cpf: "00000001830",
      termo_aceito_em: null,
    });
    inserirInscricao({
      distancia: "8km",
      status_pagamento: "cancelado",
      valor: 130,
      cpf: "00000002305",
    });

    const { corpo } = await listar();

    assert.equal(corpo.stats.total, 4);
    assert.equal(corpo.stats.total8km, 2);
    assert.equal(corpo.stats.total18km, 2);
    assert.equal(corpo.stats.pagos, 2);
    assert.equal(corpo.stats.pendentes, 1);
    // A receita conta so o que entrou.
    assert.equal(corpo.stats.receita, 290);
    assert.equal(corpo.stats.menoresDeIdade, 1);
    assert.equal(corpo.stats.semTermo, 1);
    assert.equal(corpo.stats.kitsRetirados, 0);
  });

  it("conta os kits ja retirados", async () => {
    const inscricao = inserirInscricao({ status_pagamento: "pago" });
    inserirInscricao({ status_pagamento: "pago", cpf: "00000000604" });
    marcarKitRetirado(inscricao.id);

    const { corpo } = await listar();

    assert.equal(corpo.stats.kitsRetirados, 1);
  });

  it("os numeros ignoram os filtros da listagem", async () => {
    inserirInscricao({ distancia: "8km", cpf: "52998224725" });
    inserirInscricao({ distancia: "18km", cpf: "00000000604" });

    const { corpo } = await listar("?distancia=8km");

    assert.equal(corpo.inscricoes.length, 1);
    assert.equal(corpo.stats.total, 2);
  });
});

describe("GET /api/admin/inscricoes — camisa extra vinculada", () => {
  const listar = async () => {
    const resposta = await GET(pedido(URL_ROTA, { method: "GET" }));
    return (await resposta.json()) as {
      inscricoes: (Inscricao & {
        camisas_extras: { tamanho: string; quantidade: number }[];
        camisas_extras_total: number;
        camisas_extras_resumo: string;
      })[];
      stats: { camisas: { pagas: number; receita: number; pecas: number } };
    };
  };

  beforeEach(() => {
    logarComoAdmin();
  });

  it("marca zero camisas quando o atleta nao comprou", async () => {
    inserirInscricao();
    const corpo = await listar();
    assert.equal(corpo.inscricoes[0].camisas_extras_total, 0);
    assert.equal(corpo.inscricoes[0].camisas_extras_resumo, "");
  });

  // O kit e a camisa saem na mesma entrega: quem confere na tenda precisa
  // ver isso na linha do atleta.
  it("mostra as camisas do atleta somadas por tamanho", async () => {
    const inscricao = inserirInscricao();
    inserirPedidoCamisa({ inscricao_id: inscricao.id, origem: "inscricao" }, [
      { tamanho: "M", quantidade: 2 },
      { tamanho: "G", quantidade: 1 },
    ]);

    const corpo = await listar();

    assert.equal(corpo.inscricoes[0].camisas_extras_total, 3);
    assert.equal(corpo.inscricoes[0].camisas_extras_resumo, "2× M, 1× G");
  });

  // Comprou avulso com o mesmo CPF: o vinculo tem de aparecer igual.
  it("soma tambem a camisa comprada avulsa e vinculada depois", async () => {
    const inscricao = inserirInscricao();
    inserirPedidoCamisa({ inscricao_id: inscricao.id, origem: "inscricao" }, [
      { tamanho: "M", quantidade: 1 },
    ]);
    inserirPedidoCamisa({ inscricao_id: inscricao.id, origem: "avulso" }, [
      { tamanho: "M", quantidade: 1 },
      { tamanho: "GG", quantidade: 1 },
    ]);

    const corpo = await listar();

    assert.equal(corpo.inscricoes[0].camisas_extras_total, 3);
    assert.equal(corpo.inscricoes[0].camisas_extras_resumo, "2× M, 1× GG");
  });

  it("ignora pedido cancelado", async () => {
    const inscricao = inserirInscricao();
    inserirPedidoCamisa({
      inscricao_id: inscricao.id,
      status_pagamento: "cancelado",
    });

    const corpo = await listar();

    assert.equal(corpo.inscricoes[0].camisas_extras_total, 0);
  });

  it("traz as estatisticas de camisa junto", async () => {
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "M", quantidade: 2 },
    ]);
    const corpo = await listar();
    assert.equal(corpo.stats.camisas.pagas, 2);
    assert.equal(corpo.stats.camisas.receita, 40);
    assert.equal(corpo.stats.camisas.pecas, 54);
  });
});
