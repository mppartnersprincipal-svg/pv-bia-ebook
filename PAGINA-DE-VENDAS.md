# Mais perto de você — página de vendas

Página estática em **`/mais-perto-de-voce/`**, com HTML, CSS e JavaScript puros. A página de links existente em `/` foi preservada. O `vercel.json` continua publicando a pasta `deploy`, sem etapa de build.

## Visualizar localmente

Na raiz do projeto:

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory deploy
```

Abra `http://127.0.0.1:4173/mais-perto-de-voce/`. A configuração inicial mantém as compras desabilitadas porque o endereço do checkout ainda não foi informado.

## Configuração pendente

Edite **`deploy/mais-perto-de-voce/config.js`**. Use URLs HTTPS completas.

| Campo | Preencher com | Comportamento inicial |
|---|---|---|
| `CHECKOUT_URL` | URL real do produto no checkout | Botões desabilitados, sem redirecionamento fictício |
| `VSL_URL` | URL real do vídeo no YouTube, Vimeo ou Panda | Foto de apresentação; sem botão de reprodução fictício e sem player remoto |
| `VSL_ASPECT_RATIO` | `16:9` ou `9:16` | `16:9` |
| `META_PIXEL_ID` | ID numérico do Meta Pixel, entre aspas | Nenhum script, chamada ou evento do pixel |
| `SHOW_TESTIMONIALS` | `true` somente quando houver depoimentos autorizados | `false`, bloco fora da página renderizada |
| `TESTIMONIALS` | De 3 a 5 depoimentos reais | Lista vazia |
| `EBOOK_PREVIEW_IMAGES` | Caminhos das 4 páginas do e-book (`assets/ebook/...`) | Molduras de página, sem imagem e sem requisição |
| `TERMS_URL` | Endereço dos termos de uso aprovados | Rótulo no rodapé sem link ativo |
| `PRIVACY_URL` | Endereço da política de privacidade aprovada | Rótulo no rodapé sem link ativo |

**Endereço público definitivo:** quando o domínio for definido, altere o `og:image` em `index.html` para a URL HTTPS absoluta da imagem `assets/og-image.jpg`. Acrescente `og:url` e o link `canonical` com a URL definitiva da página. Esses metadados devem permanecer no HTML para os robôs de compartilhamento; não dependem de JavaScript. Nenhum domínio foi inventado.

Os textos dos termos e da política de privacidade não foram fornecidos. Os links estão preparados para apontar aos documentos reais. A thumbnail atual já está pronta; pode ser substituída pela capa definitiva do vídeo nos arquivos `vsl-640.webp` e `vsl-960.webp`.

### Vídeo

- YouTube: URL `watch?v=...`, `youtu.be/...` ou URL de incorporação. Aceita vídeo não listado, desde que a incorporação esteja habilitada.
- Vimeo: URL pública, URL não listada com hash ou endereço `player.vimeo.com/video/...`. O hash de privacidade é preservado.
- Panda: URL HTTPS de incorporação com o formato `player-....tv.pandavideo.com.br/embed/?v=...`, conforme o iframe disponibilizado pela plataforma.
- O clique carrega o iframe e, quando necessário, a API do provedor. A reprodução solicitada após o clique começa sem som e com controles visíveis. O visitante pode ativar o áudio.
- O formato vertical ocupa mais altura; a primeira dobra compacta foi planejada para o padrão 16:9.
- `ViewContent` depende do evento real de reprodução; o clique na thumbnail, sozinho, não dispara o evento.

Referências dos adaptadores: [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [Vimeo Player SDK](https://github.com/vimeo/player.js/blob/master/README.md), [Panda — eventos](https://docs.pandavideo.com/reference/receive-events) e [Panda — parâmetros](https://docs.pandavideo.com/reference/query-params).

### Checkout e rastreamento

Todos os CTAs (topo, empilhamento de valor, oferta, CTA final e barra fixa mobile) usam o mesmo endereço. Os parâmetros `utm_*` da página são transferidos ao checkout, inclusive valores repetidos, preservando os demais parâmetros e o fragmento do link configurado. Parâmetros de entrada que não sejam UTMs não são copiados.

Com um ID de pixel válido, são registrados `PageView` no carregamento, `ViewContent` uma vez no início real da reprodução e `InitiateCheckout` ao acionar um CTA habilitado. Os eventos não incluem respostas pessoais ou informações clínicas. A falha de rastreamento não impede o checkout.

A barra fixa aparece somente abaixo de 768px, após o topo sair da tela, e desaparece enquanto qualquer parte da seção de oferta estiver visível. Há espaço reservado no final da página para os links do rodapé ficarem acessíveis.

### Páginas do e-book ("Veja por dentro")

A seção de prova tem quatro slots (`<figure class="ebook-page" data-ebook-page="...">`): `capa`, `dia-1` (“Do rótulo para a cena”), `dia-2-tabela` e `dia-7-mapa`. Enquanto não houver imagem, cada slot mostra uma moldura de página com o nome ("Capa", "Dia 1"...) e a legenda; não há texto do tipo "em breve".

Para ativar:

1. Salve as páginas reais em `deploy/mais-perto-de-voce/assets/ebook/` como `capa.webp`, `dia-1.webp`, `dia-2-tabela.webp` e `dia-7-mapa.webp` — retrato ~3:4 (ex.: 1200 × 1600 px), idealmente até ~150 KB cada. Instruções também em `assets/ebook/LEIAME.txt`.
2. Em `config.js`, preencha `EBOOK_PREVIEW_IMAGES` com os caminhos (`capa: 'assets/ebook/capa.webp'` etc.). Aceita caminho relativo do site ou URL HTTPS.
3. O `main.js` carrega cada imagem quando a galeria se aproxima da tela e só troca a moldura depois que ela carrega; o texto alternativo vem de `data-alt` no HTML. Arquivo ausente ou caminho inválido mantém a moldura.

Alternativa sem JavaScript: em `index.html`, substitua o `<div class="ebook-page-placeholder">` do slot por `<img src="assets/ebook/capa.webp" width="600" height="800" loading="lazy" decoding="async" alt="...">` (há um comentário no HTML indicando o ponto).

### Depoimentos

Cada registro usa os campos `text`, `name` (primeiro nome ou iniciais) e `authorized: true`. Guarde a autorização por escrito fora do site. Somente quando a flag estiver ativa e houver ao menos três registros completos e autorizados o bloco será renderizado; são mostrados no máximo cinco. Nenhum depoimento de exemplo foi incluído no produto. Os registros são inseridos como texto, sem interpretar HTML.

## Estrutura (12 blocos da copy)

| # | Bloco | Classe / id | Conteúdo |
|---|---|---|---|
| 01 | Barra de topo | `.topbar` (dentro de `header.site-header`, com `.masthead`) | Acesso imediato · Experiência de 7 dias · R$37,90 · Garantia de 7 dias |
| 02 | Cabeça | `.hero` `#hero` | H1, subtítulo, VSL (`#vsl-shell`), CTA, microcopy |
| 03 | Identificação | `.identification` `#identificacao` | “É pra você que…”, 5 itens, conclusão |
| 04 | Mecanismo | `.mechanism` `#mecanismo` | “Você não está quebrada.”, 3 parágrafos, destaque `.mechanism-highlight` |
| 05 | Prova | `.proof` `#prova` | Galeria `.ebook-preview`, `.proof-note`, autoria `.author`, depoimentos `#testimonials-mount` (flag) |
| 06 | Benefícios | `.benefits` `#beneficios` | 7 itens |
| 07 | Empilhamento de valor | `.value-stack` `#conteudo-do-ebook` | 5 itens `.value-item`, formato do PDF, CTA |
| 08 | Oferta | `.offer` `#oferta` | Itens, preço, “Menos de R$6…”, CTA, nota de compra segura |
| 09 | Recapitulação | `.recap` `#resumo` | Resumo |
| 10 | Garantia | `.guarantee` `#garantia` | Selo `.guarantee-seal`, texto |
| 11 | FAQ | `.faq` `#perguntas` | 8 perguntas em `details/summary` |
| 12 | CTA final | `.closing` `#comecar` | Duas frases, CTA “TIREI MINHAS DÚVIDAS, QUERO COMEÇAR” |
| — | Rodapé | `.site-footer` | Aviso, identificação, direitos + links legais, aviso Meta |
| — | Barra fixa mobile | `.sticky-cta` `#sticky-cta` | “QUERO COMEÇAR OS 7 DIAS” |

## Copy e decisões de design

- A fonte da copy é `Ebook/Copy Página de Vendas - Ebook Bia.txt` (versão de 12 blocos). O texto destinado à visitante é literal, incluindo reticências, itálicos e negritos. Os CTAs não levam mais “— R$37,90”.
- Cabeçalhos de bloco (`## 01 · ...`), a linha “Estrutura: ...”, comentários `<!-- -->` e `[BOTÃO]` são anotações editoriais, não texto público.
- As aspas da copy são retas (`"`) e foram mantidas assim.
- Foi adotado **Psicóloga Clínica**, conforme a copy final e a aprovação, em vez da apresentação institucional anterior de Psicóloga Integrativa.
- Rodapé conforme a copy: “© 2026 Beatriz Machado. Todos os direitos reservados. · Termos de uso · Política de privacidade” e “Este site não é afiliado ao Facebook ou à Meta.”.
- Nome e CRP aparecem na autoria (bloco 05) e no rodapé.
- Tipografia: Prata 400 e Jost 400–500, locais, em WOFF2 e com `font-display: swap`. Licenças OFL acompanham os arquivos.
- Paleta, espaçamentos, raios e sombras vêm do design system. Texto pequeno sobre creme usa `#44505A` em vez do cinza terciário, que não atinge AA nessa combinação. Dourado sobre creme é decorativo; texto dourado aparece sobre navy.
- Player, acordeão, barra fixa, cards do empilhamento de valor, galeria e garantia derivam dos cards, botões e badges existentes. Não há dependência do runtime `support.js` do documento de referência.
- Fotos (originais preservados em `Fotos e Logos/`; cópias WebP em `assets/`):
  - Autoridade: `WhatsApp Image 2026-07-14 at 14.50.58 (5).jpeg` (= `foto-1.jpeg`, roupa branca, luz suave) → `bia-480/800.webp`, recorte 4:5.
  - Thumbnail da VSL: `… 14.50.58 (10).jpeg` (= `foto-2.jpeg`, camisa listrada azul, pedra/madeira) → `vsl-640/960.webp`.
  - Recapitulação (“Eu resumo pra você”): `… 14.50.58 (9).jpeg` (camisa preta, sorriso aberto, ambiente claro) → `bia-recap-480/800.webp`, recorte 4:5, saturação −8% conforme a direção de arte. No celular aparece como avatar circular; no desktop, retrato lateral.
  - Descartadas: as duas com vestido laranja/tijolo (58 (6) e (7)) destoam da paleta navy/creme; a da escada (58 (8)) é boa, mas repetiria a mesma roupa da recapitulação. Os demais arquivos da pasta são variações da logo.
- Logo: a assinatura horizontal oficial (`… 14.50.57 (11).jpeg`, idêntica a `Design System Creation/assets/logo-horizontal.jpeg`) foi convertida para WebP com fundo transparente em navy (`logo-navy-400.webp`, cabeçalho) e creme (`logo-creme-400.webp`, rodapé navy).
- A página usa as medidas do container institucional (máximo 1040px), com coluna única no mobile/tablet e grade no desktop.
- No celular, a barra de topo fica em uma linha (11px). Em telas móveis baixas, o topo reduz espaços e omite apenas a repetição decorativa do nome do produto acima da headline. A copy, a fonte de corpo de 16px e a proporção do vídeo são preservadas. Alturas ainda menores, zoom de texto ou VSL vertical podem exigir rolagem.

## Redesign visual (tarefa 2)

Mesma copy, mesma ordem e mesma lógica de checkout/UTM/Pixel/VSL/galeria; mudou só a camada visual. Tudo derivado do design system (Prata + Jost, navy/creme/branco/tint, dourado decorativo, ícones Lucide de traço 1.5, curva `cubic-bezier(.25,.1,.25,1)`).

- **Geral:** escala fluida com `clamp()` (H1 32→52px, H2 30→44px), rótulos de seção (fio dourado + texto `#44505A`), ritmo creme/branco/navy/tint, seções com `.container` interno para fundos de ponta a ponta, sombras navy mais profundas. Ícones num sprite SVG inline (`<symbol>` + `<use>`).
- **Topo/cabeçalho:** barra em navy escuro; logo oficial no lugar do monograma + texto.
- **Cabeça:** fundo creme com véus tint/dourado; “Mas, na hora, reage.” em linha própria com marca-texto dourado translúcido; VSL com sombra ampla, degradê inferior e botão de play deslocado para não cobrir o rosto; CTA maior (60px), gradiente navy, sombra e seta com microinteração; microcopy com ícones (download, arquivo, escudo).
- **Identificação:** cartões com fio dourado; a conclusão vira um bloco tint em que os rótulos (“eu sou ansiosa”…) aparecem como etiquetas.
- **Mecanismo:** navy em degradê com brilho dourado; destaque “Sete lentes” em cartão translúcido com os anéis dourados.
- **Prova:** molduras de papel com segunda folha por trás (capa em navy; Dia 1 com linhas, Dia 2 com tabela, Dia 7 com mapa) — continuam placeholders sem imagem; nota em cartão com fio dourado; autoria em cartão grande com foto, credencial em selo e nota clínica com ícone.
- **Benefícios:** cartões com check em círculo navy (grade de 3 colunas no desktop).
- **Empilhamento de valor:** cartão principal em navy com linha do tempo numerada dos 7 dias; demais itens em cartões brancos com o emoji da copy em círculo; formato do PDF em pílula com ícone.
- **Oferta:** cartão de preço branco sobre navy (filete dourado, etiqueta “7 dias · 10 a 15 min por dia”, itens como chips, preço grande em Prata, “Menos de R$6…” em destaque, CTA e selos de confiança).
- **Recapitulação:** cartão com a foto da Bia (avatar no celular, retrato no desktop).
- **Garantia:** selo SVG de 7 dias (anéis dourados, texto circular “GARANTIA DE 7 DIAS · 100% DO VALOR”, centro navy) ao lado do texto.
- **FAQ:** acordeão em cartões com botão +/− em círculo; aberto ganha sombra.
- **CTA final:** bloco navy com monograma, frase final grande e botão claro.
- **Rodapé:** navy escuro com logo creme. No celular, “© … reservados.” fica numa linha e os links na seguinte, sem “·” órfão (o separador continua no texto, apenas oculto visualmente). A reserva da barra fixa foi para dentro do rodapé (sem faixa clara no fim da página).
- **Barra fixa mobile:** fundo creme translúcido com desfoque, botão com seta.
- **Microcopy com ícones:** os “·” continuam no texto (leitores de tela/cópia), mas ficam ocultos visualmente porque os ícones já separam os itens e evitam separadores órfãos na quebra de linha.
- **Animação de entrada:** `setupReveal()` em `main.js` marca `[data-reveal]` e usa IntersectionObserver (opacity/transform, 700ms). Só ativa com JS, IntersectionObserver e sem `prefers-reduced-motion`; o que já está na tela ao carregar não anima. Sem JS, tudo fica visível.

## Arquivos criados

```text
deploy/mais-perto-de-voce/
  index.html
  styles.css
  config.js
  main.js
  assets/
    ebook/LEIAME.txt      (imagens das páginas do e-book entram aqui)
    bia-480.webp
    bia-800.webp
    bia-recap-480.webp
    bia-recap-800.webp
    logo-navy-400.webp
    logo-creme-400.webp
    vsl-640.webp
    vsl-960.webp
    monograma-96.webp
    favicon.png
    og-image.jpg
    prata-latin.woff2
    jost-latin.woff2
    Prata-OFL.txt
    Jost-OFL.txt
tests/landing/
  verify.cjs
  .gitignore
PAGINA-DE-VENDAS.md
```

Os relatórios e screenshots locais são gerados em `tests/landing/artifacts/`, ignorados pelo Git e fora da pasta publicada. Não houve alteração dos materiais de referência, da página de links nem de `vercel.json`.

## Verificação

A suite usa Node e Playwright disponíveis no ambiente de desenvolvimento, sem adicionar dependências ao site. Se necessário, indique a localização do módulo Playwright pela variável `PLAYWRIGHT_MODULE`.

```powershell
node tests/landing/verify.cjs
```

Ela abre um servidor local temporário e valida copy literal e na ordem, os 12 blocos com suas classes, hierarquia de títulos, textos dos CTAs, galeria (molduras e troca por imagem), FAQ por teclado, imagens, ausência de rolagem horizontal, cinco viewports, estados vazios, UTMs, links legais, barra fixa, regras de depoimentos e eventos de reprodução/rastreamento. As integrações externas são simuladas para não enviar eventos ao Meta nem acessar um checkout real. Os vídeos reais, o recebimento dos eventos no painel do Meta e o fluxo de compra só poderão ser homologados com os endereços e ID definitivos.

Resultado em 24/09/2026, após o redesign visual: **23 de 23 verificações aprovadas** (CTA da cabeça termina em 626px na tela de 360×640). Screenshots de inspeção com checkout/vídeo simulados: `tests/landing/artifacts/design-full-390x844.png` e `design-full-1280x900.png` (e `design-first-*`). A auditoria automatizada axe não encontrou violações WCAG A/AA nas configurações vazia e preenchida, incluindo FAQ expandido e barra fixa visível. A leitura do conteúdo, as molduras da galeria e o FAQ também funcionaram sem JavaScript. Isso complementa a inspeção visual e por teclado; não substitui uma auditoria completa com tecnologias assistivas.

| Viewport | Sem rolagem horizontal | Headline + VSL + CTA na primeira tela |
|---|---|---|
| 360 × 640 | Sim | Sim |
| 360 × 800 | Sim | Sim |
| 390 × 844 | Sim | Sim |
| 768 × 1024 | Sim | Sim |
| 1280 × 900 | Sim | Sim |

As imagens abaixo da primeira dobra usam carregamento adiado. As duas fontes somam aproximadamente 46 KB, e o retrato e a thumbnail possuem versões adequadas ao tamanho de exibição. Nenhum recurso externo é necessário com a configuração inicial.
