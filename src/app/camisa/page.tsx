import { connection } from "next/server";
import { getPrecoCamisa } from "@/lib/configuracoes";
import { disponibilidade } from "@/lib/estoque";
import FormularioCamisa from "./FormularioCamisa";

export const metadata = {
  title: "Camisa extra — SAMAS TRAIL",
  description:
    "Camisa comemorativa azul-royal da SAMAS TRAIL. Produto avulso, vendido à parte da inscrição.",
};

export default async function PaginaCamisa() {
  // O node:sqlite e sincrono e resolveria durante o prerender: sem isto a
  // pagina sairia com preco e estoque congelados no build.
  await connection();

  return (
    <FormularioCamisa
      preco={getPrecoCamisa()}
      disponivel={disponibilidade()}
    />
  );
}
