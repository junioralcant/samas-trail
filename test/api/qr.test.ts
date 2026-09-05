import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/qr/[token]/route";
import { ctx, inserirInscricao, limparBanco, pedido } from "../helpers";

const URL_ROTA = "http://localhost:3000/api/qr";

const baixar = (token: string) =>
  GET(pedido(`${URL_ROTA}/${token}`, { method: "GET" }), ctx({ token }));

beforeEach(() => {
  limparBanco();
});

describe("GET /api/qr/[token]", () => {
  it("gera o PNG do QR da inscricao", async () => {
    const inscricao = inserirInscricao();

    const resposta = await baixar(String(inscricao.kit_token));

    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get("Content-Type"), "image/png");
    assert.equal(
      resposta.headers.get("Cache-Control"),
      "public, max-age=86400",
    );

    const bytes = new Uint8Array(await resposta.arrayBuffer());
    assert.deepEqual(
      Array.from(bytes.slice(0, 8)),
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      "deve comecar com a assinatura de um PNG",
    );
  });

  it("recusa token fora do formato", async () => {
    const resposta = await baixar("token-invalido");
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "QR code inválido" });
  });

  it("responde 404 para token que nao existe", async () => {
    const resposta = await baixar("a".repeat(32));
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: "QR code inválido" });
  });
});
