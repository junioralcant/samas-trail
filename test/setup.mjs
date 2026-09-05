// Carregado com --import antes de qualquer teste (ver script "test" no
// package.json). Faz tres coisas que o runner do Node nao faz sozinho:
//
//   1. resolve o alias "@/..." e imports sem extensao (o TS permite, o Node nao);
//   2. troca pacotes que fariam rede ou dependeriam do runtime do Next por
//      stubs locais controlaveis pelo teste;
//   3. isola o banco: cada processo de teste ganha um SQLite proprio em tmp,
//      nunca o data/corrida.db do projeto.
import { registerHooks } from "node:module";
import { existsSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const STUBS = join(RAIZ, "test", "stubs");

// "next/server" nao tem campo exports no package.json do Next 16, entao o
// Node ESM exige o caminho com extensao.
const PACOTES = {
  "next/server": "next/server.js",
  "next/headers": pathToFileURL(join(STUBS, "next-headers.mjs")).href,
  mercadopago: pathToFileURL(join(STUBS, "mercadopago.mjs")).href,
};

const SUFIXOS = [".ts", ".tsx", ".mts", ".js", "/index.ts"];

const arquivo = (caminho) =>
  existsSync(caminho) && statSync(caminho).isFile() ? caminho : null;

const comExtensao = (base) => {
  const direto = arquivo(base);
  if (direto) {
    return direto;
  }
  for (const sufixo of SUFIXOS) {
    const alvo = arquivo(base + sufixo);
    if (alvo) {
      return alvo;
    }
  }
  return null;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (PACOTES[specifier]) {
      return nextResolve(PACOTES[specifier], context);
    }

    // "@/lib/db.ts?v=2" reexecuta o modulo com um cache-buster: a query fica
    // de fora da busca em disco e volta na URL final.
    const [caminho, query] = specifier.split("?");
    let base = null;
    if (caminho.startsWith("@/")) {
      base = resolvePath(RAIZ, "src", caminho.slice(2));
    } else if (
      caminho.startsWith(".") &&
      context.parentURL?.startsWith("file:")
    ) {
      // Só código do projeto: dentro de node_modules o require do CJS quebra
      // se receber de volta uma URL file://.
      const pai = fileURLToPath(context.parentURL);
      if (!pai.includes("node_modules")) {
        base = resolvePath(dirname(pai), caminho);
      }
    }

    const alvo = base && comExtensao(base);
    if (!alvo) {
      return nextResolve(specifier, context);
    }
    const url = pathToFileURL(alvo).href + (query ? `?${query}` : "");
    return nextResolve(url, context);
  },
});

// Estado que os stubs leem e o teste controla (ver test/globais.d.ts).
globalThis.__testeCookies = new Map();
globalThis.__testeMp = {
  configs: [],
  chamadas: [],
  preferenceCreate: async () => ({
    id: "pref-teste",
    init_point: "https://mp.test/checkout/pref-teste",
  }),
  paymentSearch: async () => ({ results: [] }),
  paymentGet: async () => ({}),
};

// Banco proprio por processo de teste: o singleton do db.ts le esta variavel
// na primeira chamada de getDb().
process.env.DATABASE_PATH = join(
  mkdtempSync(join(tmpdir(), "corrida-teste-")),
  "corrida.db",
);

process.env.ADMIN_PASSWORD = "senha-de-teste";
process.env.EVENT_NAME = "SAMAS TRAIL";
process.env.APP_URL = "http://localhost:3000";
process.env.PRECO_8KM = "130.00";
process.env.PRECO_18KM = "160.00";
process.env.NEXT_PUBLIC_LOTE_ATUAL = "2º lote";
process.env.NEXT_PUBLIC_EVENT_DATE = "22 de novembro de 2026";
process.env.NEXT_PUBLIC_EVENT_LOCATION =
  "Povoado Água Preta — São Mateus do Maranhão/MA";
process.env.MP_ACCESS_TOKEN = "TEST-token-de-teste";
// Sem chave o enviarEmail sai por cima sem tocar na rede; quem testa envio
// define a chave e troca o fetch global.
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
delete process.env.EMAIL_REPLY_TO;
