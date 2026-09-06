# Prompt para Claude Design — Venda da camisa extra SAMAS TRAIL (promoção de R$ 45 por R$ 20)

> Anexe junto com este prompt: a logo `logo-samas-trail.png`, as **duas artes da camisa extra** (`camisa-extra-frente.png` e `camisa-extra-costas.png`), a foto da **camiseta do kit** (`camiseta.jpeg`, azul-marinho — anexada como contraexemplo, para o design não confundir as duas), um print da home atual (hero → kit do atleta → distâncias/formulário → premiação), um print do **modal de ampliar foto do kit** e um print do **painel /admin**.

---

## O que vamos construir

A **SAMAS TRAIL** (corrida de trilha, 22 de novembro de 2026, Povoado Água Preta — São Mateus do Maranhão/MA, 8km e 18km) vai vender uma **camisa extra**, separada da inscrição. Preço cheio **R$ 45**, entrando agora em **promoção por R$ 20**.

São **dois caminhos de compra para o mesmo produto**:

1. **Avulsa** — página nova `/camisa`, aberta a qualquer pessoa, inclusive quem não corre.
2. **Junto da inscrição** — um bloco novo dentro do formulário de inscrição que já existe, pago no mesmo checkout.

E uma regra de negócio que precisa ficar visível: quando o CPF da compra avulsa bate com uma inscrição já paga, o sistema **vincula** as duas e a camisa é entregue junto com o kit do atleta. Quem não tem inscrição recebe um **QR próprio** para retirar.

Mobile-first (390px) e desktop (1440px), mais os e-mails em 600px.

## A peça

Camisa azul-royal, com **duas artes, e as duas precisam aparecer na venda**:

- **Frente** — "SAMAS TRAIL" em lettering de pincel branco, com **BRUTO Suplementos** e **ProjetAgro** no peito.
- **Costas** — a frase **"NASCIDOS NO ASFALTO E CRIADOS NA TRILHA"** em pincel, com **Andrey Lucas Personal Trainer** e **FM Studio Nail Desing** logo abaixo.

Cada face carrega patrocinadores diferentes. Mostrar só a frente esconde metade do produto e metade da contrapartida vendida às marcas — as duas entram na galeria, com peso igual.

## O estoque (define metade dos estados das telas)

São **54 peças que sobraram da produção**, sem reposição — a promoção é queima de estoque:

| Tamanho | P | M | G | GG | XG |
|---|---|---|---|---|---|
| Peças | **0 (esgotado)** | 33 | 16 | 4 | 1 |

A grade é **P, M, G, GG, XG** — **sem PP**, e com **XG**, que não existe na camiseta do kit (PP–GG). São grades diferentes, de peças diferentes; não unifique as duas no design.

Consequências que o layout tem que absorver desde o primeiro rascunho, não como ajuste posterior:

- **O P já nasce esgotado.** A tela padrão do seletor não é "cinco tamanhos disponíveis" — é quatro disponíveis e um travado. Desenhe o estado esgotado como caso normal, porque ele é o caso atual.
- **O XG tem 1 peça e o GG tem 4.** Vão esgotar rápido, provavelmente durante a promoção. Em pouco tempo a tela real terá dois ou três tamanhos travados, e ela precisa continuar apresentável — não pode virar um mural de "esgotado" com um M solitário.
- **Tudo pode esgotar.** Existe o estado final em que não sobrou nenhuma peça: a página `/camisa` e a faixa da home precisam de uma versão "camisas esgotadas", sem CTA morto e sem formulário que não leva a lugar nenhum.

## Restrições reais que o design tem que respeitar

Não é preferência, é o que o sistema faz — desenhar fora disso gera tela bonita no Figma e quebrada no site:

1. **Esta NÃO é a camiseta do kit, e esse é o maior risco do trabalho.** O kit já inclui uma camiseta **azul-marinho** com logo vermelho, e ela aparece na mesma home, a poucos scrolls de distância, num card que diz "INCLUSO". A camisa extra é **azul-royal**, outra arte, e é paga. Se a pessoa achar que está pagando de novo por algo que já vem incluso, ela desiste; se achar que a camiseta do kit agora custa R$ 20, a organização vai passar o dia respondendo WhatsApp. A separação entre as duas precisa ser **inequívoca no primeiro olhar**, não numa nota de rodapé.
2. **A promoção pode ser desligada a qualquer momento pelo painel.** Toda tela que mostra "de R$ 45 por R$ 20" precisa da variação **sem promoção**, com a camisa a R$ 45 — sem buraco no layout, sem selo órfão, sem "de R$ 45 por R$ 45".
3. **Limite de 5 camisas por compra, distribuídas livremente entre P, M, G, GG e XG.** A pessoa pode levar 2M + 1G + 2GG. O seletor precisa comunicar o limite **antes** de a pessoa bater nele, e deixar claro quantas ainda cabem.
4. **O teto de cada tamanho é o estoque dele, não o 5.** Não dá para colocar 2 XG: só existe 1. O `+` trava por dois motivos diferentes — "você chegou em 5" e "acabou o estoque deste tamanho" — e os dois precisam ser distinguíveis, porque a saída é diferente: no primeiro caso a pessoa tira uma camisa de outro tamanho, no segundo não há o que fazer.
5. **A quantidade exata em estoque é informação interna.** Não exibimos "restam 4 GG" como argumento de venda. A única exceção é o momento em que a pessoa esbarra no limite: aí a nota explica o travamento ("só resta 1 deste tamanho"), senão o botão parece quebrado. Desenhe essa nota como um detalhe discreto, não como alarme de escassez.
6. **O comprador avulso pode não ser atleta.** Nada de "sua distância", "seu kit", "boa prova" nesse fluxo. É gente comprando camisa para marido, filho, amiga.
7. **O vínculo por CPF é assíncrono.** O aviso "encontramos sua inscrição" só aparece depois que a pessoa termina de digitar o CPF e o servidor responde. Precisa de estado **verificando / vinculado / sem vínculo**, e a entrada do aviso **não pode empurrar o botão** que a pessoa está prestes a tocar.
8. **A foto é azul-royal forte sobre um site preto e vermelho.** Ela vai brigar com a cor primária. Precisa de um tratamento de placa/fundo que acomode a peça sem recolorir, sem duotone e sem filtro — a arte da camisa é o produto, chega como está.
9. **A frase das costas é texto branco fino sobre azul.** Em card pequeno ela vira borrão. Defina o tamanho mínimo em que a face de costas ainda é legível e, abaixo disso, o que aparece no lugar.
10. **O mesmo leitor de QR do admin lê os dois tipos de código** (kit do atleta e camisa avulsa). O operador está no sol, com fila na frente. A tela precisa dizer **qual é qual em meio segundo**, e quando é um atleta com camisa extra, mostrar quantas e de que tamanho — porque é uma entrega só.
11. **Área de toque ≥ 44px** nos steppers de quantidade: é o controle mais tocado das telas novas, e é usado com uma mão só.
12. **Os e-mails são HTML de tabela**, escuros, com estilo inline e compatíveis com Outlook — o template atual não usa flex, grid nem `border-radius` sem fallback. Desenhe dentro dessa caixa.
13. **Duas entradas, um produto.** A camisa comprada junto da inscrição e a comprada avulsa são a mesma peça pelo mesmo preço. Não podem parecer ofertas diferentes.

## Sistema visual (já existe — seguir, não reinventar)

Tokens em uso no site:

- Fundo base **#0A0A0A**; painéis **#111111** / **#131313**; input **#161616** com borda **#2A2A2A**; bordas suaves `rgba(255,255,255,0.09)`, médias `rgba(255,255,255,0.14)`; cards com raio **14–16px**.
- Primária **#E10600**, hover **#FF1F16**. Texto **#E5E7EB**, títulos **#FFFFFF**, secundário **#9CA3AF**, terciário **#6B7280**. Badges: verde **#34D399**, âmbar **#FBBF24**.
- Tipografia: títulos em **Anton** (caixa alta, `skewX(-6deg)`, letter-spacing 0.05em — estilo exato de "Kit do atleta" e "Premiação"); corpo em **Inter**.
- Textura de ruído fractal (opacidade ~12%, blend screen) e respingos vermelhos de pincel como detalhe.
- Componentes existentes a reaproveitar: **divisor vermelho "rasgado"** entre seções, **barra vermelha 22×5px + título display**, **trilha pontilhada branca em SVG** à direita do título no desktop, **badge/pill vermelho** em caixa alta 9,5px com letter-spacing 0.14em, **card escuro com foto** do kit, **linha de total** e **botão CTA vermelho de largura cheia**.

### O visualizador que já existe (base obrigatória)

A galeria frente/costas **não é um modal novo** — é o visualizador de fotos do kit, reaproveitado como está:

- Overlay `rgba(5,5,5,0.9)` com `backdrop-filter: blur(6px)`, tela cheia, padding 16px.
- Card **#111111**, borda `rgba(255,255,255,0.14)`, raio **16px**, largura máxima ~860px no desktop.
- Palco da imagem com fundo **#0D0D0D**, imagem em `contain`, altura máxima ~58vh.
- Legenda separada por borda suave: nome em branco ~19px, descrição em cinza ~13px.
- Fechar: círculo de 34px no topo direito, fundo `rgba(10,10,10,0.72)` com blur, vermelho no hover. Setas e pontinhos de 34px, fundo #161616, vermelho no hover.
- Fade de entrada **0.18s ease-out**; fecha no ESC, no clique fora e, no mobile, aceita **swipe**.

Aqui ele abre com **duas faces** — a legenda de cada uma cita os patrocinadores daquele lado.

## Telas (artboards)

### 1 e 2. Home — faixa da camisa extra (mobile 390 e desktop 1440)

Seção nova entre o **Kit do atleta** e o **Escolha sua distância**, precedida do divisor rasgado. É a vitrine da promoção.

- Título display "CAMISA EXTRA" com a barra vermelha; subtítulo curto em cinza que **separa do kit em uma linha** (ex.: "Peça nova, à venda — não é a camiseta que vem no kit").
- As **duas faces lado a lado** (mobile: as duas visíveis, sem carrossel escondendo a de costas), no padrão `kit-card`, abrindo o visualizador na face tocada.
- **Selo de promoção**: "DE R$ 45 POR R$ 20" com o preço cheio riscado. Desenhe também a variação sem promoção.
- CTA "COMPRAR CAMISA" levando para `/camisa`, e uma microcópia dizendo que também dá para adicionar durante a inscrição.
- Faça uma versão do artboard mostrando **esta seção e o card da camiseta do kit na mesma tela** — é a prova real de que a separação funciona.

### 3 e 4. Home — bloco "Adicionar camisa extra" no formulário (mobile e desktop)

Dentro do formulário de inscrição, entre o campo de cupom e o bloco do termo:

- Cabeçalho com miniatura da frente, nome, preço promocional e link "ver frente e costas".
- **Seletor de quantidade por tamanho**: P, M, G, GG, XG, cada um com stepper − / número / +, limite de 5 no total.
- Estados: padrão (**P já esgotado**), 1 camisa, 3 camisas de tamanhos diferentes, **limite de 5 atingido** e **tamanho travado por estoque** — os dois travamentos com razões distintas.
- Aviso quando o atleta é menor de idade **não** muda aqui — não sobreponha os dois blocos.
- Variação **tudo esgotado**: o bloco inteiro colapsa num aviso curto, sem seletor, e a inscrição segue normalmente.

### 5. Home — linha de total e CTA com camisas

A linha de total hoje diz "Total — 8km · 2º lote / R$ 130,00". Com camisas ela precisa **discriminar**: inscrição, camisas (quantidade × valor) e total. Desenhe com e sem cupom aplicado, porque os dois descontos aparecem na mesma linha. O texto do botão acompanha o total.

### 6 e 7. `/camisa` — compra avulsa (mobile 390 e desktop 1440)

Página nova, com hero curto (logo, título "CAMISA EXTRA", chip da promoção):

- Galeria frente/costas em destaque — no desktop, imagem à esquerda e formulário à direita.
- Bloco de preço com o selo promocional.
- Seletor de quantidade por tamanho (mesmo componente do artboard 3).
- Dados do comprador: Nome completo, CPF, E-mail, Telefone/WhatsApp. **Sem** distância, sem tamanho de camiseta do kit, sem termo de responsabilidade — não é inscrição.
- Total e CTA "COMPRAR — R$ 40,00" (2 camisas, para o mock).
- Rodapé com a nota de retirada.

### 8. `/camisa` — estados do vínculo por CPF

O aviso que aparece abaixo do campo de CPF, nos três estados:

- **Verificando** — discreto, sem spinner dominante.
- **Vinculado** — "Encontramos a inscrição de João P. (8km). Sua camisa será entregue junto com o kit dele." Tom de boa notícia, não de alerta.
- **Sem vínculo** — a ausência de inscrição é normal e **não é erro**: "Você vai receber um QR code próprio para retirar a camisa." Cuidado especial aqui: cinza neutro, nunca vermelho.

### 9. `/camisa` — estados de erro e de estoque

- Erros de formulário: nenhum tamanho escolhido, CPF inválido, e-mail inválido, falha ao iniciar o pagamento. Reaproveite o banner de erro que já existe no formulário de inscrição.
- **"O tamanho acabou enquanto você comprava"**: a peça foi levada por outra pessoa entre a página carregar e o botão ser tocado. O banner precisa dizer o que acabou e o seletor **volta atualizado**, com o tamanho travado e a seleção da pessoa corrigida — não é para ela adivinhar o que mudou.
- **Página com tudo esgotado**: hero, as duas faces da camisa e um aviso claro, sem formulário e sem CTA morto. É o estado final desta venda, e ele vai acontecer.

### 10 e 11. Visualizador frente/costas (mobile e desktop)

O modal do kit com as duas faces, mostrando os pontinhos de navegação em 2 posições e a legenda citando os patrocinadores de cada lado. Inclua o enquadramento da face de costas em que a frase ainda é legível.

### 12, 13 e 14. `/camisa/retorno` — sucesso, pendente e erro (mobile)

Espelham as telas de retorno da inscrição que já existem, com o conteúdo trocado para camisa (nº do pedido, tamanhos, valor). Na de **sucesso**, duas variações: **com vínculo** ("sai junto com o kit da inscrição #12") e **sem vínculo** ("seu QR code chegou por e-mail").

### 15 e 16. `/camisa/[token]` — página do pedido (mobile, duas variações)

Equivalente ao "Ver minha inscrição": pedido #, tamanhos, valor, status, as duas faces da camisa e:

- **Sem vínculo**: QR code em moldura branca + instrução de retirada.
- **Com vínculo**: no lugar do QR, o aviso de que a retirada é junto com o kit, com link para a página da inscrição.
- Inclua o estado **pagamento pendente**, em que o QR ainda não existe.

### 17. E-mail de confirmação da camisa (600px)

Dark, tabela, no estilo do e-mail de inscrição confirmada que já existe: cabeçalho SAMAS TRAIL, faixa vermelha, "PEDIDO CONFIRMADO!", bloco de detalhes (nº do pedido, tamanhos, valor pago), **foto da frente** da camisa, QR de retirada e botão "VER MEU PEDIDO". Variação com vínculo, em que o QR dá lugar ao aviso de entrega junto com o kit.

### 18. E-mail de inscrição confirmada — com camisa extra (600px)

O e-mail que já existe, ganhando **uma linha "Camisa extra"** no bloco de detalhes (ex.: "2× M, 1× G"). Mostre só o trecho alterado, para deixar claro que o resto não muda.

### 19 e 20. Admin — seção "Camisas extras" (desktop 1440)

Card novo no padrão do card de cupons, depois da tabela de inscrições:

- **Formulário de preço**: campo "Preço cheio (R$)" e campo "Preço promocional (R$)", com a microcópia dizendo que **esvaziar o promocional desliga a promoção**. Desenhe o card com promoção ativa e com promoção desligada.
- **Quadro de estoque — o elemento mais importante do card.** Uma linha por tamanho (P, M, G, GG, XG) com quatro números: **total** (editável), **vendidas**, **reservadas** e **disponíveis**. É por aqui que a organização enxerga a operação inteira e ajusta a contagem quando descobre uma caixa a mais no depósito. Estados: linha normal, linha esgotada, e o **erro de tentar colocar um total abaixo do que já foi vendido**.
- **Tabela de pedidos**: Comprador, CPF, Contato, Tamanhos, Qtd, Valor, Status (badge), **Vínculo**, Retirada, Ações. A coluna de vínculo mostra "Inscrição #12 — João Silva · 8km" ou "Sem inscrição" — visualmente distintos, porque é o que decide como a camisa é entregue.
- **Pedido com estoque estourado**: alguém pagou depois que a reserva venceu e a última peça já tinha ido embora. O pagamento foi aceito (não se recusa dinheiro capturado), então a organização precisa resolver por contato. Essa linha precisa **saltar da tabela** — é dívida com um cliente, não um aviso qualquer.
- Estado vazio ("Nenhuma camisa vendida ainda").

### 21. Admin — vínculo visível na tabela de inscrições (desktop)

Na célula do atleta, um **badge "+2 CAMISAS · M, G"** ao lado dos badges "menor" e "sem termo" que já existem. Mostre uma linha com os três badges juntos, que é o pior caso de aperto. Inclua também os dois **stat cards novos** (camisas pagas, receita de camisas) na grade do topo.

### 22. Admin — leitor de QR com camisas extras (mobile, é lido no celular)

Três resultados da leitura:

- **Atleta com camisa extra** — kit liberado + "**+2 CAMISAS EXTRAS: M, G**" em destaque alto, porque é uma entrega só e o operador não pode esquecer.
- **Camisa avulsa** — comprador sem inscrição, tamanhos, "camisa entregue".
- **Já retirado** — no padrão de alerta que o leitor já usa.

O tipo do código (kit ou camisa) tem que ser identificável **antes de ler o texto**.

## Componentes novos (prancha isolada, com todos os estados)

1. **Seletor de quantidade por tamanho** — o componente central. Estados: zero, com valor, **no limite global de 5**, **travado por estoque**, **esgotado (P)**, e tudo esgotado. Especifique altura, área de toque, comportamento do − em zero e do + em cada tipo de travamento, como o contador global ("3 de 5") acompanha, e como as duas razões de travamento se distinguem sem depender de cor.
2. **Selo de promoção** — com preço riscado e sem promoção; nos tamanhos de faixa da home, card de compra e linha de total.
3. **Selo de esgotado** — no chip de tamanho e na versão de página inteira.
4. **Aviso de vínculo por CPF** — verificando, vinculado, sem vínculo.
5. **Card de face da camisa** (frente/costas) — repouso, hover, foco por teclado, e a versão pequena em que a frase das costas ainda é legível.
6. **Badge de camisas na tabela admin** — 1 camisa, várias, e convivendo com os badges existentes.
7. **Linha do quadro de estoque** — normal, esgotada, em edição e com erro de total menor que o vendido.
8. **Linha de total discriminada** — inscrição, camisas, cupom, total.

## Conteúdo

Textos em **pt-BR**, tom direto de prova de trilha, mesma voz do site atual. Dados de exemplo realistas do interior do Maranhão (nomes brasileiros, CPFs mascarados, mix de tamanhos). Nos mocks do admin, inclua propositalmente **um pedido vinculado, um sem inscrição e um pendente** — o design só vale se os três forem distinguíveis de relance.

## Entregável extra que eu preciso junto do design

1. **As duas versões de preço lado a lado** (promoção ativa e desligada), tela por tela, dizendo o que muda em cada uma — é o estado que a organização vai alternar sozinha, sem desenvolvedor.
2. **Especificação do seletor de quantidade**: medidas, área de toque, o que acontece ao atingir 5, o que acontece ao atingir o estoque do tamanho, e como as duas situações são ditas de formas diferentes.
3. **A linha do tempo do estoque, em três telas**: hoje (P esgotado), daqui a alguns dias (P, XG e GG esgotados, só M e G de pé) e o fim (tudo esgotado). É a mesma tela em três momentos, e a organização vai ver os três — se algum deles ficar feio, o design não está pronto.
4. **Regra de tratamento da foto azul-royal** sobre o fundo preto/vermelho: fundo da placa, padding, sombra, e o tamanho mínimo da face de costas.
5. **Microcópia da separação kit × camisa extra**: as frases exatas usadas na home, no formulário, no e-mail e na página do pedido, para a distinção ser dita do mesmo jeito em todo lugar.

## Não fazer

- Não usar a foto da camiseta **azul-marinho do kit** para ilustrar a camisa extra, e não chamar a camisa extra de "camiseta do kit" em lugar nenhum.
- Não sugerir, em nenhuma tela, que a **inscrição** ficou mais barata ou está em promoção — a promoção é só da camisa.
- Não desenhar nenhuma tela só com o preço promocional: toda arte precisa da versão a R$ 45.
- Não exigir inscrição para comprar a camisa, nem pedir distância, tamanho de camiseta do kit ou aceite de termo no fluxo avulso.
- Não criar um modal novo para a galeria — o visualizador do kit é o componente.
- Não inventar contagem regressiva nem prazo de promoção que o sistema não controla.
- Não usar o estoque baixo como marketing: nada de "corre que tá acabando", barrinha de unidades restantes ou contador de peças. O número só aparece para explicar um botão travado.
- Não desenhar a grade com **PP** (não existe nesta peça) nem esquecer o **XG** (existe, e é só 1).
- Não esconder o tamanho esgotado sumindo com ele da lista, e não desenhar nenhuma tela sem a variação de esgotado.
- Não recolorir, filtrar ou aplicar duotone nas artes da camisa.
- Não mudar a paleta nem a tipografia do site.
