import Link from "next/link";

type RetornoPageProps = {
  searchParams: Promise<{ resultado?: string }>;
};

const CONTEUDO: Record<
  string,
  { icone: string; titulo: string; texto: string }
> = {
  sucesso: {
    icone: "✅",
    titulo: "Inscrição confirmada!",
    texto:
      "Pagamento aprovado. Você receberá as informações da prova no e-mail cadastrado. Nos vemos na trilha!",
  },
  pendente: {
    icone: "⏳",
    titulo: "Pagamento em processamento",
    texto:
      "Seu pagamento está sendo processado. Assim que for aprovado, sua inscrição será confirmada automaticamente.",
  },
  erro: {
    icone: "❌",
    titulo: "Pagamento não concluído",
    texto:
      "O pagamento não foi aprovado. Você pode tentar novamente realizando uma nova inscrição.",
  },
};

export default async function RetornoPage({ searchParams }: RetornoPageProps) {
  const { resultado } = await searchParams;
  const conteudo = CONTEUDO[resultado ?? ""] ?? CONTEUDO.erro;

  return (
    <main className="pagina-retorno">
      <div className="retorno-card">
        <div className="icone">{conteudo.icone}</div>
        <h1>{conteudo.titulo}</h1>
        <p>{conteudo.texto}</p>
        <Link href="/">Voltar para a página de inscrição</Link>
      </div>
    </main>
  );
}
