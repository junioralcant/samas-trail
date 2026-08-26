import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

let client: MercadoPagoConfig | null = null;

const getClient = (): MercadoPagoConfig => {
  if (client) {
    return client;
  }
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN não configurado");
  }
  client = new MercadoPagoConfig({ accessToken });
  return client;
};

export const getPreferenceClient = () => new Preference(getClient());

export const getPaymentClient = () => new Payment(getClient());
