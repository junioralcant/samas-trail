"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

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

const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "Corrida de Trilha";
const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE ?? "Data a definir";
const eventLocation =
  process.env.NEXT_PUBLIC_EVENT_LOCATION ?? "Local a definir";
const preco8km = Number(process.env.NEXT_PUBLIC_PRECO_8KM ?? "89.90");
const preco18km = Number(process.env.NEXT_PUBLIC_PRECO_18KM ?? "129.90");

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

export default function InscricaoPage() {
  const [distancia, setDistancia] = useState<Distancia>("8km");
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
        body: JSON.stringify({ ...form, distancia }),
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
      <section className="hero">
        <h1>{eventName}</h1>
        <p className="tagline">
          Prova de trilha — escolha seu desafio: 8km ou 18km
        </p>
        <div className="meta">
          <span>📅 {eventDate}</span>
          <span>📍 {eventLocation}</span>
        </div>
      </section>

      <div className="container">
        <div className="cards-distancia">
          <button
            type="button"
            className={`card-distancia ${
              distancia === "8km" ? "selecionada" : ""
            }`}
            onClick={() => setDistancia("8km")}
          >
            <div className="km">8km</div>
            <div className="descricao">
              Percurso leve para quem está começando na trilha
            </div>
            <div className="preco">{formatarPreco(preco8km)}</div>
          </button>
          <button
            type="button"
            className={`card-distancia ${
              distancia === "18km" ? "selecionada" : ""
            }`}
            onClick={() => setDistancia("18km")}
          >
            <div className="km">18km</div>
            <div className="descricao">
              Desafio completo com subidas técnicas e travessias
            </div>
            <div className="preco">{formatarPreco(preco18km)}</div>
          </button>
        </div>

        <form className="form-card" onSubmit={enviarInscricao}>
          <h2>Dados do atleta — {distancia}</h2>
          <div className="grid-form">
            <div className="campo" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="nome">Nome completo *</label>
              <input
                id="nome"
                required
                value={form.nome}
                onChange={atualizarCampo("nome")}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="campo">
              <label htmlFor="cpf">CPF *</label>
              <input
                id="cpf"
                required
                inputMode="numeric"
                value={form.cpf}
                onChange={atualizarCampo("cpf")}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="campo">
              <label htmlFor="email">E-mail *</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={atualizarCampo("email")}
                placeholder="voce@email.com"
              />
            </div>
            <div className="campo">
              <label htmlFor="telefone">Telefone / WhatsApp *</label>
              <input
                id="telefone"
                required
                inputMode="numeric"
                value={form.telefone}
                onChange={atualizarCampo("telefone")}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="campo">
              <label htmlFor="dataNascimento">Data de nascimento *</label>
              <input
                id="dataNascimento"
                type="date"
                required
                value={form.dataNascimento}
                onChange={atualizarCampo("dataNascimento")}
              />
            </div>
            <div className="campo">
              <label htmlFor="sexo">Sexo *</label>
              <select
                id="sexo"
                required
                value={form.sexo}
                onChange={atualizarCampo("sexo")}
              >
                <option value="">Selecione</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="tamanhoCamiseta">Tamanho da camiseta *</label>
              <select
                id="tamanhoCamiseta"
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
            </div>
            <div className="campo">
              <label htmlFor="equipe">Equipe / Assessoria (opcional)</label>
              <input
                id="equipe"
                value={form.equipe}
                onChange={atualizarCampo("equipe")}
                placeholder="Nome da equipe"
              />
            </div>
          </div>

          {erro && <div className="mensagem-erro">{erro}</div>}

          <button className="botao-primario" type="submit" disabled={enviando}>
            {enviando
              ? "Redirecionando para o pagamento..."
              : `Inscrever-se — ${formatarPreco(
                  distancia === "8km" ? preco8km : preco18km,
                )}`}
          </button>
        </form>
      </div>
    </main>
  );
}
