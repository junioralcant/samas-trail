export type Distancia = "8km" | "18km";

export const DISTANCIAS: Distancia[] = ["8km", "18km"];

export const getEventName = () => process.env.EVENT_NAME ?? "Corrida de Trilha";

export const getPreco = (distancia: Distancia) => {
  const raw =
    distancia === "8km"
      ? process.env.PRECO_8KM ?? "110.00"
      : process.env.PRECO_18KM ?? "140.00";
  return Number(raw);
};

export const getAppUrl = () => process.env.APP_URL ?? "http://localhost:3000";
