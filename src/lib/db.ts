import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let db: DatabaseSync | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS inscricoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    data_nascimento TEXT NOT NULL,
    sexo TEXT NOT NULL,
    tamanho_camiseta TEXT NOT NULL,
    equipe TEXT,
    distancia TEXT NOT NULL CHECK (distancia IN ('8km', '18km')),
    valor REAL NOT NULL,
    status_pagamento TEXT NOT NULL DEFAULT 'pendente'
      CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_inscricoes_cpf ON inscricoes (cpf);
  CREATE INDEX IF NOT EXISTS idx_inscricoes_distancia ON inscricoes (distancia);
  CREATE INDEX IF NOT EXISTS idx_inscricoes_status ON inscricoes (status_pagamento);
`;

export const getDb = (): DatabaseSync => {
  if (db) {
    return db;
  }
  const path = resolve(
    /*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/corrida.db",
  );
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  return db;
};
