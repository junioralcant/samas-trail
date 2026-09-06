import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { CHAVE_CAMISA_RESERVA_MINUTOS, gravarConfiguracao } from "@/lib/configuracoes";
import { getDb } from "@/lib/db";
import {
  calcularReservadoAte,
  disponibilidade,
  gravarItens,
  itensDoPedido,
  limitePorTamanho,
  quadroEstoque,
  resumirItens,
  verificarDisponibilidade,
} from "@/lib/estoque";
import {
  definirEstoque,
  inserirPedidoCamisa,
  limparBanco,
  vencerReserva,
} from "../helpers";

beforeEach(() => {
  limparBanco();
});

describe("quadroEstoque", () => {
  it("comeca com a sobra da producao, na ordem da grade", () => {
    assert.deepEqual(
      quadroEstoque().map((l) => [l.tamanho, l.total, l.disponivel]),
      [
        ["P", 0, 0],
        ["M", 33, 33],
        ["G", 16, 16],
        ["GG", 4, 4],
        ["XG", 1, 1],
      ],
    );
  });

  it("separa vendidas de reservadas", () => {
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "M", quantidade: 2 },
    ]);
    inserirPedidoCamisa({ status_pagamento: "pendente" }, [
      { tamanho: "M", quantidade: 3 },
    ]);
    const m = quadroEstoque().find((l) => l.tamanho === "M");
    assert.equal(m?.vendidas, 2);
    assert.equal(m?.reservadas, 3);
    assert.equal(m?.disponivel, 28);
  });

  // O painel precisa enxergar o buraco para poder resolver.
  it("mostra disponivel negativo quando o estoque estoura", () => {
    definirEstoque("XG", 1);
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "XG", quantidade: 1 },
    ]);
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "XG", quantidade: 1 },
    ]);
    assert.equal(quadroEstoque().find((l) => l.tamanho === "XG")?.disponivel, -1);
  });
});

describe("disponibilidade", () => {
  it("pendente com reserva viva segura a peca", () => {
    inserirPedidoCamisa({ status_pagamento: "pendente" }, [
      { tamanho: "XG", quantidade: 1 },
    ]);
    assert.equal(disponibilidade().XG, 0);
  });

  // A reserva vencida devolve a peca sozinha: e so uma clausula WHERE,
  // sem cron nem faxina.
  it("reserva vencida devolve a peca", () => {
    const pedido = inserirPedidoCamisa({ status_pagamento: "pendente" }, [
      { tamanho: "XG", quantidade: 1 },
    ]);
    vencerReserva(pedido.id);
    assert.equal(disponibilidade().XG, 1);
  });

  it("pedido pago segura para sempre, mesmo com a reserva vencida", () => {
    const pedido = inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "XG", quantidade: 1 },
    ]);
    vencerReserva(pedido.id);
    assert.equal(disponibilidade().XG, 0);
  });

  it("pedido cancelado devolve a peca na hora", () => {
    inserirPedidoCamisa({ status_pagamento: "cancelado" }, [
      { tamanho: "XG", quantidade: 1 },
    ]);
    assert.equal(disponibilidade().XG, 1);
  });

  it("nunca devolve negativo", () => {
    definirEstoque("GG", 1);
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "GG", quantidade: 1 },
    ]);
    inserirPedidoCamisa({ status_pagamento: "pago" }, [
      { tamanho: "GG", quantidade: 1 },
    ]);
    assert.equal(disponibilidade().GG, 0);
  });

  it("excluir o pedido devolve os itens junto", () => {
    const pedido = inserirPedidoCamisa({}, [{ tamanho: "XG", quantidade: 1 }]);
    getDb().prepare("DELETE FROM pedidos_camisa WHERE id = ?").run(pedido.id);
    assert.equal(disponibilidade().XG, 1);
    assert.equal(itensDoPedido(pedido.id).length, 0);
  });
});

describe("limitePorTamanho", () => {
  it("limita pelo teto do pedido quando ha estoque de sobra", () => {
    assert.equal(limitePorTamanho(disponibilidade()).M, 5);
  });

  it("limita pelo estoque quando ele e menor que o teto", () => {
    const limite = limitePorTamanho(disponibilidade());
    assert.equal(limite.XG, 1);
    assert.equal(limite.GG, 4);
    assert.equal(limite.P, 0);
  });

  it("trata tamanho sem linha de estoque como zerado", () => {
    assert.equal(limitePorTamanho({}).M, 0);
  });
});

describe("verificarDisponibilidade", () => {
  it("nao acusa falta quando cabe", () => {
    assert.deepEqual(
      verificarDisponibilidade([{ tamanho: "M", quantidade: 5 }]),
      [],
    );
  });

  it("acusa o tamanho zerado", () => {
    assert.deepEqual(verificarDisponibilidade([{ tamanho: "P", quantidade: 1 }]), [
      { tamanho: "P", pedido: 1, disponivel: 0 },
    ]);
  });

  it("aceita 1 XG e recusa 2", () => {
    assert.deepEqual(
      verificarDisponibilidade([{ tamanho: "XG", quantidade: 1 }]),
      [],
    );
    assert.deepEqual(
      verificarDisponibilidade([{ tamanho: "XG", quantidade: 2 }]),
      [{ tamanho: "XG", pedido: 2, disponivel: 1 }],
    );
  });

  it("acusa so os tamanhos que faltam", () => {
    const faltas = verificarDisponibilidade([
      { tamanho: "M", quantidade: 1 },
      { tamanho: "P", quantidade: 1 },
      { tamanho: "XG", quantidade: 3 },
    ]);
    assert.deepEqual(
      faltas.map((f) => f.tamanho),
      ["P", "XG"],
    );
  });
});

describe("gravarItens e itensDoPedido", () => {
  it("grava e le os itens de volta", () => {
    const pedido = inserirPedidoCamisa({}, [{ tamanho: "M", quantidade: 1 }]);
    getDb().prepare("DELETE FROM itens_camisa WHERE pedido_id = ?").run(pedido.id);
    gravarItens(pedido.id, [
      { tamanho: "G", quantidade: 2 },
      { tamanho: "GG", quantidade: 1 },
    ]);
    assert.deepEqual(
      itensDoPedido(pedido.id).map((i) => [i.tamanho, i.quantidade]),
      [
        ["G", 2],
        ["GG", 1],
      ],
    );
  });
});

describe("resumirItens", () => {
  it("monta o resumo na ordem da grade", () => {
    assert.equal(
      resumirItens([
        { tamanho: "GG", quantidade: 1 },
        { tamanho: "M", quantidade: 2 },
      ]),
      "2× M, 1× GG",
    );
  });

  it("devolve vazio sem itens", () => {
    assert.equal(resumirItens([]), "");
  });
});

describe("calcularReservadoAte", () => {
  it("marca a reserva no futuro", () => {
    const agora = getDb()
      .prepare("SELECT datetime('now', 'localtime') AS agora")
      .get() as unknown as { agora: string };
    assert.ok(calcularReservadoAte() > agora.agora);
  });

  it("respeita os minutos configurados no painel", () => {
    gravarConfiguracao(CHAVE_CAMISA_RESERVA_MINUTOS, "1");
    const curta = calcularReservadoAte();
    gravarConfiguracao(CHAVE_CAMISA_RESERVA_MINUTOS, "600");
    assert.ok(calcularReservadoAte() > curta);
  });
});
