import { getAppUrl } from "./config";
import { enviarEmail } from "./email";
import { ehMenorDeIdade } from "./idade";
import type { Inscricao } from "./types";

const PREHEADER =
  "Pagamento aprovado! Sua vaga na trilha está garantida. Confira os detalhes da prova.";

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

/** "2026-08-31 18:22:05" -> "31/08/2026 as 18:22" */
const formatarAceite = (valor: string) => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(valor);
  if (!partes) {
    return valor;
  }
  const [, ano, mes, dia, hora, minuto] = partes;
  return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
};

const valorDestaque = (texto: string, cor: string) =>
  `font-family:'Arial Black', Arial, Helvetica, sans-serif; font-style:italic; font-size:18px; line-height:20px; mso-line-height-rule:exactly; color:${cor};">${texto}`;

export const enviarEmailInscricaoConfirmada = async (
  inscricao: Inscricao,
): Promise<boolean> => {
  const eventName = process.env.EVENT_NAME ?? "SAMAS TRAIL";
  const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE ?? "a definir";
  const eventLocation = process.env.NEXT_PUBLIC_EVENT_LOCATION ?? "a definir";
  const localHtml = eventLocation.replace(" — ", "<br>");
  const valorFormatado = inscricao.valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const linhaCupom = inscricao.cupom_codigo
    ? linhaDetalhe(
        "Cupom",
        valorComum(
          `${inscricao.cupom_codigo} (−${inscricao.desconto.toLocaleString(
            "pt-BR",
            { style: "currency", currency: "BRL" },
          )})`,
        ),
      )
    : "";
  const linhaTermo = inscricao.termo_aceito_em
    ? linhaDetalhe(
        "Termo aceito em",
        valorComum(
          `${formatarAceite(inscricao.termo_aceito_em)}${
            inscricao.termo_versao ? ` (v${inscricao.termo_versao})` : ""
          }`,
        ),
        { ultima: true },
      )
    : "";
  const menorHtml = ehMenorDeIdade(inscricao.data_nascimento)
    ? `
    <tr>
      <td style="padding:16px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#1a1200; border:1px solid #FBBF24; border-radius:12px; border-collapse:separate;">
          <tr>
            <td style="padding:20px 22px;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; mso-line-height-rule:exactly; letter-spacing:1.5px; color:#FBBF24; text-transform:uppercase; font-weight:bold;">Atleta menor de 18 anos</div>
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:23px; mso-line-height-rule:exactly; color:#FDE68A; padding-top:8px;">Na retirada do kit é obrigatório apresentar o Termo de Responsabilidade impresso e assinado pelo responsável legal, junto com o documento de identidade dele. Sem isso o kit não pode ser liberado.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";
  const linkInscricao = inscricao.kit_token
    ? `${getAppUrl()}/inscricao/${inscricao.kit_token}`
    : `${getAppUrl()}/inscricao/retorno?resultado=sucesso&external_reference=${
        inscricao.id
      }`;
  const qrHtml = inscricao.kit_token
    ? `
    <tr>
      <td align="center" style="padding:28px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#0F0F0F; border:1px solid #1F1F1F; border-radius:12px; border-collapse:separate;">
          <tr>
            <td align="center" style="padding:22px 22px 6px 22px;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; mso-line-height-rule:exactly; letter-spacing:1.5px; color:#E10600; text-transform:uppercase; font-weight:bold;">Retirada do kit</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 22px 0 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#FFFFFF; border-radius:12px; padding:10px;">
                    <img src="${getAppUrl()}/api/qr/${
                      inscricao.kit_token
                    }" width="180" height="180" alt="QR code da sua inscrição" style="display:block; width:180px; height:180px; border:0;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 22px 22px 22px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:21px; mso-line-height-rule:exactly; color:#9CA3AF;">
              Apresente este QR code à organização para retirar o seu kit de atleta. Ele também aparece em "Ver minha inscrição".
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Inscrição confirmada — ${eventName}</title>
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
      <td style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; mso-line-height-rule:exactly; letter-spacing:2px; color:#6B7280; text-transform:uppercase; background-color:#0A0A0A; padding:0 24px 26px 24px;" align="center">Prova de trilha &middot; 8km e 18km</td>
    </tr>

    <tr>
      <td style="background-color:#E10600; height:6px; line-height:6px; font-size:0;">&nbsp;</td>
    </tr>

    <tr>
      <td style="padding:36px 28px 8px 28px;">
        <div style="font-family:'Arial Black', Arial, Helvetica, sans-serif; font-style:italic; font-weight:bold; font-size:28px; line-height:32px; mso-line-height-rule:exactly; color:#FFFFFF; text-transform:uppercase; letter-spacing:0.5px;">Inscrição confirmada!</div>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 28px 28px 28px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; mso-line-height-rule:exactly; color:#9CA3AF;">
        Olá, <span style="color:#FFFFFF; font-weight:bold;">${
          inscricao.nome
        }</span>! Seu pagamento foi aprovado e sua vaga está garantida. Nos vemos na trilha!
      </td>
    </tr>

    <tr>
      <td style="padding:0 28px 8px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; border-collapse:collapse;">
          ${linhaDetalhe("Nº da inscrição", valorComum(`#${inscricao.id}`))}
          ${linhaDetalhe(
            "Distância",
            valorDestaque(inscricao.distancia.toUpperCase(), "#FFFFFF"),
          )}
          ${linhaCupom}
          ${linhaDetalhe(
            "Valor pago",
            valorDestaque(valorFormatado, "#E10600"),
          )}
          ${linhaDetalhe("Data da prova", valorComum(eventDate))}
          ${linhaDetalhe("Local", valorComum(localHtml))}
          ${linhaDetalhe("Camiseta", valorComum(inscricao.tamanho_camiseta), {
            ultima: linhaTermo === "",
          })}
          ${linhaTermo}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#0F0F0F; border:1px solid #1F1F1F; border-radius:12px; border-collapse:separate;">
          <tr>
            <td style="padding:20px 22px;">
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:16px; mso-line-height-rule:exactly; letter-spacing:1.5px; color:#E10600; text-transform:uppercase; font-weight:bold;">No dia da prova</div>
              <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:23px; mso-line-height-rule:exactly; color:#9CA3AF; padding-top:8px;">Chegue com 1h de antecedência. Leve documento com foto.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

${menorHtml}

${qrHtml}

    <tr>
      <td align="center" style="padding:28px 28px 4px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
          <tr>
            <td align="center" bgcolor="#E10600" style="background-color:#E10600; border-radius:8px;">
              <a href="${linkInscricao}" style="display:block; padding:17px 24px; font-family:'Arial Black', Arial, Helvetica, sans-serif; font-style:italic; font-weight:bold; font-size:16px; line-height:20px; mso-line-height-rule:exactly; letter-spacing:1px; color:#FFFFFF; text-decoration:none; text-transform:uppercase;">Ver minha inscrição</a>
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
    para: inscricao.email,
    assunto: `Inscrição confirmada — ${eventName} ${inscricao.distancia}`,
    html,
  });
};
