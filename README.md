# Corrida Trilha — Inscrições

Aplicação de inscrições para evento de corrida de trilha com duas distâncias (8km e 18km), painel de administração e pagamento via Mercado Pago (Checkout Pro).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- SQLite via `node:sqlite` (requer Node 22.5+; sem dependência nativa)
- Mercado Pago SDK v2 (Checkout Pro + webhook de notificação)

## Rodando localmente

```bash
cp .env.example .env.local   # edite os valores
npm install
npm run dev
```

- Página de inscrição: http://localhost:3000
- Painel admin: http://localhost:3000/admin (senha em `ADMIN_PASSWORD`)

## Configuração (`.env.local`)

| Variável                                                | Descrição                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `EVENT_NAME` / `NEXT_PUBLIC_EVENT_NAME`                 | Nome do evento                                                       |
| `NEXT_PUBLIC_EVENT_DATE` / `NEXT_PUBLIC_EVENT_LOCATION` | Data e local exibidos na página                                      |
| `PRECO_8KM` / `PRECO_18KM` (+ versões `NEXT_PUBLIC_`)   | Valores das inscrições                                               |
| `NEXT_PUBLIC_LOTE_ATUAL`                                | Lote exibido na página (default `1º lote`)                           |
| `MP_ACCESS_TOKEN`                                       | Access token do Mercado Pago (use o de TESTE em dev)                 |
| `APP_URL`                                               | URL pública do app (back_urls e webhook do MP)                       |
| `ADMIN_PASSWORD`                                        | Senha do painel `/admin`                                             |
| `DATABASE_PATH`                                         | Caminho do arquivo SQLite (no Railway: `/data/corrida.db` no volume) |

## Termo de Responsabilidade

O texto fica em `src/lib/termo.ts` e e aceito por checkbox obrigatorio no
formulario (validado tambem no `POST /api/inscricoes`). Cada inscricao guarda
`termo_aceito_em`, `termo_versao`, `termo_ip` e `termo_user_agent`.

Regra: **toda alteracao no texto exige bump em `TERMO_VERSAO`** — a versao
gravada em cada inscricao so vale como prova se permitir reproduzir a redacao
exata que o atleta aceitou. Isso inclui mudar a data da prova.

Inscricoes anteriores a essa funcionalidade tem `termo_aceito_em` nulo e
aparecem no painel com a tarja **sem termo**: o termo assinado precisa ser
colhido em papel na retirada do kit.

Atletas com menos de 18 anos aceitam pelo site, mas o painel, o leitor de QR,
o e-mail e a pagina do kit avisam que a via impressa assinada pelo responsavel
legal e obrigatoria na retirada. A idade e sempre calculada na hora, nunca
gravada.

## Fluxo de pagamento

1. Atleta preenche o formulário e escolhe a distância → `POST /api/inscricoes` grava a inscrição como `pendente` e cria uma _preference_ no Mercado Pago.
2. Atleta é redirecionado ao Checkout Pro (`init_point`).
3. Mercado Pago chama `POST /api/webhook/mercadopago` (apenas com `APP_URL` https); o app consulta o pagamento e atualiza o status para `pago` / `pendente` / `cancelado` via `external_reference` (id da inscrição).
4. O atleta volta pelo `back_url` para `/inscricao/retorno`.

Em desenvolvimento local (sem https) o webhook não é registrado — confirme pagamentos manualmente no painel admin ou use um túnel (ngrok/cloudflared) apontando `APP_URL` para a URL https do túnel.

### Credenciais do Mercado Pago

1. Crie uma aplicação em https://www.mercadopago.com.br/developers/panel/app
2. Em **Credenciais de teste**, copie o _Access Token_ para `MP_ACCESS_TOKEN`
3. Para testar o checkout, use contas de teste (comprador/vendedor) e os cartões de teste da documentação
4. Em produção, troque pelo _Access Token_ de produção

## Painel admin (`/admin`)

- Estatísticas: total de inscritos, por distância, pagos, pendentes e receita confirmada
- Busca por nome, CPF ou e-mail + filtros por distância e status
- Alterar distância do atleta (recalcula o valor se ainda estiver pendente)
- Alterar status de pagamento manualmente (ex.: pagamento fora da plataforma)
- Excluir inscrição
- Exportar CSV (separador `;`, pronto para Excel)

## Deploy (Railway)

1. Crie o projeto e adicione um volume montado em `/data`
2. Configure as variáveis de ambiente com `DATABASE_PATH=/data/corrida.db` e `APP_URL=https://<seu-dominio>`
3. O banco é criado automaticamente no primeiro acesso (schema idempotente, conexão lazy)
