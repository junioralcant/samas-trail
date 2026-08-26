import type { EnvioEmailParams } from "./types";

export const enviarEmail = async (
  params: EnvioEmailParams,
): Promise<boolean> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.EMAIL_FROM ??
          "SAMAS TRAIL <inscricoes@samastrail.com.br>",
        to: [params.para],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: params.assunto,
        html: params.html,
      }),
    });
    if (!response.ok) {
      console.error(
        "Erro ao enviar e-mail",
        response.status,
        await response.text(),
      );
    }
    return response.ok;
  } catch (error) {
    console.error("Erro ao enviar e-mail", error);
    return false;
  }
};
