import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  SESSION_COOKIE,
  buildSessionToken,
  isAdminAuthenticated,
} from "@/lib/auth";
import { logarComoAdmin, sairDoAdmin } from "../helpers";

const SENHA = process.env.ADMIN_PASSWORD;

beforeEach(() => {
  sairDoAdmin();
  process.env.ADMIN_PASSWORD = SENHA;
});

afterEach(() => {
  process.env.ADMIN_PASSWORD = SENHA;
});

describe("buildSessionToken", () => {
  it("deriva um hex estavel da senha do admin", () => {
    assert.match(buildSessionToken(), /^[0-9a-f]{64}$/);
    assert.equal(buildSessionToken(), buildSessionToken());
  });

  it("muda quando a senha muda", () => {
    const token = buildSessionToken();
    process.env.ADMIN_PASSWORD = "outra-senha";
    assert.notEqual(buildSessionToken(), token);
  });
});

describe("isAdminAuthenticated", () => {
  it("aceita o cookie com o token da senha atual", async () => {
    logarComoAdmin();
    assert.equal(await isAdminAuthenticated(), true);
  });

  it("recusa sem cookie", async () => {
    assert.equal(await isAdminAuthenticated(), false);
  });

  it("recusa cookie com valor errado", async () => {
    globalThis.__testeCookies.set(SESSION_COOKIE, "token-forjado");
    assert.equal(await isAdminAuthenticated(), false);
  });

  // Trocar a senha no ambiente invalida as sessoes que ja estavam abertas.
  it("recusa cookie emitido com a senha anterior", async () => {
    logarComoAdmin();
    process.env.ADMIN_PASSWORD = "senha-nova";
    assert.equal(await isAdminAuthenticated(), false);
  });

  // Sem senha configurada o painel fica fechado, nao aberto.
  it("recusa quando nao ha senha de admin no ambiente", async () => {
    logarComoAdmin();
    delete process.env.ADMIN_PASSWORD;
    assert.equal(await isAdminAuthenticated(), false);
  });
});
