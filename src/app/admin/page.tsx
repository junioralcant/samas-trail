"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

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
  criado_em: string;
};

type Stats = {
  total: number;
  total8km: number;
  total18km: number;
  pagos: number;
  pendentes: number;
  receita: number;
};

const formatarPreco = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatarCpf = (cpf: string) =>
  cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filtroDistancia, setFiltroDistancia] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");

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
    campos: { distancia?: Distancia; statusPagamento?: StatusPagamento },
  ) => {
    await fetch(`/api/admin/inscricoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    await carregarInscricoes();
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

  if (autenticado === null) {
    return <div className="vazio">Carregando...</div>;
  }

  if (!autenticado) {
    return (
      <main className="login-wrapper">
        <form className="login-card" onSubmit={fazerLogin}>
          <h1>Painel do organizador</h1>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Senha de administração"
            />
          </div>
          {erroLogin && <div className="mensagem-erro">{erroLogin}</div>}
          <button className="botao-primario" type="submit">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <header className="admin-topo">
        <h1>🏃 Painel de inscrições</h1>
        <div className="acoes">
          <a href="/api/admin/export">
            <button className="botao-secundario" type="button">
              Exportar CSV
            </button>
          </a>
          <button className="botao-perigo" type="button" onClick={fazerLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="admin-container">
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="rotulo">Total de inscritos</div>
              <div className="valor">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="rotulo">8km</div>
              <div className="valor">{stats.total8km}</div>
            </div>
            <div className="stat-card">
              <div className="rotulo">18km</div>
              <div className="valor">{stats.total18km}</div>
            </div>
            <div className="stat-card">
              <div className="rotulo">Pagos</div>
              <div className="valor">{stats.pagos}</div>
            </div>
            <div className="stat-card">
              <div className="rotulo">Pendentes</div>
              <div className="valor">{stats.pendentes}</div>
            </div>
            <div className="stat-card">
              <div className="rotulo">Receita confirmada</div>
              <div className="valor">{formatarPreco(stats.receita)}</div>
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

        <div className="tabela-wrapper">
          {inscricoes.length === 0 ? (
            <div className="vazio">Nenhuma inscrição encontrada.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th>CPF</th>
                  <th>Contato</th>
                  <th>Camiseta</th>
                  <th>Equipe</th>
                  <th>Distância</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Inscrito em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {inscricoes.map((inscricao) => (
                  <tr key={inscricao.id}>
                    <td>{inscricao.nome}</td>
                    <td>{formatarCpf(inscricao.cpf)}</td>
                    <td>
                      {inscricao.email}
                      <br />
                      {inscricao.telefone}
                    </td>
                    <td>{inscricao.tamanho_camiseta}</td>
                    <td>{inscricao.equipe ?? "—"}</td>
                    <td>
                      <select
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
                    </td>
                    <td>{formatarPreco(inscricao.valor)}</td>
                    <td>
                      <span className={`badge ${inscricao.status_pagamento}`}>
                        {inscricao.status_pagamento}
                      </span>
                    </td>
                    <td>{inscricao.criado_em}</td>
                    <td>
                      <div className="acoes">
                        <select
                          value={inscricao.status_pagamento}
                          onChange={(event) =>
                            atualizarInscricao(inscricao.id, {
                              statusPagamento: event.target
                                .value as StatusPagamento,
                            })
                          }
                        >
                          <option value="pendente">pendente</option>
                          <option value="pago">pago</option>
                          <option value="cancelado">cancelado</option>
                        </select>
                        <button
                          className="botao-perigo"
                          type="button"
                          onClick={() => excluirInscricao(inscricao)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
