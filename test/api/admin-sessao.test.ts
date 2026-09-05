import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { SESSION_COOKIE, buildSessionToken } from "@/lib/auth";
import { pedido } from "../helpers";

const URL_LOGIN = "http://localhost:3000/api/admin/login";
const AMBIENTE = { ...process.env };

// NODE_ENV e somente leitura nos tipos do Node, mas o valor e lido em runtime.
const definirNodeEnv = (valor: string) => {
  (process.env as Record<string, string | undefined>).NODE_ENV = valor;
};

afterEach(() => {
  process.env = { ...AMBIENTE };
});

describe("POST /api/admin/login", () => {
  it("abre a sessao com a senha certa", async () => {
    const resposta = await login(
      pedido(URL_LOGIN, { body: { senha: process.env.ADMIN_PASSWORD } }),
    );

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { ok: true });

    const cookie = resposta.cookies.get(SESSION_COOKIE);
    assert.equal(cookie?.value, buildSessionToken());
    assert.equal(cookie?.httpOnly, true);
    assert.equal(cookie?.sameSite, "lax");
    assert.equal(cookie?.path, "/");
    assert.equal(cookie?.maxAge, 60 * 60 * 24 * 7);
  });

  it("marca o cookie como Secure em producao", async () => {
    definirNodeEnv("production");
    const resposta = await login(
      pedido(URL_LOGIN, { body: { senha: process.env.ADMIN_PASSWORD } }),
    );
    assert.equal(resposta.cookies.get(SESSION_COOKIE)?.secure, true);
  });

  it("nao marca Secure fora de producao", async () => {
    definirNodeEnv("development");
    const resposta = await login(
      pedido(URL_LOGIN, { body: { senha: process.env.ADMIN_PASSWORD } }),
    );
    assert.equal(resposta.cookies.get(SESSION_COOKIE)?.secure, false);
  });

  it("recusa senha errada", async () => {
    const resposta = await login(
      pedido(URL_LOGIN, { body: { senha: "chute" } }),
    );

    assert.equal(resposta.status, 401);
    assert.deepEqual(await resposta.json(), { erro: "Senha incorreta" });
    assert.equal(resposta.cookies.get(SESSION_COOKIE), undefined);
  });

  it("recusa corpo que nao e JSON", async () => {
    const resposta = await login(pedido(URL_LOGIN, { body: "senha=123" }));
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: "Dados inválidos" });
  });

  // Sem senha no ambiente ninguem entra, nem mandando senha vazia.
  it("recusa login quando o ambiente nao tem senha de admin", async () => {
    delete process.env.ADMIN_PASSWORD;
    const resposta = await login(pedido(URL_LOGIN, { body: { senha: "" } }));
    assert.equal(resposta.status, 401);
  });
});

describe("POST /api/admin/logout", () => {
  it("apaga o cookie da sessao", async () => {
    const resposta = await logout();

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { ok: true });

    const cookie = resposta.cookies.get(SESSION_COOKIE);
    assert.equal(cookie?.value, "");
    assert.equal(cookie?.maxAge, 0);
    assert.equal(cookie?.path, "/");
  });
});
