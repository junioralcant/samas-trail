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

  const existe = getDb()
    .prepare("SELECT id FROM inscricoes WHERE kit_token = ?")
    .get(token);
  if (!existe) {
    return NextResponse.json({ erro: "QR code inválido" }, { status: 404 });
  }

  const png = await QRCode.toBuffer(`${getAppUrl()}/inscricao/${token}`, {
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
