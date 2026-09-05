// Stub de next/headers: fora do runtime do Next nao existe request em curso,
// entao o cookie da sessao vem do Map que o teste controla
// (globalThis.__testeCookies, criado em test/setup.mjs).
export const cookies = async () => ({
  get: (nome) =>
    globalThis.__testeCookies.has(nome)
      ? { name: nome, value: globalThis.__testeCookies.get(nome) }
      : undefined,
  set: (nome, valor) => globalThis.__testeCookies.set(nome, valor),
  delete: (nome) => globalThis.__testeCookies.delete(nome),
});
