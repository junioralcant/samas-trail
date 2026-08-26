# Prompt para Claude Design — E-mail de confirmação SAMAS TRAIL

> Anexe junto com este prompt o arquivo da logo: `SAMAS_TRAIL_transparente (1).png`

---

Crie o design do **e-mail transacional de confirmação de inscrição** da **SAMAS TRAIL**, corrida de trilha que acontece em **22 de novembro de 2026**, no **Povoado Água Preta — São Mateus do Maranhão/MA**, com duas distâncias (8km e 18km). O e-mail é enviado automaticamente quando o pagamento do atleta é aprovado no Mercado Pago.

## Identidade visual (seguir a logo anexada)

- **Fundo externo preto** (#0A0A0A); card do conteúdo em **#111111** com borda sutil #262626 e cantos arredondados (16px).
- **Vermelho vivo** (#E10600) como cor de destaque: barra divisória, valores importantes, botão.
- **Branco** (#FFFFFF) para títulos e dados; cinza (#9CA3AF) para texto corrido; cinza escuro (#6B7280) para rótulos e rodapé.
- Lettering **SAMAS** (branco) **TRAIL** (vermelho) no topo, itálico pesado, caixa alta — remetendo à logo.
- Uma **barra vermelha** separando o cabeçalho do conteúdo (pode ter o corte "rasgado"/diagonal da identidade, desde que feito com imagem ou borda simples — ver restrições abaixo).
- Tom de voz: energético e direto ("Nos vemos na trilha!").

## Restrições técnicas (OBRIGATÓRIAS — é HTML de e-mail, não página web)

- Largura máxima do conteúdo: **600px**, coluna única, centralizado.
- Layout **somente com `<table>`s aninhadas** e **CSS 100% inline** (atributo `style` em cada elemento). Nada de flexbox, grid, `<style>` em bloco, classes, position ou media queries obrigatórias.
- **Sem web fonts** (Anton/Inter não carregam em e-mail): usar pilha de sistema — `Arial Black, Arial, Helvetica, sans-serif` para títulos (bold + italic simula o lettering) e `Arial, Helvetica, sans-serif` para o corpo.
- **Sem SVG, sem clip-path, sem mix-blend-mode, sem background-image** (Outlook não renderiza). Efeitos "rasgados"/grunge só se forem desenhados de forma simplificada com bordas/cores chapadas.
- Imagens só se essenciais (a logo pode ser um `<img>` hospedado; prever **alt text** e o layout funcionando com imagens bloqueadas).
- Botões "bulletproof": `<a>` com padding, cor de fundo e borda inline (sem clip-path).
- Deve ficar legível também **com imagens desativadas** e em clientes que forçam fundo claro.

## Artboards

### 1. E-mail — desktop (600px)

Estrutura de cima para baixo:

1. **Cabeçalho** (fundo #0A0A0A): lettering "SAMAS TRAIL" centralizado (SAMAS branco + TRAIL vermelho, itálico bold, caps).
2. **Barra vermelha** (#E10600, ~6px).
3. **Título**: "INSCRIÇÃO CONFIRMADA!" (branco, caps, itálico).
4. **Saudação**: "Olá, **{nome do atleta}**! Seu pagamento foi aprovado e sua vaga está garantida. Nos vemos na trilha!"
5. **Tabela de detalhes** (linhas com rótulo à esquerda em cinza e valor à direita em branco/bold, separadas por linha fina #262626):
   - Nº da inscrição → `#123`
   - Distância → `18km`
   - Valor pago → `R$ 129,90`
   - Data da prova → `22 de novembro de 2026`
   - Local → `Povoado Água Preta — São Mateus do Maranhão/MA`
   - Camiseta → `M`
6. **Bloco de instruções** (fundo #0F0F0F, cantos arredondados): "Retirada do kit no dia da prova. Chegue com 1h de antecedência. Leve documento com foto."
7. **Botão** (opcional): "VER MINHA INSCRIÇÃO" em vermelho → link para o site.
8. **Rodapé** (cinza escuro, fonte pequena): "Pagamento processado pelo Mercado Pago. Dúvidas? É só responder este e-mail." + "SAMAS TRAIL · São Mateus do Maranhão/MA".

### 2. E-mail — mobile (390px)

Mesma estrutura empilhada, tipografia levemente menor, paddings reduzidos — em e-mail a coluna única já se adapta, então este artboard é só a conferência visual da largura estreita.

### 3. Variante — assunto e preheader

Incluir num box de anotação (fora dos artboards de e-mail):

- **Assunto**: `Inscrição confirmada — SAMAS TRAIL 18km`
- **Preheader** (texto oculto de preview): `Pagamento aprovado! Sua vaga na trilha está garantida. Confira os detalhes da prova.`

## Conteúdo

Todos os textos em pt-BR, usando os dados de exemplo acima (nome de exemplo: "Ana Beatriz Sousa Lima"). Os campos entre chaves são variáveis preenchidas pelo sistema.
