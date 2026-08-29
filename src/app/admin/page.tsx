"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import LeitorKit from "./LeitorKit";

type Distancia = "8km" | "18km";
type StatusPagamento = "pendente" | "pago" | "cancelado";

type Inscricao = {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  sexo: string;
  tamanho_camiseta: string;
  equipe: string | null;
  distancia: Distancia;
  valor: number;
  status_pagamento: StatusPagamento;
  kit_retirado_em: string | null;
  criado_em: string;
};

type Stats = {
  total: number;
  total8km: number;
  total18km: number;
  pagos: number;
  pendentes: number;
  receita: number;
  kitsRetirados: number;
};

const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE ?? "";

const formatarPreco = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatarCpf = (cpf: string) =>
  cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

const percentual = (parte: number, total: number) =>
  total > 0 ? `${Math.round((parte / total) * 100)}% do total` : "—";

const LogoLinha = () => (
  <div className="logo-linha display">
    <span className="logo-linha-samas">SAMAS</span>
    <span className="logo-linha-trail">TRAIL</span>
  </div>
);

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filtroDistancia, setFiltroDistancia] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [atualizadoAs, setAtualizadoAs] = useState("");

  const carregarInscricoes = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroDistancia) {
      params.set("distancia", filtroDistancia);
    }
    if (filtroStatus) {
      params.set("status", filtroStatus);
    }
    if (busca) {
      params.set("busca", busca);
    }
    const response = await fetch(`/api/admin/inscricoes?${params.toString()}`);
    if (response.status === 401) {
      setAutenticado(false);
      return;
    }
    const data = await response.json();
    setInscricoes(data.inscricoes);
    setStats(data.stats);
    setAtualizadoAs(
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    setAutenticado(true);
  }, [filtroDistancia, filtroStatus, busca]);

  useEffect(() => {
    carregarInscricoes();
  }, [carregarInscricoes]);

  const fazerLogin = async (event: FormEvent) => {
    event.preventDefault();
    setErroLogin(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (!response.ok) {
      setErroLogin("Senha incorreta");
      return;
    }
    setSenha("");
    await carregarInscricoes();
  };

  const fazerLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAutenticado(false);
    setInscricoes([]);
    setStats(null);
  };

  const atualizarInscricao = async (
    id: number,
    campos: {
      distancia?: Distancia;
      statusPagamento?: StatusPagamento;
      kitRetirado?: boolean;
    },
  ) => {
    await fetch(`/api/admin/inscricoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    await carregarInscricoes();
  };

  const alternarKit = async (inscricao: Inscricao) => {
    const confirmado = window.confirm(
      inscricao.kit_retirado_em
        ? `Desfazer a retirada do kit de ${inscricao.nome}?`
        : `Confirmar a retirada do kit de ${inscricao.nome} (${inscricao.distancia}, camiseta ${inscricao.tamanho_camiseta})?`,
    );
    if (!confirmado) {
      return;
    }
    await atualizarInscricao(inscricao.id, {
      kitRetirado: !inscricao.kit_retirado_em,
    });
  };

  const excluirInscricao = async (inscricao: Inscricao) => {
    const confirmado = window.confirm(
      `Excluir a inscrição de ${inscricao.nome}? Esta ação não pode ser desfeita.`,
    );
    if (!confirmado) {
      return;
    }
    await fetch(`/api/admin/inscricoes/${inscricao.id}`, { method: "DELETE" });
    await carregarInscricoes();
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroDistancia("");
    setFiltroStatus("");
  };

  if (autenticado === null) {
    return <div className="carregando">Carregando...</div>;
  }

  if (!autenticado) {
    return (
      <main className="login-wrapper textura">
        <form className="login-card" onSubmit={fazerLogin}>
          <div className="login-cabecalho">
            <LogoLinha />
            <div className="login-titulo display">Painel do organizador</div>
            <div className="login-subtexto">
              Acesso restrito à equipe da prova.
            </div>
          </div>
          <div className="login-divisor" />
          <label className="campo">
            <span className="campo-rotulo">Senha</span>
            <input
              type="password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          {erroLogin && (
            <div className="banner-erro">
              <div className="banner-erro-icone">!</div>
              <div className="banner-erro-titulo">{erroLogin}</div>
            </div>
          )}
          <button className="botao-cta" type="submit">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <header className="admin-topo">
        <div className="admin-marca">
          <LogoLinha />
          <div className="admin-marca-divisor" />
          <div className="admin-marca-titulo">Painel de inscrições</div>
        </div>
        <div className="admin-acoes">
          <LeitorKit onConfirmado={carregarInscricoes} />
          <a href="/api/admin/export">
            <button className="botao-vermelho" type="button">
              Exportar CSV
            </button>
          </a>
          <button
            className="botao-contorno"
            type="button"
            onClick={fazerLogout}
          >
            Sair
          </button>
        </div>
      </header>

      <div className="admin-container">
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-rotulo">Total de inscritos</div>
              <div className="stat-valor display">{stats.total}</div>
              <div className="stat-nota">prova em {eventDate}</div>
            </div>
            <div className="stat-card">
              <div className="stat-rotulo">8 km</div>
              <div className="stat-valor display">{stats.total8km}</div>
              <div className="stat-nota">
                {percentual(stats.total8km, stats.total)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-rotulo">18 km</div>
              <div className="stat-valor display">{stats.total18km}</div>
              <div className="stat-nota">
                {percentual(stats.total18km, stats.total)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-rotulo">Pagos</div>
              <div className="stat-valor display">{stats.pagos}</div>
              <div className="stat-nota">
                {stats.total > 0
                  ? `${Math.round(
                      (stats.pagos / stats.total) * 100,
                    )}% confirmados`
                  : "—"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-rotulo">Pendentes</div>
              <div className="stat-valor display">{stats.pendentes}</div>
              <div className="stat-nota">aguardando confirmação</div>
            </div>
            <div className="stat-card">
              <div className="stat-rotulo">Receita confirmada</div>
              <div className="stat-valor display">
                {formatarPreco(stats.receita)}
              </div>
              <div className="stat-nota">pagamentos aprovados</div>
            </div>
            <div className="stat-card">
              <div className="stat-rotulo">Kits retirados</div>
              <div className="stat-valor display">{stats.kitsRetirados}</div>
              <div className="stat-nota">
                {percentual(stats.kitsRetirados, stats.pagos)
                  .replace("do total", "dos pagos")}
              </div>
            </div>
          </div>
        )}

        <div className="filtros">
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, CPF ou e-mail"
          />
          <select
            value={filtroDistancia}
            onChange={(event) => setFiltroDistancia(event.target.value)}
          >
            <option value="">Todas as distâncias</option>
            <option value="8km">8km</option>
            <option value="18km">18km</option>
          </select>
          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="tabela-card">
          <div className="tabela-scroll">
            <div className="tabela-grid">
              <div className="tabela-colunas tabela-cabecalho">
                <div>Atleta</div>
                <div>CPF</div>
                <div>Contato</div>
                <div>Camiseta</div>
                <div>Equipe</div>
                <div>Distância</div>
                <div>Valor</div>
                <div>Status</div>
                <div>Kit</div>
                <div>Inscrito em</div>
                <div>Ações</div>
              </div>
              {inscricoes.length === 0 ? (
                <div className="estado-vazio">
                  <svg
                    width="70"
                    height="26"
                    viewBox="0 0 70 26"
                    fill="none"
                    style={{ opacity: 0.4 }}
                  >
                    <path
                      d="M3 20C16 5 28 24 42 12s16-9 25-2"
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="0.1 10"
                    />
                  </svg>
                  <div className="estado-vazio-titulo display">
                    Nenhuma inscrição encontrada
                  </div>
                  <div className="estado-vazio-texto">
                    Ajuste a busca ou limpe os filtros de distância e status.
                  </div>
                  <button
                    className="botao-contorno"
                    type="button"
                    onClick={limparFiltros}
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                inscricoes.map((inscricao) => (
                  <div
                    className="tabela-colunas tabela-linha"
                    key={inscricao.id}
                  >
                    <div className="celula-nome">{inscricao.nome}</div>
                    <div className="celula-numerica">
                      {formatarCpf(inscricao.cpf)}
                    </div>
                    <div className="celula-contato">
                      <span className="celula-contato-email">
                        {inscricao.email}
                      </span>
                      <span className="celula-contato-fone">
                        {inscricao.telefone}
                      </span>
                    </div>
                    <div className="celula-secundaria">
                      {inscricao.tamanho_camiseta}
                    </div>
                    <div className="celula-secundaria">
                      {inscricao.equipe ?? "—"}
                    </div>
                    <div>
                      <select
                        className="select-tabela"
                        value={inscricao.distancia}
                        onChange={(event) =>
                          atualizarInscricao(inscricao.id, {
                            distancia: event.target.value as Distancia,
                          })
                        }
                      >
                        <option value="8km">8km</option>
                        <option value="18km">18km</option>
                      </select>
                    </div>
                    <div className="celula-valor">
                      {formatarPreco(inscricao.valor)}
                    </div>
                    <div>
                      <span className={`badge ${inscricao.status_pagamento}`}>
                        {inscricao.status_pagamento}
                      </span>
                    </div>
                    <div>
                      <button
                        className={`botao-kit ${
                          inscricao.kit_retirado_em ? "retirado" : ""
                        }`}
                        type="button"
                        title={
                          inscricao.kit_retirado_em
                            ? `Retirado em ${inscricao.kit_retirado_em} — clique para desfazer`
                            : "Confirmar retirada do kit"
                        }
                        onClick={() => alternarKit(inscricao)}
                      >
                        {inscricao.kit_retirado_em ? "✔ Retirado" : "Pendente"}
                      </button>
                    </div>
                    <div className="celula-data">{inscricao.criado_em}</div>
                    <div className="celula-acoes">
                      <select
                        className="select-tabela"
                        value={inscricao.status_pagamento}
                        onChange={(event) =>
                          atualizarInscricao(inscricao.id, {
                            statusPagamento: event.target
                              .value as StatusPagamento,
                          })
                        }
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <button
                        className="botao-excluir"
                        type="button"
                        onClick={() => excluirInscricao(inscricao)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div className="tabela-rodape">
                <span>
                  Mostrando {inscricoes.length} de {stats?.total ?? 0}{" "}
                  inscrições
                </span>
                <span>
                  {atualizadoAs ? `Atualizado às ${atualizadoAs}` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
