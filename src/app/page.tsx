"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { ehMenorDeIdade } from "@/lib/idade";
import ModalTermo from "./ModalTermo";
import VisualizadorKit from "./VisualizadorKit";
import { ITENS_KIT } from "./itensKit";

type Distancia = "8km" | "18km";

type FormState = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  dataNascimento: string;
  sexo: string;
  tamanhoCamiseta: string;
  equipe: string;
};

const FORM_INICIAL: FormState = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
  dataNascimento: "",
  sexo: "",
  tamanhoCamiseta: "",
  equipe: "",
};

const PREMIACAO = [
  {
    distancia: "8KM",
    etiqueta: "Apenas classificação geral",
    valores: [400, 300, 200],
  },
  { distancia: "18KM", etiqueta: "Geral", valores: [600, 450, 250] },
];

const CATEGORIAS = ["Masculino", "Feminino"];

const FAIXAS_18KM = [
  "16 a 29 anos",
  "30 a 39 anos",
  "40 a 49 anos",
  "50+ anos",
];

const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE ?? "Data a definir";
const eventLocation =
  process.env.NEXT_PUBLIC_EVENT_LOCATION ?? "Local a definir";
const preco8km = Number(process.env.NEXT_PUBLIC_PRECO_8KM ?? "120.00");
const preco18km = Number(process.env.NEXT_PUBLIC_PRECO_18KM ?? "150.00");
const loteAtual = process.env.NEXT_PUBLIC_LOTE_ATUAL ?? "1º lote";

const formatarPreco = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

type CupomAplicado = {
  codigo: string;
  desconto: number;
  valorFinal: number;
};

export default function InscricaoPage() {
  const [distancia, setDistancia] = useState<Distancia>("8km");
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cupom, setCupom] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<CupomAplicado | null>(
    null,
  );
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const [termoAceito, setTermoAceito] = useState(false);
  const [termoAberto, setTermoAberto] = useState(false);
  const [itemKitAberto, setItemKitAberto] = useState<number | null>(null);

  const menorDeIdade =
    form.dataNascimento !== "" && ehMenorDeIdade(form.dataNascimento);

  const preco = distancia === "8km" ? preco8km : preco18km;
  const desconto = cupomAplicado?.desconto ?? 0;
  const total = preco - desconto;

  const validarCupom = async (codigo: string, distanciaAlvo: Distancia) => {
    setErroCupom(null);
    setValidandoCupom(true);
    try {
      const response = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, distancia: distanciaAlvo }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCupomAplicado(null);
        setErroCupom(data.erro ?? "Não foi possível validar o cupom.");
        return;
      }
      setCupomAplicado({
        codigo: data.codigo,
        desconto: data.desconto,
        valorFinal: data.valorFinal,
      });
      setCupom(data.codigo);
    } catch {
      setCupomAplicado(null);
      setErroCupom("Erro de conexão. Tente novamente.");
    } finally {
      setValidandoCupom(false);
    }
  };

  // O desconto é limitado pelo valor da inscrição, então trocar de
  // distância exige revalidar o cupom já aplicado.
  const trocarDistancia = (nova: Distancia) => {
    setDistancia(nova);
    if (cupomAplicado) {
      void validarCupom(cupomAplicado.codigo, nova);
    }
  };

  const removerCupom = () => {
    setCupom("");
    setCupomAplicado(null);
    setErroCupom(null);
  };

  const atualizarCampo =
    (campo: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let valor = event.target.value;
      if (campo === "cpf") {
        valor = aplicarMascaraCpf(valor);
      }
      if (campo === "telefone") {
        valor = aplicarMascaraTelefone(valor);
      }
      setForm((previo) => ({ ...previo, [campo]: valor }));
    };

  const enviarInscricao = async (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const response = await fetch("/api/inscricoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          distancia,
          cupom: cupomAplicado?.codigo,
          termoAceito,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErro(data.erro ?? "Erro ao enviar inscrição. Tente novamente.");
        return;
      }
      window.location.href = data.initPoint;
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main>
      <section className="hero textura">
        <div className="hero-splatter" />
        <div className="hero-splatter-branco" />
        <svg
          className="hero-trilha"
          width="1180"
          height="120"
          viewBox="0 0 1180 120"
          fill="none"
        >
          <path
            d="M8 96C160 22 300 108 470 64s260-92 420-24 200 22 282-14"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="0.1 16"
          />
        </svg>
        <div className="hero-conteudo">
          <div className="logo-hero display">
            <div className="logo-hero-samas">SAMAS</div>
            <div className="logo-hero-trail-linha">
              <div className="logo-hero-barra" />
              <div className="logo-hero-trail">TRAIL</div>
              <div className="logo-hero-barra" />
            </div>
            <svg
              className="logo-hero-trilha-svg"
              width="150"
              height="20"
              viewBox="0 0 150 20"
              fill="none"
            >
              <path
                d="M3 15C22 3 38 18 58 9s34-8 52 3 30-1 34-5"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray="0.1 9"
              />
            </svg>
          </div>
          <div className="hero-subtitulo">Prova de trilha — 8km e 18km</div>
          <div className="hero-chips">
            <div className="chip">📅 {eventDate}</div>
            <div className="chip">📍 {eventLocation}</div>
            <div className="chip chip-lote">
              🎟️ {loteAtual} · inscrições abertas
            </div>
          </div>
        </div>
      </section>

      <div className="divisor-rasgado" />

      <section className="secao-kit">
        <div className="kit-cabecalho">
          <div className="kit-cabecalho-texto">
            <div className="kit-titulo-linha">
              <div className="kit-barra" />
              <h2 className="titulo-secao display">Kit do atleta</h2>
            </div>
            <div className="kit-subtitulo">Incluso na sua inscrição</div>
          </div>
          <svg
            className="kit-trilha"
            width="360"
            height="26"
            viewBox="0 0 360 26"
            fill="none"
          >
            <path
              d="M3 20C60 4 110 24 168 12s112-12 189 4"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="0.1 12"
            />
          </svg>
        </div>
        <div className="kit-cards">
          {ITENS_KIT.map((item, indice) => (
            <button
              className="kit-card"
              key={item.id}
              type="button"
              onClick={() => setItemKitAberto(indice)}
              aria-label={`Ampliar foto: ${item.nome}`}
            >
              <div className="kit-card-foto">
                <img
                  className={item.classeFoto}
                  src={item.imagem}
                  alt={item.alt}
                />
                <span className="kit-lupa" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="10.5"
                      cy="10.5"
                      r="6.5"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </div>
              {item.badge && (
                <div
                  className={
                    item.badge.contorno
                      ? "kit-badge kit-badge-contorno"
                      : "kit-badge"
                  }
                >
                  {item.badge.texto}
                </div>
              )}
              <div className="kit-card-texto">
                <div className="kit-card-nome">{item.nome}</div>
                <div className="kit-card-descricao">{item.descricao}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="conteudo">
        <section className="coluna">
          <h2 className="titulo-secao display">Escolha sua distância</h2>
          <div className="cards-distancia">
            <button
              type="button"
              className={`card-distancia textura ${
                distancia === "8km" ? "selecionada" : ""
              }`}
              onClick={() => trocarDistancia("8km")}
            >
              <div className="card-conteudo">
                <div>
                  <div className="card-km display">8KM</div>
                  <div className="card-descricao">
                    Percurso leve, ideal para quem está estreando na trilha.
                  </div>
                </div>
                <div className="card-preco-bloco">
                  <div className="card-rotulo-inscricao">Inscrição</div>
                  <div className="card-preco display">
                    {formatarPreco(preco8km)}
                  </div>
                  <div className="card-lote">{loteAtual}</div>
                </div>
              </div>
              <div className="card-veu" />
              <div className="card-anel" />
            </button>
            <button
              type="button"
              className={`card-distancia textura ${
                distancia === "18km" ? "selecionada" : ""
              }`}
              onClick={() => trocarDistancia("18km")}
            >
              <div className="card-conteudo">
                <div>
                  <div className="card-km display">18KM</div>
                  <div className="card-descricao">
                    Desafio completo, com subidas técnicas e terreno solto.
                  </div>
                </div>
                <div className="card-preco-bloco">
                  <div className="card-rotulo-inscricao">Inscrição</div>
                  <div className="card-preco display">
                    {formatarPreco(preco18km)}
                  </div>
                  <div className="card-lote">{loteAtual}</div>
                </div>
              </div>
              <div className="card-veu" />
              <div className="card-anel" />
            </button>
          </div>
          <div className="aviso-lote">
            <div className="aviso-lote-icone">!</div>
            <div className="aviso-lote-texto">
              Você está se inscrevendo no <strong>{loteAtual}</strong>. Os
              valores acima valem para este lote e estão sujeitos a reajuste nos
              lotes seguintes.
            </div>
          </div>
          <div className="info-prova">
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
              <path
                d="M2 15C10 4 18 18 26 8s8-4 12 0"
                stroke="#E10600"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
            <div className="info-prova-texto">
              Largada às 6h00 no Povoado Água Preta. Hidratação a cada 4km e
              resgate em todo o percurso.
            </div>
          </div>
        </section>

        <form className="coluna" onSubmit={enviarInscricao}>
          <h2 className="titulo-secao display">Dados do atleta</h2>
          <div className="grid-form">
            <label className="campo campo-largo">
              <span className="campo-rotulo">Nome completo</span>
              <input
                required
                value={form.nome}
                onChange={atualizarCampo("nome")}
                placeholder="Ex.: João Pereira da Silva"
              />
            </label>
            <label className="campo">
              <span className="campo-rotulo">CPF</span>
              <input
                required
                inputMode="numeric"
                value={form.cpf}
                onChange={atualizarCampo("cpf")}
                placeholder="000.000.000-00"
              />
            </label>
            <label className="campo">
              <span className="campo-rotulo">E-mail</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={atualizarCampo("email")}
                placeholder="voce@email.com"
              />
            </label>
            <label className="campo">
              <span className="campo-rotulo">Telefone / WhatsApp</span>
              <input
                required
                inputMode="numeric"
                value={form.telefone}
                onChange={atualizarCampo("telefone")}
                placeholder="(98) 99999-9999"
              />
            </label>
            <label className="campo">
              <span className="campo-rotulo">Data de nascimento</span>
              <input
                type="date"
                required
                value={form.dataNascimento}
                onChange={atualizarCampo("dataNascimento")}
              />
            </label>
            <label className="campo">
              <span className="campo-rotulo">Sexo</span>
              <select
                required
                value={form.sexo}
                onChange={atualizarCampo("sexo")}
              >
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </label>
            <label className="campo">
              <span className="campo-rotulo">Tamanho da camiseta</span>
              <select
                required
                value={form.tamanhoCamiseta}
                onChange={atualizarCampo("tamanhoCamiseta")}
              >
                <option value="">Selecione</option>
                <option value="PP">PP</option>
                <option value="P">P</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="GG">GG</option>
              </select>
            </label>
            <label className="campo">
              <span className="campo-rotulo">
                Equipe / Assessoria (opcional)
              </span>
              <input
                value={form.equipe}
                onChange={atualizarCampo("equipe")}
                placeholder="Nome da equipe"
              />
            </label>
          </div>

          <div className="campo campo-cupom">
            <span className="campo-rotulo">Cupom de desconto (opcional)</span>
            <div className="cupom-linha">
              <input
                value={cupom}
                onChange={(event) => {
                  setCupom(event.target.value.toUpperCase());
                  setErroCupom(null);
                }}
                placeholder="Digite o código"
                disabled={cupomAplicado !== null}
                autoComplete="off"
              />
              {cupomAplicado ? (
                <button
                  className="botao-cupom botao-cupom-remover"
                  type="button"
                  onClick={removerCupom}
                >
                  Remover
                </button>
              ) : (
                <button
                  className="botao-cupom"
                  type="button"
                  disabled={validandoCupom || cupom.trim() === ""}
                  onClick={() => validarCupom(cupom, distancia)}
                >
                  {validandoCupom ? "Validando..." : "Aplicar"}
                </button>
              )}
            </div>
            {cupomAplicado && (
              <div className="cupom-aviso cupom-aviso-ok">
                Cupom {cupomAplicado.codigo} aplicado —{" "}
                {formatarPreco(cupomAplicado.desconto)} de desconto.
              </div>
            )}
            {erroCupom && (
              <div className="cupom-aviso cupom-aviso-erro">{erroCupom}</div>
            )}
          </div>

          {menorDeIdade && (
            <div className="aviso-menor">
              <div className="aviso-menor-icone">!</div>
              <div className="aviso-menor-texto">
                Atleta com menos de 18 anos: além do aceite aqui, é obrigatório
                levar o{" "}
                <strong>
                  Termo de Responsabilidade impresso e assinado pelo responsável
                  legal
                </strong>
                , com o documento de identidade dele, na retirada do kit.
              </div>
            </div>
          )}

          <div className="bloco-termo">
            <label className="campo-termo">
              <input
                type="checkbox"
                required
                checked={termoAceito}
                onChange={(event) => setTermoAceito(event.target.checked)}
              />
              <span>
                Li e aceito o <strong>Termo de Responsabilidade</strong> da
                prova, incluindo a assunção dos riscos da participação.
              </span>
            </label>
            <button
              className="link-termo"
              type="button"
              onClick={() => setTermoAberto(true)}
            >
              Ler o termo completo
            </button>
          </div>

          {erro && (
            <div className="banner-erro">
              <div className="banner-erro-icone">!</div>
              <div>
                <div className="banner-erro-titulo">{erro}</div>
                <div className="banner-erro-texto">
                  Confira os dados e tente novamente.
                </div>
              </div>
            </div>
          )}

          <div className="linha-total">
            <span className="linha-total-rotulo">
              Total — {distancia} · {loteAtual}
              {cupomAplicado && (
                <span className="linha-total-desconto">
                  cupom {cupomAplicado.codigo}: −{formatarPreco(desconto)}
                </span>
              )}
            </span>
            <span className="linha-total-valor display">
              {cupomAplicado && (
                <span className="linha-total-antigo">
                  {formatarPreco(preco)}
                </span>
              )}
              {formatarPreco(total)}
            </span>
          </div>
          <button className="botao-cta" type="submit" disabled={enviando}>
            {enviando
              ? "Redirecionando para o pagamento..."
              : `Inscrever-se — ${formatarPreco(total)}`}
          </button>
          <div className="nota-rodape">
            Pagamento via Pix ou cartão · vagas limitadas a 400 atletas
          </div>
        </form>
      </div>

      <div className="divisor-premiacao" />

      <section className="secao-premiacao">
        <div className="premiacao-splatter" />
        <div className="premiacao-cabecalho">
          <div className="premiacao-cabecalho-texto">
            <div className="premiacao-titulo-linha">
              <div className="premiacao-barra" />
              <h2 className="titulo-secao display">Premiação</h2>
            </div>
            <div className="premiacao-subtitulo">
              2ª edição · 8km e 18km — premiação do 1º ao 3º lugar
            </div>
          </div>
          <svg
            className="premiacao-trilha"
            width="360"
            height="26"
            viewBox="0 0 360 26"
            fill="none"
          >
            <path
              d="M3 20C60 4 110 24 168 12s112-12 189 4"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="0.1 12"
            />
          </svg>
        </div>

        <div className="premiacao-cards">
          {PREMIACAO.map((premio) => (
            <div className="premiacao-card" key={premio.distancia}>
              <div className="premiacao-card-topo">
                <div className="premiacao-km display">{premio.distancia}</div>
                <div className="premiacao-etiqueta">{premio.etiqueta}</div>
              </div>

              {premio.distancia === "8KM" && (
                <div className="premiacao-aviso">
                  <div className="premiacao-aviso-icone">!</div>
                  <div className="premiacao-aviso-texto">
                    <div className="premiacao-aviso-titulo display">
                      O 8km premia só a geral
                    </div>
                    <div>
                      Apenas 1º, 2º e 3º lugares da classificação geral
                      masculina e feminina — cada um recebe{" "}
                      <strong>medalha + troféu + prêmio em dinheiro</strong>. No
                      8km <strong>não há premiação por faixa etária</strong> —
                      nem dinheiro, nem troféu.
                    </div>
                  </div>
                </div>
              )}

              <div className="premiacao-listas">
                {CATEGORIAS.map((categoria) => (
                  <div className="premiacao-lista" key={categoria}>
                    <div className="premiacao-lista-rotulo">{categoria}</div>
                    {premio.valores.map((valor, indice) => (
                      <div className="premiacao-linha" key={valor}>
                        <span className="premiacao-colocacao">
                          {indice + 1}º · medalha + troféu
                        </span>
                        <span className="premiacao-valor display">
                          R$ {valor}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="premiacao-faixas">
          <div className="premiacao-faixas-texto">
            <div className="premiacao-faixas-titulo display">
              Faixas de idade — 18km
            </div>
            <div className="premiacao-faixas-descricao">
              Exclusivas do 18km · masculino e feminino · do 1º ao 3º lugar:
              medalha + troféu. <strong>Não vale para o 8km.</strong>
            </div>
          </div>
          <div className="premiacao-faixas-chips">
            {FAIXAS_18KM.map((faixa) => (
              <div className="chip-faixa" key={faixa}>
                {faixa}
              </div>
            ))}
          </div>
        </div>
      </section>

      {itemKitAberto !== null && (
        <VisualizadorKit
          itens={ITENS_KIT}
          indice={itemKitAberto}
          aoFechar={() => setItemKitAberto(null)}
          aoTrocar={setItemKitAberto}
        />
      )}

      {termoAberto && (
        <ModalTermo
          nome={form.nome}
          documento={form.cpf}
          aoFechar={() => setTermoAberto(false)}
          aoAceitar={() => {
            setTermoAceito(true);
            setTermoAberto(false);
          }}
        />
      )}
    </main>
  );
}
