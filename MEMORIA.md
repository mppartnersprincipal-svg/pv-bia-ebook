# Memória compartilhada — Beatriz Machado

Atualizada em **24/09/2026**. Resumo de continuidade para Codex e Claude; detalhes em `PAGINA-DE-VENDAS.md` (estrutura de 12 blocos, classes, redesign, fotos). Confirme o estado dos arquivos antes de assumir que as pendências abaixo continuam atuais.

## Projeto e estágio atual

- Página de vendas do e-book **Mais perto de você**, de **Beatriz Machado · Psicóloga Clínica · CRP 09/16582**.
- Produto: **R$37,90**, PDF de 28 páginas, experiência guiada de 7 dias, 10–15 min/dia. Público: mulheres 18–34, celular via Meta Ads; objetivo: checkout.
- Landing em `deploy/mais-perto-de-voce/` → rota `/mais-perto-de-voce/`. `deploy/index.html` é a página de links (preservada). HTML/CSS/JS puros, sem build. `vercel.json` publica `deploy/`.
- **24/09/2026:** página reestruturada para a **nova copy de 12 blocos** e **redesign visual** completo (pedido da cliente: visual "simples e pouco chamativo"). Feito em sequência (copy → visual) para evitar conflito. Validado localmente; **ainda não publicado nem commitado**.

## Decisões e regras aprovadas

- Copy literal de `Ebook/Copy Página de Vendas - Ebook Bia.txt` (nova versão). CTAs: "QUERO COMEÇAR OS 7 DIAS" (topo, empilhamento, oferta, barra fixa) e "TIREI MINHAS DÚVIDAS, QUERO COMEÇAR" (final). O antigo "— R$37,90" nos botões **foi removido** pela nova copy.
- Rodapé: aviso educativo, identificação, © 2026, Termos, Privacidade e "Este site não é afiliado ao Facebook ou à Meta.".
- "Psicóloga Clínica" (não "Integrativa"). Nada de depoimentos inventados, contadores, escassez ou preço de/por.
- Só o design system da Bia: Prata 400 + Jost 400–500; navy `#0E3452` (hover `#092539`), creme `#FAF8F4`, branco, tint `#DCE5EC`, bordas `#E9E4DB`, textos `#1F2A33`/`#44505A`, dourado `#C2A878` decorativo (texto só sobre navy). Contraste AA.
- Rótulos visuais adicionados pelo redesign (fora da copy, aguardam aprovação da cliente): eyebrows "Para quem é", "Como funciona", "O material", "Autoria", "Os 7 dias", "O que está incluído", "Dúvidas"; etiqueta "7 dias · 10 a 15 min por dia"; selo "GARANTIA DE 7 DIAS · 100% DO VALOR".

## Estado da página

- Blocos: topbar, hero (VSL), identificação, mecanismo, prova ("Veja por dentro" + autoria + depoimentos por flag), benefícios, empilhamento de valor (linha do tempo dos 7 dias), oferta (`#oferta`, cartão de preço), recapitulação, garantia (selo SVG), FAQ (8), CTA final, rodapé, barra fixa mobile.
- **Galeria "Veja por dentro" = placeholder** (molduras de papel). Para ativar: colocar `capa.webp`, `dia-1.webp`, `dia-2-tabela.webp`, `dia-7-mapa.webp` (retrato ~3:4) em `assets/ebook/` e preencher `EBOOK_PREVIEW_IMAGES` em `config.js` (ver `assets/ebook/LEIAME.txt`).
- Fotos: de 34 arquivos em `Fotos e Logos/`, só 6 são fotos reais (resto são duplicatas/logo). Autoridade = `…14.50.58 (5)` (branco); VSL = `…58 (10)` (azul listrado); recapitulação = `…58 (9)` (preta); logo = `…57 (11)` → `logo-navy-400.webp`/`logo-creme-400.webp`.
- Animações de entrada (`setupReveal` em `main.js`) respeitam `prefers-reduced-motion`; conteúdo visível sem JS.

## Pendências para publicação

- `config.js`: `CHECKOUT_URL`, `VSL_URL`, `META_PIXEL_ID`, `TERMS_URL`, `PRIVACY_URL`, `EBOOK_PREVIEW_IMAGES` vazios. Checkout vazio = botões desabilitados (40% opacidade).
- `SHOW_TESTIMONIALS = false` até ter 3–5 depoimentos reais autorizados.
- Imagens reais das páginas do e-book (cliente enviará depois).
- Domínio definitivo: `og:image` absoluta, `og:url`, `canonical`.
- Depois: validar compra real, vídeo real e eventos no Meta.

## Última validação — 24/09/2026 (após redesign)

- `node tests/landing/verify.cjs`: **23/23 aprovadas** (copy literal e em ordem lida do .txt, 12 blocos, CTAs, UTMs, FAQ, estados vazios, galeria, rodapé, sem JS, players simulados).
- Headline + VSL + CTA na 1ª tela em 360×640 (CTA termina em 626px — no limite), 360×800, 390×844, 768×1024, 1280×900. Sem overflow. Axe: zero violações A/AA.
- Screenshots: `tests/landing/artifacts/design-full-*.png` e `design-first-*.png` (locais, ignorados pelo Git).

## Retomar rapidamente

- Preview: `python -m http.server 4173 --bind 127.0.0.1 --directory deploy` → `http://127.0.0.1:4173/mais-perto-de-voce/` (verificar porta antes).
- Testes: `node tests/landing/verify.cjs` (sobe o próprio servidor; requer Node + Playwright/Chromium + axe-core; aceita `PLAYWRIGHT_MODULE`/`AXE_SCRIPT`).
- Conferir `git status` antes de editar.

## Fontes de referência

- Copy: `Ebook/Copy Página de Vendas - Ebook Bia.txt`. Identidade: `Design System Creation/`. Fotos originais: `Fotos e Logos/` (não alterar). Institucional: `Informações Beatriz Machado/`. Detalhes técnicos: `PAGINA-DE-VENDAS.md`.

## Como manter esta memória

Ao finalizar qualquer tarefa, atualizar este arquivo e o `CLAUDE.md` (regra da usuária), mantendo-os curtos (~100 linhas). Não registrar segredos, PIDs ou estado temporário.
