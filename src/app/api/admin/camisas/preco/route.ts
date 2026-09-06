import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  CHAVE_CAMISA_PRECO,
  CHAVE_CAMISA_PRECO_PROMO,
  getPrecoCamisa,
  gravarConfiguracao,
} from "@/lib/configuracoes";
import { VALOR_MINIMO, arredondar } from "@/lib/cupom";

type PatchPayload = { precoCheio?: unknown; precoPromo?: unknown };

/** Aceita "45,00" e "45.00" — o painel é preenchido à mão. */
const paraNumero = (valor: unknown) =>
  arredondar(Number(String(valor).replace(",", ".")));

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json({ preco: getPrecoCamisa() });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let payload: PatchPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const cheio = paraNumero(payload.precoCheio);
  if (!Number.isFinite(cheio) || cheio < VALOR_MINIMO) {
    return NextResponse.json(
      { erro: `O preço cheio precisa ser de pelo menos R$ ${VALOR_MINIMO}` },
      { status: 400 },
    );
  }

  // Campo vazio é como se desliga a promoção — não é erro de digitação.
  const promoBruto = String(payload.precoPromo ?? "").trim();
  if (promoBruto !== "") {
    const promo = paraNumero(promoBruto);
    if (!Number.isFinite(promo) || promo < VALOR_MINIMO) {
      return NextResponse.json(
        {
          erro: `O preço promocional precisa ser de pelo menos R$ ${VALOR_MINIMO}`,
        },
        { status: 400 },
      );
    }
    if (promo >= cheio) {
      return NextResponse.json(
        { erro: "O preço promocional precisa ser menor que o preço cheio" },
        { status: 400 },
      );
    }
  }

  gravarConfiguracao(CHAVE_CAMISA_PRECO, String(cheio));
  gravarConfiguracao(
    CHAVE_CAMISA_PRECO_PROMO,
    promoBruto === "" ? "" : String(paraNumero(promoBruto)),
  );

  return NextResponse.json({ preco: getPrecoCamisa() });
}
