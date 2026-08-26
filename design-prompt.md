# Prompt para Claude Design — Telas SAMAS TRAIL

> Anexe junto com este prompt o arquivo da logo: `SAMAS_TRAIL_transparente (1).png`

---

Crie o design das telas do site de inscrições da **SAMAS TRAIL**, uma corrida de trilha que acontece em **22 de novembro de 2026**, no **Povoado Água Preta — São Mateus do Maranhão/MA**, com duas distâncias: **8km** e **18km**.

## Identidade visual (seguir a logo anexada)

- **Fundo preto** (#0A0A0A) como base de todas as telas públicas — estética dark, agressiva, de prova de aventura.
- **Vermelho vivo** (#E10600) como cor primária: botões, destaques, números das distâncias, detalhes gráficos.
- **Branco** (#FFFFFF) para títulos e textos principais; cinza claro (#9CA3AF) para textos secundários.
- **Textura grunge**: pinceladas, respingos e bordas rasgadas como as da logo — usar como detalhes de fundo, divisores de seção e atrás de números/títulos (sem poluir áreas de formulário).
- **Grafismo da trilha sinuosa** (o caminho branco da logo) como elemento decorativo repetível.
- **Tipografia**: títulos em display condensada, bold, itálica, CAIXA ALTA (estilo Anton / Archivo Black / Bebas Neue inclinada — como o lettering da logo); corpo e formulários em sans limpa e legível (Inter ou similar).
- Botões com leve inclinação/skew ou corte diagonal nos cantos, remetendo ao dinamismo da logo.
- A logo é transparente: usar sempre sobre fundo preto.

## Telas (artboards)

### 1. Página de inscrição — mobile (390px) e 2. desktop (1440px)

- **Hero**: logo SAMAS TRAIL centralizada em destaque, subtítulo "Prova de trilha — 8km e 18km", chips com "📅 22 de novembro de 2026" e "📍 Povoado Água Preta — São Mateus do Maranhão/MA".
- **Seleção de distância**: dois cards lado a lado (empilhados no mobile) — "8KM" (percurso leve, R$ 89,90) e "18KM" (desafio completo com subidas técnicas, R$ 129,90). Número da distância gigante na tipografia display. Card selecionado ganha borda/glow vermelho; o não selecionado fica apagado.
- **Formulário "Dados do atleta"**: campos Nome completo, CPF, E-mail, Telefone/WhatsApp, Data de nascimento, Sexo (select), Tamanho da camiseta (select PP–GG), Equipe/Assessoria (opcional). Inputs escuros (#161616) com borda sutil, foco vermelho.
- **Botão principal**: "INSCREVER-SE — R$ 89,90" em vermelho, largura total, tipografia display.
- Incluir também o estado de **erro de validação** (banner vermelho acima do botão, ex.: "CPF inválido").

### 3, 4 e 5. Páginas de retorno do pagamento — mobile (3 estados)

Card centralizado sobre fundo preto com textura grunge sutil, logo pequena no topo:

- **Sucesso**: ícone ✔ em círculo vermelho, "INSCRIÇÃO CONFIRMADA!", texto "Pagamento aprovado. Nos vemos na trilha!" e link "Voltar para a página de inscrição".
- **Pendente**: ícone de relógio, "PAGAMENTO EM PROCESSAMENTO", texto explicando que a inscrição será confirmada automaticamente.
- **Erro**: ícone ✕, "PAGAMENTO NÃO CONCLUÍDO", texto orientando a tentar novamente.

### 6. Admin — login (desktop)

Card centralizado "Painel do organizador" com a logo, campo de senha e botão "Entrar". Mesma identidade dark/vermelha, porém mais sóbria.

### 7. Admin — dashboard (desktop 1440px)

Painel do organizador — pode ser um dark theme mais funcional (menos grunge), mantendo o vermelho como cor de ação:

- **Topo**: logo pequena + "Painel de inscrições", botões "Exportar CSV" e "Sair".
- **6 stat cards**: Total de inscritos, 8km, 18km, Pagos, Pendentes, Receita confirmada (R$).
- **Filtros**: busca por nome/CPF/e-mail, select de distância, select de status.
- **Tabela de atletas**: colunas Atleta, CPF, Contato (e-mail + telefone), Camiseta, Equipe, Distância (select editável 8km/18km), Valor, Status (badge: pago = verde, pendente = âmbar, cancelado = vermelho), Inscrito em, Ações (select de status + botão Excluir).
- Incluir estado de **tabela vazia** ("Nenhuma inscrição encontrada").

## Conteúdo

Todos os textos em pt-BR. Usar dados de exemplo realistas na tabela do admin (nomes brasileiros, CPFs mascarados, mix de 8km/18km e de status).
