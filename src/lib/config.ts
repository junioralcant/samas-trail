export type Distancia = "8km" | "18km";

export const DISTANCIAS: Distancia[] = ["8km", "18km"];

export const getEventName = () => process.env.EVENT_NAME ?? "Corrida de Trilha";

export const getPreco = (distancia: Distancia) => {
  const raw =
    distancia === "8km"
      ? process.env.PRECO_8KM ?? "130.00"
      : process.env.PRECO_18KM ?? "160.00";
  return Number(raw);
};

// Rotulo do lote vigente. Fica gravado na inscricao para nao se perder
// quando o lote virar e os precos forem reajustados.
export const getLoteAtual = () =>
  process.env.NEXT_PUBLIC_LOTE_ATUAL ?? "1º lote";

export const getAppUrl = () => process.env.APP_URL ?? "http://localhost:3000";
