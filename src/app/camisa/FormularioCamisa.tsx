"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type { PrecoCamisa } from "@/lib/configuracoes";
import { SEPARACAO_KIT } from "../camisaExtra";
import {
  GaleriaCamisa,
  SeloPromocao,
  formatarPreco,
} from "../CamisaExtraPecas";
import SeletorCamisas, {
  paraItens,
  resumoSelecao,
  totalSelecionado,
  type Selecao,
} from "../SeletorCamisas";

type FormState = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
};

const FORM_INICIAL: FormState = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
};

const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE ?? "";

const aplicarMascaraCpf = (valor: string) =>
  valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const aplicarMascaraTelefone = (valor: string) =>
  valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

type Vinculo =
  | { estado: "vazio" }
  | { estado: "verificando" }
  | { estado: "sem-vinculo" }
  | {
      estado: "vinculada";
      primeiroNome: string;
      distancia: string;
    };

type Falta = { tamanho: string; pedido: number; disponivel: number };

type FormularioCamisaProps = {
  preco: PrecoCamisa;
  disponivel: Record<string, number>;
};

export default function FormularioCamisa({
  preco,
  disponivel: disponivelInicial,
}: FormularioCamisaProps) {
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [selecao, setSelecao] = useState<Selecao>({});
  const [disponivel, setDisponivel] = useState(disponivelInicial);
  const [vinculo, setVinculo] = useState<Vinculo>({ estado: "vazio" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);

  const quantidade = totalSelecionado(selecao);
  const total = quantidade * preco.precoAtual;
  const tudoEsgotado = Object.values(disponivel).every((n) => n === 0);

  const atualizarCampo =
    (campo: keyof FormState) => (evento: ChangeEvent<HTMLInputElement>) => {
      let valor = evento.target.value;
      if (campo === "cpf") {
        valor = aplicarMascaraCpf(valor);
      }
      if (campo === "telefone") {
        valor = aplicarMascaraTelefone(valor);
      }
      setForm((previo) => ({ ...previo, [campo]: valor }));
      if (campo === "cpf") {
        setVinculo({ estado: "vazio" });
      }
    };

  // Só consulta com o CPF completo, ao sair do campo: o aviso fica dois
  // campos acima do botão, então o resultado assíncrono nunca se move
  // sob o dedo de quem está prestes a tocar em comprar.
  const verificarVinculo = async () => {
    const digitos = form.cpf.replace(/\D/g, "");
    if (digitos.length !== 11) {
      setVinculo({ estado: "vazio" });
      return;
    }
    setVinculo({ estado: "verificando" });
    try {
      const response = await fetch(`/api/camisas/vinculo?cpf=${digitos}`);
      const data = await response.json();
      if (!response.ok || !data.vinculada) {
        setVinculo({ estado: "sem-vinculo" });
        return;
      }
      setVinculo({
        estado: "vinculada",
        primeiroNome: data.primeiroNome,
        distancia: data.distancia,
      });
    } catch {
      setVinculo({ estado: "sem-vinculo" });
    }
  };

  /** Corrige a seleção com o que o servidor disse que ainda existe. */
  const ajustarPorFaltas = (faltas: Falta[]) => {
    const novoDisponivel = { ...disponivel };
    const novaSelecao = { ...selecao };
    for (const falta of faltas) {
      novoDisponivel[falta.tamanho] = falta.disponivel;
      novaSelecao[falta.tamanho] = falta.disponivel;
    }
    setDisponivel(novoDisponivel);
    setSelecao(novaSelecao);
    const nomes = faltas.map((f) => f.tamanho).join(", ");
    setErro(
      faltas.length === 1
        ? `O tamanho ${nomes} acabou enquanto você comprava`
        : `Os tamanhos ${nomes} acabaram enquanto você comprava`,
    );
    setErroDetalhe(
      "Ajustamos a sua escolha para o que ainda temos. Confira e continue.",
    );
  };

  const comprar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErro(null);
    setErroDetalhe(null);
    setEnviando(true);
    try {
      const response = await fetch("/api/camisas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tamanhos: paraItens(selecao) }),
      });
      const data = await response.json();
      if (response.status === 409 && Array.isArray(data.faltas)) {
        ajustarPorFaltas(data.faltas);
        return;
      }
      if (!response.ok) {
        setErro(data.erro ?? "Não foi possível continuar");
        setErroDetalhe("Confira os dados e tente novamente.");
        return;
      }
      window.location.href = data.initPoint;
    } catch {
      setErro("Falha ao iniciar o pagamento");
      setErroDetalhe("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="pagina-camisa">
      <header className="camisa-topo">
        <Link className="camisa-marca" href="/">
          <span className="logo-linha display">
            <span className="logo-linha-samas">SAMAS</span>
            <span className="logo-linha-trail">TRAIL</span>
          </span>
        </Link>
        <div className="camisa-topo-data">Samas Trail · {eventDate}</div>
      </header>

      <div className="camisa-conteudo">
        <section className="camisa-vitrine">
          <div className="camisa-titulo-linha">
            <h1 className="camisa-titulo display">Camisa extra</h1>
            {tudoEsgotado && (
              <span className="pill-esgotado">Esgotado</span>
            )}
          </div>
          <p className="camisa-separacao">{SEPARACAO_KIT.camisa}</p>
          {!tudoEsgotado && <SeloPromocao preco={preco} />}
          <GaleriaCamisa />
        </section>

        {tudoEsgotado ? (
          // As faces continuam: é peça de evento e tem valor de registro.
          // O formulário sai inteiro, sem CTA que não leva a lugar nenhum.
          <section className="camisa-esgotada">
            <div className="camisa-esgotada-titulo display">
              Camisas esgotadas
            </div>
            <p className="camisa-esgotada-texto">
              As 54 peças da camisa extra foram vendidas e não haverá
              reposição. Se você já comprou a sua, o link do pedido está no
              e-mail de confirmação.
            </p>
            <Link className="botao-contorno" href="/">
              Voltar para a inscrição
            </Link>
          </section>
        ) : (
          <form className="camisa-form" onSubmit={comprar}>
            <SeletorCamisas
              disponivel={disponivel}
              selecao={selecao}
              aoMudar={setSelecao}
            />

            <div className="camisa-dados">
              <h2 className="camisa-subtitulo">Seus dados</h2>
              <div className="grid-form">
                <label className="campo campo-largo">
                  <span className="campo-rotulo">Nome completo</span>
                  <input
                    required
                    value={form.nome}
                    onChange={atualizarCampo("nome")}
                    placeholder="Ex.: Rosineide Costa Ferreira"
                  />
                </label>
                <label className="campo campo-largo">
                  <span className="campo-rotulo">CPF</span>
                  <input
                    required
                    inputMode="numeric"
                    value={form.cpf}
                    onChange={atualizarCampo("cpf")}
                    onBlur={verificarVinculo}
                    placeholder="000.000.000-00"
                  />
                </label>

                {/* Altura reservada desde o início: o resultado assíncrono
                    troca o conteúdo sem empurrar o resto do formulário. */}
                <div className="campo-largo aviso-vinculo-area">
                  {vinculo.estado === "verificando" && (
                    <div className="aviso-vinculo verificando">
                      Verificando inscrição…
                    </div>
                  )}
                  {vinculo.estado === "vinculada" && (
                    <div className="aviso-vinculo vinculada">
                      <span className="aviso-vinculo-titulo">
                        Inscrição encontrada
                      </span>
                      Encontramos a inscrição de {vinculo.primeiroNome} (
                      {vinculo.distancia}). Sua camisa será entregue junto com
                      o kit dele.
                    </div>
                  )}
                  {vinculo.estado === "sem-vinculo" && (
                    <div className="aviso-vinculo neutro">
                      Sem inscrição neste CPF — tudo certo. Você vai receber um
                      QR code próprio para retirar a camisa.
                    </div>
                  )}
                </div>

                <label className="campo campo-largo">
                  <span className="campo-rotulo">E-mail</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={atualizarCampo("email")}
                    placeholder="voce@email.com"
                  />
                </label>
                <label className="campo campo-largo">
                  <span className="campo-rotulo">Telefone / WhatsApp</span>
                  <input
                    required
                    inputMode="numeric"
                    value={form.telefone}
                    onChange={atualizarCampo("telefone")}
                    placeholder="(98) 99999-9999"
                  />
                </label>
              </div>
            </div>

            {erro && (
              <div className="banner-erro">
                <div className="banner-erro-icone">!</div>
                <div>
                  <div className="banner-erro-titulo">{erro}</div>
                  {erroDetalhe && (
                    <div className="banner-erro-texto">{erroDetalhe}</div>
                  )}
                </div>
              </div>
            )}

            <div className="camisa-resumo">
              {quantidade > 0 && (
                <>
                  <div className="camisa-resumo-linha">
                    <span>
                      Camisa extra · {quantidade} ×{" "}
                      {formatarPreco(preco.precoAtual)}
                    </span>
                    <span>{formatarPreco(total)}</span>
                  </div>
                  <div className="camisa-resumo-linha secundaria">
                    <span>Tamanhos</span>
                    <span>{resumoSelecao(selecao)}</span>
                  </div>
                </>
              )}
              <div className="linha-total">
                <span className="linha-total-rotulo">Total</span>
                <span className="linha-total-valor display">
                  {formatarPreco(total)}
                </span>
              </div>
            </div>

            <button
              className="botao-cta"
              type="submit"
              disabled={enviando || quantidade === 0}
            >
              {enviando
                ? "Redirecionando para o pagamento..."
                : `Comprar — ${formatarPreco(total)}`}
            </button>
            <div className="nota-rodape">
              Retirada no dia da prova, {eventDate}, no Povoado Água Preta. Sem
              inscrição, você recebe um QR code próprio por e-mail.
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
