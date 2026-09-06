import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getAppUrl } from "@/lib/config";
import { getDb } from "@/lib/db";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ erro: "QR code inválido" }, { status: 400 });
  }

  const db = getDb();
  const inscricao = db
    .prepare("SELECT id FROM inscricoes WHERE kit_token = ?")
    .get(token);
  // O mesmo endereço serve os dois tipos de token: o do kit do atleta e o
  // do pedido de quem comprou camisa sem se inscrever.
  const pedido = inscricao
    ? undefined
    : db.prepare("SELECT id FROM pedidos_camisa WHERE token = ?").get(token);

  if (!inscricao && !pedido) {
    return NextResponse.json({ erro: "QR code inválido" }, { status: 404 });
  }

  const destino = inscricao ? "inscricao" : "camisa";
  const png = await QRCode.toBuffer(`${getAppUrl()}/${destino}/${token}`, {
    type: "png",
    width: 480,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
