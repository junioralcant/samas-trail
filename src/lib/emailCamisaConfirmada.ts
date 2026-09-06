import { getAppUrl } from "./config";
import { enviarEmail } from "./email";
import { resumirItens, type ItemCamisa } from "./estoque";
import type { PedidoCamisa } from "./types";

const PREHEADER =
  "Pagamento aprovado! Sua camisa extra SAMAS TRAIL está garantida.";

const linhaDetalhe = (
  rotulo: string,
  valorHtml: string,
  opcoes?: { ultima?: boolean },
) => {
  const bordas = `border-top:1px solid #262626;${
    opcoes?.ultima ? " border-bottom:1px solid #262626;" : ""
  }`;
  return `
          <tr>
            <td width="45%" style="width:45%; padding:14px 0; ${bordas} font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; mso-line-height-rule:exactly; letter-spacing:1.5px; color:#6B7280; text-transform:uppercase;">${rotulo}</td>
            <td width="55%" align="right" style="width:55%; padding:14px 0; ${bordas} ${valorHtml}</td>
          </tr>`;
};

const valorComum = (texto: string) =>
  `font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:20px; mso-line-height-rule:exactly; font-weight:bold; color:#FFFFFF;">${texto}`;

const valorDestaque = (texto: string, cor: string) =>
  `font-family:'Arial Black', Arial, Helvetica, sans-serif; font-style:italic; font-size:18px; line-height:20px; mso-line-height-rule:exactly; color:${cor};">${texto}`;

export type CamisaConfirmada = {
  pedido: PedidoCamisa;
  itens: ItemCamisa[];
  /** Numero da inscricao quando a camisa sai junto do kit. */
  inscricaoId: number | null;
};

export const enviarEmailCamisaConfirmada = async ({
  pedido,
  itens,
  inscricaoId,
}: CamisaConfirmada): Promise<boolean> => {
  const eventName = process.env.EVENT_NAME ?? "SAMAS TRAIL";
  const valorFormatado = pedido.valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const appUrl = getAppUrl();
  const linkPedido = `${appUrl}/camisa/${pedido.token}`;

  // Vinculada: sai junto do kit, e o QR que vale e o da inscricao. Sem
  // vinculo, o pedido tem QR proprio.
  const blocoRetirada = inscricaoId
    ? `
    <tr>
      <td style="padding:24px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#0F0F0F; border:1px solid #1F1F1F; border-radius:12px; border-collapse:separate;">
          <tr>
            <td style="padding:20px 22px;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; mso-line-height-rule:exactly; letter-spacing:1.5px; color:#E10600; text-transform:uppercase; font-weight:bold;">Retirada</div>
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:23px; mso-line-height-rule:exactly; color:#9CA3AF; padding-top:8px;">Encontramos a sua inscrição <strong style="color:#FFFFFF;">#${inscricaoId}</strong>: a camisa extra será entregue <strong style="color:#FFFFFF;">junto com o seu kit de atleta</strong>. Basta apresentar o QR code da inscrição.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : `
    <tr>
      <td align="center" style="padding:28px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#0F0F0F; border:1px solid #1F1F1F; border-radius:12px; border-collapse:separate;">
          <tr>
            <td align="center" style="padding:22px 22px 6px 22px;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; mso-line-height-rule:exactly; letter-spacing:1.5px; color:#E10600; text-transform:uppercase; font-weight:bold;">Retirada da camisa</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 22px 0 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#FFFFFF; border-radius:12px; padding:10px;">
                    <img src="${appUrl}/api/qr/${pedido.token}" width="180" height="180" alt="QR code do seu pedido" style="display:block; width:180px; height:180px; border:0;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 22px 22px 22px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:21px; mso-line-height-rule:exactly; color:#9CA3AF;">
              Apresente este QR code à organização para retirar a sua camisa.
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Pedido confirmado — ${eventName}</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#0A0A0A; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

<span style="display:none; font-size:1px; color:#0A0A0A; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${PREHEADER}</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0A0A0A; margin:0; padding:0;">
<tr>
<td align="center" style="padding:24px 12px 40px 12px;">

  <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td width="600"><![endif]-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; max-width:600px; background-color:#111111; border:1px solid #262626; border-radius:16px; border-collapse:separate;">

    <tr>
      <td align="center" style="background-color:#0A0A0A; padding:32px 24px 26px 24px; border-radius:16px 16px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:'Arial Black', Arial, Helvetica, sans-serif; font-style:italic; font-weight:bold; font-size:32px; line-height:34px; mso-line-height-rule:exactly; letter-spacing:1px; color:#FFFFFF; text-transform:uppercase;">SAMAS</td>
            <td style="width:10px;">&nbsp;</td>
            <td style="font-family:'Arial Black', Arial, Helvetica, sans-serif; font-style:italic; font-weight:bold; font-size:32px; line-height:34px; mso-line-height-rule:exactly; letter-spacing:3px; color:#E10600; text-transform:uppercase;">TRAIL</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; mso-line-height-rule:exactly; letter-spacing:2px; color:#6B7280; text-transform:uppercase; background-color:#0A0A0A; padding:0 24px 26px 24px;" align="center">Camisa extra &middot; edição 2026</td>
    </tr>

    <tr>
      <td style="background-color:#E10600; height:6px; line-height:6px; font-size:0;">&nbsp;</td>
    </tr>

    <tr>
      <td style="padding:36px 28px 8px 28px;">
        <div style="font-family:'Arial Black', Arial, Helvetica, sans-serif; font-style:italic; font-weight:bold; font-size:28px; line-height:32px; mso-line-height-rule:exactly; color:#FFFFFF; text-transform:uppercase; letter-spacing:0.5px;">Pedido confirmado!</div>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 28px 28px 28px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; mso-line-height-rule:exactly; color:#9CA3AF;">
        Olá, <span style="color:#FFFFFF; font-weight:bold;">${pedido.nome}</span>! Seu pagamento foi aprovado e a sua camisa extra está garantida.
      </td>
    </tr>

    <tr>
      <td style="padding:0 28px 8px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; border-collapse:collapse;">
          ${linhaDetalhe("Nº do pedido", valorComum(`#${pedido.id}`))}
          ${linhaDetalhe("Camisas", valorDestaque(resumirItens(itens), "#FFFFFF"))}
          ${linhaDetalhe("Valor pago", valorDestaque(valorFormatado, "#E10600"), {
            ultima: true,
          })}
        </table>
      </td>
    </tr>

${blocoRetirada}

    <tr>
      <td align="center" style="padding:28px 28px 4px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
          <tr>
            <td align="center" bgcolor="#E10600" style="background-color:#E10600; border-radius:8px;">
              <a href="${linkPedido}" style="display:block; padding:17px 24px; font-family:'Arial Black', Arial, Helvetica, sans-serif; font-style:italic; font-weight:bold; font-size:16px; line-height:20px; mso-line-height-rule:exactly; letter-spacing:1px; color:#FFFFFF; text-decoration:none; text-transform:uppercase;">Ver meu pedido</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:30px 28px 32px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
          <tr><td style="border-top:1px solid #262626; height:1px; line-height:1px; font-size:0;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="padding-top:20px; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; mso-line-height-rule:exactly; color:#6B7280;">
              Pagamento processado pelo Mercado Pago. Dúvidas? É só responder este e-mail.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:12px; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:18px; mso-line-height-rule:exactly; letter-spacing:1px; color:#4B5563; text-transform:uppercase;">
              ${eventName} &middot; São Mateus do Maranhão/MA
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
  <!--[if mso]></td></tr></table><![endif]-->

</td>
</tr>
</table>

</body>
</html>`;

  return enviarEmail({
    para: pedido.email,
    assunto: `Pedido confirmado — camisa extra ${eventName}`,
    html,
  });
};
