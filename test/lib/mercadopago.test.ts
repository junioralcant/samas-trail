import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { getPaymentClient, getPreferenceClient } from "@/lib/mercadopago";

const TOKEN = process.env.MP_ACCESS_TOKEN;

// O client fica em cache no modulo, entao a ordem importa: o caso sem token
// precisa vir antes de qualquer chamada bem-sucedida.
describe("clients do Mercado Pago", () => {
  it("explode quando falta MP_ACCESS_TOKEN", () => {
    delete process.env.MP_ACCESS_TOKEN;
    assert.throws(() => getPreferenceClient(), {
      message: "MP_ACCESS_TOKEN não configurado",
    });
    assert.equal(globalThis.__testeMp.configs.length, 0);
  });

  it("configura o client com o token do ambiente", () => {
    process.env.MP_ACCESS_TOKEN = TOKEN;
    getPreferenceClient();
    assert.deepEqual(globalThis.__testeMp.configs, [{ accessToken: TOKEN }]);
  });

  it("reaproveita o mesmo client nas chamadas seguintes", () => {
    getPreferenceClient();
    getPaymentClient();
    assert.equal(globalThis.__testeMp.configs.length, 1);
  });

  it("entrega clients de preferencia e de pagamento", async () => {
    globalThis.__testeMp.preferenceCreate = async () => ({ id: "pref-1" });
    globalThis.__testeMp.paymentGet = async () => ({ id: 99, status: "approved" });

    assert.deepEqual(await getPreferenceClient().create({ body: { items: [] } }), {
      id: "pref-1",
    });
    assert.deepEqual(await getPaymentClient().get({ id: "99" }), {
      id: 99,
      status: "approved",
    });
  });
});
