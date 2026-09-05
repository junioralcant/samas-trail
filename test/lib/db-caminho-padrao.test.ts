// Sem DATABASE_PATH o banco cai em ./data/corrida.db, relativo ao diretorio
// de trabalho. O teste roda dentro de um tmp para nao encostar no banco de
// desenvolvimento do projeto.
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

const ORIGEM = process.cwd();
const pasta = mkdtempSync(join(tmpdir(), "corrida-padrao-"));

process.chdir(pasta);
delete process.env.DATABASE_PATH;

const { getDb } = await import("@/lib/db");

after(() => {
  process.chdir(ORIGEM);
});

describe("caminho padrao do banco", () => {
  it("cria data/corrida.db no diretorio de trabalho", () => {
    getDb().exec("SELECT 1");
    assert.ok(existsSync(join(pasta, "data", "corrida.db")));
  });
});
