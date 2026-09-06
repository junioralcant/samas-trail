# Plano de implementação — venda de camisa extra (de R$ 45 por R$ 20)

## Contexto

A organização vai vender uma **camisa extra** — modelo azul-royal, **diferente da camiseta azul-marinho que já vem no kit** (`public/kit/camiseta.jpeg`). O preço cheio é R$ 45 e ela entra agora em promoção por R$ 20.

A peça tem **duas artes, e as duas precisam aparecer na venda**:

- **Frente** — "SAMAS TRAIL" em pincel, com BRUTO Suplementos e ProjetAgro no peito.
- **Costas** — "NASCIDOS NO ASFALTO E CRIADOS NA TRILHA", com Andrey Lucas Personal Trainer e FM Studio Nail Desing.

Como cada face traz patrocinadores diferentes, mostrar só a frente esconde metade do produto (e metade da contrapartida dos patrocinadores) — as duas entram na galeria da compra.

### O estoque é finito e pequeno

São **54 peças que sobraram da produção**, e não haverá reposição — a promoção de R$ 20 é queima de estoque:

| Tamanho | P | M | G | GG | XG |
|---|---|---|---|---|---|
| Peças | **0** | 33 | 16 | 4 | 1 |

Isso muda duas coisas de base:

- **A grade de tamanhos da camisa extra é diferente da do kit.** O kit vende PP–GG; a camisa extra **não tem PP e tem XG**, tamanho que não existe em lugar nenhum do sistema hoje. São duas listas distintas, não uma compartilhada.
- **Vender o que não existe é o pior defeito possível aqui.** Com 1 XG e 4 GG, duas pessoas comprando ao mesmo tempo é cenário provável já no primeiro dia da promoção, e a organização estaria devendo camisa a quem já pagou. O controle de estoque não é enfeite do painel: é requisito do checkout.

Decisões já tomadas: até **5 camisas por pedido, com tamanho escolhido por camisa**; venda **aberta a qualquer pessoa**; preço, promoção **e estoque editáveis no painel admin** (sem redeploy); **e-mail de confirmação com QR próprio** para quem não tem inscrição; estoque **exclusivo da camisa extra** (inscrição nova não consome essas 54); **reserva na compra com expiração**; e tamanho esgotado **visível e desabilitado**, não escondido.

Hoje o site só sabe vender inscrição: um CPF → uma linha em `inscricoes` → uma preferência no Mercado Pago cujo `external_reference` é o id da inscrição. Precisamos de três coisas que não cabem nesse modelo:

1. **Compra avulsa** da camisa, por qualquer pessoa — inclusive quem não corre.
2. **Compra junto da inscrição**, paga no mesmo checkout.
3. Quando o CPF da compra avulsa bate com uma inscrição já existente, **vincular** os dois automaticamente — e deixar isso explícito no painel admin, porque na entrega o kit e a camisa saem juntos.

---

## Modelo de dados

Três tabelas novas em `src/lib/db.ts` (`SCHEMA` + `migrar`, tudo aditivo — o banco de produção fica num volume do Railway e não pode ser recriado). Nenhuma coluna nova em `inscricoes`: o vínculo mora do lado do pedido.

```sql
pedidos_camisa (
  id, inscricao_id (NULL, REFERENCES inscricoes ON DELETE SET NULL),
  nome, cpf, email, telefone,
  origem CHECK IN ('avulso','inscricao'),
  quantidade, valor_unitario, valor, promocional,
  status_pagamento CHECK IN ('pendente','pago','cancelado'),
  mp_preference_id, mp_payment_id,
  token,            -- 32 hex, mesmo formato do kit_token (reusa gerarKitToken)
  reservado_ate,    -- datetime local; enquanto não vence, o pendente segura o estoque
  estoque_estourado,-- 1 quando o pagamento entrou sem peça disponível (ver abaixo)
  retirado_em, criado_em
)
itens_camisa (id, pedido_id REFERENCES pedidos_camisa ON DELETE CASCADE,
              tamanho, quantidade, UNIQUE(pedido_id, tamanho))
estoque_camisa (tamanho PRIMARY KEY, total, atualizado_em)
configuracoes (chave PRIMARY KEY, valor, atualizado_em)
```

`estoque_camisa` é semeado na migração com os números reais (`P=0, M=33, G=16, GG=4, XG=1`) e só se a tabela estiver vazia, para não sobrescrever ajustes do admin em deploys seguintes.

`origem` é o eixo do desenho:

- **`avulso`** — preferência própria no MP, `external_reference = "camisa-<id>"`, e-mail e QR próprios.
- **`inscricao`** — sem preferência própria; entra como item extra na preferência da inscrição e o status espelha o da inscrição.

Índices: único em `token`, comuns em `cpf` e `inscricao_id`. `getDb()` passa a executar `PRAGMA foreign_keys = ON` (hoje não há nenhuma FK no banco, então não muda nada do que já existe) para o `ON DELETE SET NULL`/`CASCADE` valer — excluir uma inscrição no admin não pode apagar uma camisa já paga.

**Namespace do `external_reference`:** a inscrição continua usando o id puro (`"12"`), sem migração e sem quebrar as pendentes; só a camisa avulsa ganha prefixo. Isso também reduz o risco já conhecido de colisão com compras pessoais da conta do Mercado Pago.

---

## Preço e promoção editáveis (`src/lib/configuracoes.ts` — novo)

Chaves `camisa_preco` e `camisa_preco_promo` na tabela `configuracoes`.

```
lerConfiguracao(chave) / gravarConfiguracao(chave, valor|null)
getPrecoCamisa() -> { precoCheio, precoPromo, precoAtual, emPromocao }
```

Sem linha no banco, cai nos envs `PRECO_CAMISA` (45.00) e `PRECO_CAMISA_PROMO` (20.00) — assim a promoção já nasce ligada e os testes não dependem de seed. **Limpar o campo de promoção no admin desliga a promoção** e a camisa volta a R$ 45; não há flag separada. Valores usam `arredondar()` de `src/lib/cupom.ts` e respeitam `VALOR_MINIMO`.

O preço é sempre resolvido no servidor. O cliente manda só tamanhos e quantidades.

Duas listas de tamanho, **separadas de propósito**, em `src/lib/config.ts`:

- `TAMANHOS_CAMISETA = ["PP","P","M","G","GG"]` — a camiseta do kit. Hoje está escrita à mão no `<select>` de `src/app/page.tsx`; vira fonte única, mas **não muda**: inscrição não consome o estoque da camisa extra.
- `TAMANHOS_CAMISA_EXTRA = ["P","M","G","GG","XG"]` — a camisa extra. Sem PP, com XG.

Tentar unificar as duas seria a economia errada: são grades diferentes, de peças diferentes, com estoques diferentes.

---

## Estoque e reserva (`src/lib/estoque.ts` — novo)

O estoque **não é um contador que se decrementa** — é sempre calculado a partir dos pedidos, com `estoque_camisa.total` como a quantidade física existente. Assim não há decremento duplicado, decremento esquecido, nem drift entre o contador e a realidade; e o admin pode corrigir `total` sem precisar recalcular nada.

```
disponivel(tamanho) = total
  − Σ itens de pedidos pagos
  − Σ itens de pedidos pendentes cuja reserva ainda não venceu
```

Em SQL, a reserva é só uma cláusula `WHERE` — não precisa de cron nem de job de limpeza:

```sql
p.status_pagamento = 'pago'
OR (p.status_pagamento = 'pendente'
    AND p.reservado_ate > datetime('now','localtime'))
```

`reservado_ate` é gravado na criação do pedido como `datetime('now','localtime','+N minutes')`, com N em `configuracoes` (`camisa_reserva_minutos`, padrão **30**, acima do prazo de expiração do Pix). Pedido cancelado devolve a peça na hora; pendente abandonado devolve sozinho quando a reserva vence.

**A checagem e a gravação acontecem na mesma transação**, aberta com `BEGIN IMMEDIATE` para tomar o lock de escrita antes da leitura — sem isso, duas requisições simultâneas leem "1 XG disponível" e ambas passam. Com 1 XG e 4 GG, isso não é hipótese remota: é o primeiro dia da promoção.

Funções: `disponibilidade()` (mapa tamanho → disponível), `verificarDisponibilidade(itens)` e `reservar(pedidoId, itens)` dentro da transação.

### Quando o dinheiro entra e a peça não existe mais

Caso real: alguém abre o checkout, a reserva vence, outra pessoa leva a última GG, e então o primeiro paga. **O pagamento é aceito** — não se recusa dinheiro já capturado nem se cancela silenciosamente um pedido pago. O pedido é gravado com `estoque_estourado = 1` e aparece **destacado no painel**, para a organização resolver por contato direto (trocar tamanho ou devolver). Fingir que não aconteceu seria pior: a pessoa só descobriria na fila da retirada.

---

## Checkout

### Compra avulsa — `POST /api/camisas` (novo)

Payload `{ nome, cpf, email, telefone, tamanhos: [{ tamanho, quantidade }] }`. Reusa `limparCpf`/`validarCpf` (`src/lib/cpf.ts`) e o mesmo formato de erro das outras rotas (`{ erro }` + status). Valida tamanhos contra `TAMANHOS_CAMISA_EXTRA` e total entre 1 e 5.

**Estoque:** dentro da transação, confere `verificarDisponibilidade` antes de inserir. Faltando peça, devolve **409** com o que sobrou por tamanho, para o formulário corrigir a seleção em vez de só mostrar erro — quem tentou 2 XG precisa saber que existe 1. Além do teto global de 5, cada tamanho é limitado a `min(5, disponível)`.

Vínculo: procura `inscricoes WHERE cpf = ? AND status_pagamento != 'cancelado'`, preferindo a paga e a mais recente. Achou → grava `inscricao_id`. Não achou → pedido solto, igualmente válido.

Cria a preferência com `getPreferenceClient()` (um item por tamanho, para o comprovante do MP ficar legível), `external_reference: "camisa-<id>"`, `back_urls` apontando para `/camisa/retorno` e o mesmo `notification_url` do webhook atual. Se a criação falhar, apaga o pedido — mesmo tratamento que `src/app/api/inscricoes/route.ts` já faz com a inscrição.

### Compra junto da inscrição — `POST /api/inscricoes` (alterar)

Payload ganha `camisasExtras?: [{ tamanho, quantidade }]` (0 a 5 no total).

- A preferência passa a ter o item da inscrição **mais um item por tamanho de camisa**.
- `inscricoes.valor` **continua sendo só o valor da inscrição**. O valor das camisas fica no pedido. Isso é deliberado: preserva a receita por inscrição, o recálculo de valor em `PATCH /api/admin/inscricoes/[id]` e o desconto do cupom (o cupom vale para a inscrição, não para a camisa).
- Mesma checagem de estoque e mesma transação da compra avulsa. Se o tamanho escolhido acabou entre abrir a página e enviar o formulário, o erro **não pode derrubar a inscrição**: devolve 409 com a disponibilidade e o atleta ajusta ou remove a camisa e segue se inscrevendo.
- Reaproveitamento de inscrição pendente abandonada (caminho `if (existente)` que já existe): apaga o pedido `origem='inscricao'` pendente daquela inscrição — devolvendo a reserva — e recria com os dados novos.
- Falha ao criar a preferência: apaga inscrição **e** pedido (a reserva cai junto).

### Consulta de vínculo — `GET /api/camisas/vinculo?cpf=` (novo)

Alimenta o aviso "encontramos sua inscrição" no formulário avulso. Devolve `{ vinculada, inscricaoId?, primeiroNome?, distancia? }` com **apenas o primeiro nome e a inicial do sobrenome** — CPF→nome completo seria enumeração fácil demais numa rota pública. Se você preferir, dá para devolver só o booleano; o formulário funciona igual.

---

## Confirmação de pagamento

`src/lib/pagamento.ts`:

- `buscarPagamentoAprovadoMp` passa a receber `string | number` (a referência), em vez de só o id da inscrição — o corpo já faz `String()`.
- `registrarStatusPagamento` (inscrição), depois de gravar, **propaga o status** para `pedidos_camisa WHERE inscricao_id = ? AND origem = 'inscricao'`. Camisa comprada junto **não** gera e-mail separado.
- `registrarStatusPagamentoCamisa(pedidoId, status, paymentId)` (novo) — mesmo `UPDATE ... WHERE status_pagamento != 'pago'` que garante e-mail único, e dispara `enviarEmailCamisaConfirmada`.

`POST /api/webhook/mercadopago` roteia pelo formato da referência: `^\d+$` → inscrição, `^camisa-(\d+)$` → pedido de camisa.

`GET /api/camisas/[id]/status` (novo) espelha `src/app/api/inscricoes/[id]/status/route.ts`, usando `camisa-<id>` na busca de fallback no MP — o mesmo remendo para quando o webhook não chega.

---

## E-mails

- `src/lib/emailCamisaConfirmada.ts` (novo) — mesmo template escuro de `emailInscricaoConfirmada.ts`: nº do pedido, tamanhos, valor pago, QR de `/api/qr/<token>` e botão "Ver meu pedido". Quando há vínculo, troca o bloco do QR por "sua camisa sai junto com o kit da inscrição #N".
- `emailInscricaoConfirmada.ts` — ganha um segundo argumento opcional com as camisas do pedido e, quando existe, uma linha "Camisa extra" no bloco de detalhes (usando o `linhaDetalhe` que já está lá). O construtor continua puro; quem consulta o banco é `registrarStatusPagamento`.

---

## Retirada (QR e leitor)

`GET /api/qr/[token]` procura em `inscricoes.kit_token` e, se não achar, em `pedidos_camisa.token`, codificando `/inscricao/<token>` ou `/camisa/<token>` conforme o caso.

`POST /api/admin/kit` — **uma leitura entrega tudo**:

- Token de inscrição: além de liberar o kit, marca como retirados os pedidos pagos vinculados àquela inscrição e devolve `camisasExtras: [{tamanho, quantidade}]` para o `LeitorKit` mostrar "**+2 camisas extras: M, G**" na tela.
- Token de camisa (comprador sem inscrição): marca `retirado_em` no pedido. A resposta ganha um discriminador `tipo: "inscricao" | "camisa"` e `LeitorKit.tsx` renderiza os dois formatos.

---

## Painel admin

- **`GET /api/admin/inscricoes`** — cada inscrição passa a trazer `camisas_extras` (agregado numa única query com `GROUP BY`, sem N+1) e o status do pedido. A tabela ganha um badge `+2 camisas · M, G` na célula do atleta, ao lado dos badges de "menor" e "sem termo" que já existem.
- **`GET /api/admin/camisas`** (novo) — lista de pedidos com itens, status, vínculo (`Inscrição #12 — João Silva · 8km` ou `Sem inscrição`), retirada e a marca de `estoque_estourado`; `stats` com o **quadro de estoque por tamanho** (total, vendidas, reservadas, disponíveis).
- **`PATCH`/`DELETE /api/admin/camisas/[id]`** (novo) — status do pagamento, marcar/desmarcar retirada, excluir. Segue `admin/inscricoes/[id]/route.ts`, inclusive passando por `registrarStatusPagamentoCamisa` na confirmação manual para o e-mail sair.
- **`GET`/`PATCH /api/admin/camisas/preco`** (novo) — lê e grava `camisa_preco`, `camisa_preco_promo` e `camisa_reserva_minutos`.
- **`GET`/`PATCH /api/admin/camisas/estoque`** (novo) — lê o quadro completo e grava o `total` de cada tamanho. Recusa `total` abaixo do que já foi vendido, com a mensagem dizendo quanto já saiu — senão o painel aceita um número que torna o estoque negativo.
- **UI (`src/app/admin/page.tsx`)** — nova seção "Camisas extras" no padrão do card de cupons: formulário de preço/promoção, **quadro de estoque editável por tamanho**, tabela de pedidos. Mais dois stat cards (camisas pagas, receita de camisas) na grade existente. Pedido com `estoque_estourado` aparece destacado, com a razão no título.
- **CSV** — duas colunas novas (`Camisas extras`, `Tamanhos camisas`) em `/api/admin/export` e um `/api/admin/export/camisas` novo com uma linha por pedido.

---

## Front-end

O preço agora vem do banco, então a home não pode mais ler `NEXT_PUBLIC_PRECO_*` congelado no build:

- `src/app/page.tsx` vira **server component**: `await connection()` (de `next/server`) **antes** da consulta e depois renderiza `<FormularioInscricao precoCamisa={...} />`. O `connection()` é obrigatório aqui — a doc do Next 16 (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`) trata exatamente deste caso: driver SQLite síncrono resolve durante o prerender e a página sairia com preço velho. `export const dynamic` não é mais o caminho recomendado.
- `src/app/FormularioInscricao.tsx` (novo) — é o `page.tsx` atual movido, mais o bloco "Camisa extra" com seletor de quantidade por tamanho (limite de 5), preço `de R$ 45 por R$ 20` e a linha de total virando `inscrição + camisas`.
- `src/app/camisa/page.tsx` + `FormularioCamisa.tsx` (novos) — compra avulsa: galeria frente/costas, seletor por tamanho, dados pessoais, aviso de vínculo ao digitar o CPF, total e CTA.

Os dois server components (`/` e `/camisa`) leem preço **e disponibilidade** na mesma passagem e passam adiante. Tamanho esgotado chega ao cliente já marcado — o **P nasce desabilitado com selo "esgotado"**, visível em vez de escondido. O `+` de cada tamanho trava em `min(5 restantes, disponível)`; ao travar por estoque, aparece uma nota discreta explicando ("só resta 1 deste tamanho"). É a única situação em que o número exato aparece ao público — sem isso o botão simplesmente para de responder e parece defeito. Se preferir esconder até nesse caso, a nota vira "sem mais unidades deste tamanho".

Como a página é renderizada no servidor, a disponibilidade mostrada pode estar alguns minutos velha; o 409 do checkout é a rede de segurança, e o formulário reexibe o seletor com os números atualizados que vieram na resposta.
- `src/app/camisa/retorno/page.tsx` + `VerificadorPagamentoCamisa.tsx` — espelham `src/app/inscricao/retorno/`.
- `src/app/camisa/[token]/page.tsx` — pedido + QR, espelhando `src/app/inscricao/[token]/page.tsx`.
- Home ganha uma faixa de promoção entre o kit e as distâncias, linkando para `/camisa`, deixando claro que **não é a camiseta do kit**.

### Galeria frente/costas

`src/app/camisaExtra.ts` (novo) exporta as duas faces no formato `ItemKit` de `src/app/itensKit.ts`:

```ts
export const CAMISA_EXTRA: ItemKit[] = [
  { id: "frente", imagem: "/camisa-extra/frente.jpeg", nome: "Camisa extra — frente", ... },
  { id: "costas", imagem: "/camisa-extra/costas.jpeg", nome: "Camisa extra — costas", ... },
];
```

Com esse formato, o **`VisualizadorKit.tsx` já existente é reaproveitado sem nenhuma alteração** — ele recebe `itens`/`indice`/`aoFechar`/`aoTrocar` e já traz setas, pontinhos de navegação, swipe no celular, Esc e travamento do scroll. Na home e em `/camisa` as duas miniaturas ficam lado a lado (padrão `kit-card`) e abrem o visualizador na face clicada. A descrição de cada face cita os patrocinadores daquele lado, que é o que a legenda do visualizador exibe.

- `public/camisa-extra/frente.jpeg` e `public/camisa-extra/costas.jpeg` — pasta própria, porque a camisa extra **não** faz parte do kit. Ambas as artes vêm em PNG de ~2,3 MB (1086×1448) e precisam ser convertidas e otimizadas para o peso dos outros assets (~150 KB cada). A arte de costas é texto branco fino sobre azul: comprimir demais borra a frase, então vale conferir a legibilidade depois de converter.
- No e-mail de confirmação entra só a frente, para não pesar a mensagem; a página do pedido (`/camisa/[token]`) mostra as duas.
- CSS novo em `src/app/globals.css`, reaproveitando as classes que já existem (`kit-card`, `visualizador-*`, `campo`, `linha-total`, `botao-cta`, `badge`).

---

## Testes

`npm run test:cobertura` exige **100% de linhas, ramos e funções** em `src/lib/**` e `src/app/api/**` — nada abaixo disso passa.

- `test/helpers.ts` — `limparBanco` limpa as quatro tabelas novas; novos fixtures `inserirPedidoCamisa`, `buscarPedido`, `definirPrecoCamisa`, `definirEstoque`.
- Arquivos novos: `test/lib/configuracoes.test.ts`, `test/lib/estoque.test.ts`, `test/lib/emailCamisaConfirmada.test.ts`, `test/api/camisas.test.ts`, `camisas-status.test.ts`, `camisas-vinculo.test.ts`, `admin-camisas.test.ts`, `admin-camisas-preco.test.ts`, `admin-camisas-estoque.test.ts`, `admin-export-camisas.test.ts`.
- Casos novos nos existentes: `inscricoes.test.ts` (compra junto, limite de 5, estoque insuficiente sem derrubar a inscrição, reaproveitamento de pendente, rollback), `webhook.test.ts` (roteamento `camisa-<id>`), `pagamento.test.ts` (propagação do status), `qr.test.ts` (token de camisa), `admin-kit.test.ts` (camisas extras na leitura), `db-migracao.test.ts` (tabelas, FKs e semente do estoque).
- **Estoque merece bateria própria**, porque é onde o dinheiro e a peça física se desencontram: reserva pendente segura a peça; reserva vencida devolve; pedido cancelado devolve na hora; pedido pago segura para sempre; tamanho zerado (P) recusa com 409; XG aceita 1 e recusa 2; `total` no admin não pode cair abaixo do vendido; e pagamento aprovado depois da reserva vencida grava `estoque_estourado` **sem recusar o pagamento**. O relógio se controla gravando `reservado_ate` no passado — sem esperar 30 minutos em teste.

---

## Ordem de execução

1. Banco (com semente do estoque) + `configuracoes.ts` + `estoque.ts` + as duas listas de tamanho + testes de lib.
2. `POST /api/camisas` com reserva transacional, vínculo por CPF, status e webhook + testes de API.
3. Compra junto da inscrição (`POST /api/inscricoes`) + propagação em `pagamento.ts`.
4. E-mails e QR/leitor de retirada.
5. Rotas e UI do admin (incluindo o vínculo visível na listagem).
6. Front-end público: `/camisa`, bloco na home, galeria frente/costas, retorno e página do pedido.
7. `.env.example`, `README.md`, assets da camisa (frente e costas).

## Verificação

- `npm run typecheck` e `npm run test:cobertura` limpos (a cobertura é o portão principal).
- `npm run dev` e, ponta a ponta com as credenciais de teste do MP: compra avulsa sem inscrição → e-mail com QR → leitura do QR no `/admin`; compra avulsa com CPF de inscrição já paga → conferir o vínculo na listagem; inscrição com camisa extra → conferir os dois itens no checkout e o pedido virando pago junto.
- Cuidado no teste local: o `.env.local` aponta para a conta **de produção** do Mercado Pago. Use `external_reference` de camisa (`camisa-<id>`, já namespeado) e confira o `collector_id 186097166` ao consultar pagamentos.
- No admin: mudar a promoção para vazio e confirmar que a home volta a R$ 45 **sem redeploy** (é o teste que valida o `connection()`).
- Galeria: abrir as duas faces na home e em `/camisa`, navegando por seta, pontinho e swipe no celular, e conferir no zoom se a frase das costas continua nítida depois da compressão.
- Estoque, ponta a ponta: conferir que **P aparece esgotado** e não deixa comprar; comprar o único **XG** e ver o tamanho sair da grade; abrir um checkout de XG, gravar `reservado_ate` no passado direto no banco e confirmar que a peça volta a ficar disponível; e tentar baixar o `total` no admin abaixo do já vendido e ver a recusa.

Arquivos de origem das artes: frente em `ChatGPT Image 2 de set. de 2026, 17_07_47.png` (raiz do projeto) e costas em `~/Downloads/ChatGPT Image 5 de set. de 2026, 16_15_30.png`. Os dois PNGs originais não entram no repositório — só os JPEGs convertidos em `public/camisa-extra/`.
- Deploy: `railway up --detach` — push no GitHub não publica.

## Ponto em aberto

O `GET /api/camisas/vinculo` devolve primeiro nome + inicial a partir de um CPF, numa rota pública. É pouco, mas é um vazamento. Se preferir zero exposição, ele pode devolver só `{ vinculada: true }` e a mensagem vira "encontramos uma inscrição com este CPF" — o vínculo em si acontece no servidor de qualquer jeito. Salvo instrução contrária, sigo com o nome abreviado, que dá mais confiança a quem compra.
