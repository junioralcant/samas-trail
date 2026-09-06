import { connection } from "next/server";
import { getPrecoCamisa } from "@/lib/configuracoes";
import { disponibilidade } from "@/lib/estoque";
import FormularioInscricao from "./FormularioInscricao";

export default async function InscricaoPage() {
  // O preco e o estoque da camisa vem do banco e mudam pelo painel, sem
  // deploy. O node:sqlite e sincrono e resolveria durante o prerender:
  // sem connection() a home sairia congelada no build.
  await connection();

  return (
    <FormularioInscricao
      precoCamisa={getPrecoCamisa()}
      disponivelCamisa={disponibilidade()}
    />
  );
}
