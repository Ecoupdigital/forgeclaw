---
analyzed: 2026-04-11
target: "/crons"
phase: "08-dashboard-web (DASH-04 dcrv)"
pages_tested: 1
viewports_tested: 3
states_captured: 10
score: 6.4
issues_found: 19
critical: 3
high: 7
medium: 6
low: 3
---

# Visual Quality Report — /crons (DASH-04)

**Score geral: 6.4 / 10** — visualmente consistente com o restante do dashboard e respeita os tokens do tema, mas com varias falhas praticas de polish: um bug estrutural no primitive `<Card>` que derruba a borda violet, multiplos textos com contraste abaixo de WCAG AA, quebras severas no breakpoint mobile e um fluxo de "Skills disponiveis" confuso que oculta o form. Nada impede o usuario de usar a tela, mas o conjunto derruba a percepcao de profissionalismo.

**Evidencia:** 21 screenshots em `.plano/fases/08-dashboard-web/dcrv/screenshots/` (3 viewports x 7 estados + extras) e 3 dumps JSON de computed styles.

---

## Score por estado

| # | Estado | Desktop | Tablet | Mobile | Score | Issues |
|---|--------|---------|--------|--------|-------|--------|
| 01 | Lista inicial (7 jobs file-origin) | 8/10 | 7/10 | 4/10 | 6.3 | VIS-001, VIS-002, VIS-003, VIS-004, VIS-014 |
| 02 | Hover em card (CDP mousemove real) | 7/10 | — | — | 7.0 | VIS-005 |
| 03 | Form sheet vazio (New cron) | 8/10 | 8/10 | 7/10 | 7.7 | VIS-006, VIS-007 |
| 04 | Form com cron invalido | 8/10 | — | — | 8.0 | — |
| 05 | Form custom preenchido + preview | 8/10 | — | — | 8.0 | VIS-008 |
| 06 | Skills disponiveis (sheet aninhado) | 5/10 | — | — | 5.0 | VIS-009 (critical UX) |
| 07 | Delete confirmation dialog | 6/10 | — | 5/10 | 5.5 | VIS-010, VIS-011, VIS-012 |
| 08 | Advanced HEARTBEAT.md editor | 8/10 | — | 7/10 | 7.5 | — |
| 09 | Toast de sucesso | 7/10 | — | 5/10 | 6.0 | VIS-013 |
| 10 | Empty state (sem jobs) | 7/10 | — | 4/10 | 5.5 | VIS-014, VIS-015 |

**Issues cross-estado:** VIS-016 a VIS-019 (consistencia, design tokens, tooltips nativos, nav shell).

---

## Checklist por criterio (7 criterios, desktop baseline)

| # | Criterio | Score | Comentario |
|---|----------|-------|------------|
| 1 | Hierarquia visual | 1/2 | Titulo da pagina `Cron Jobs (N active)` e titulo do card ambos 14px/500 — sem diferenciacao. Form sheet title 16px — melhor, mas ainda discreto. |
| 2 | Espacamento uniforme | 2/2 | Cards com gap-3 consistente, padding 16px, labels 6px de label->input. OK. |
| 3 | Alinhamento de grid | 2/2 | Header esquerdo x direito bem alinhados, badges em linha com titulo do card, form sheet com colunas unicas. |
| 4 | Elementos interativos distinguiveis | 1/2 | Botao primario violet e claro; botoes outline texto secundario sao quase identicos entre si (ver VIS-002). |
| 5 | Densidade adequada | 2/2 | Boa respiracao em desktop. |
| 6 | Consistencia cross-pagina | 1/2 | Tokens batem com `/` root, mas /crons NAO tem nav shell (ver VIS-017). |
| 7 | Profissionalismo geral | 0/2 | Checkbox nativo, border de card morta, contrastes falhando, stacking de modais no mobile, dialog sem backdrop — derrubam o polish. |

**Desktop: 9/14 = 6.4/10.**

---

## Issues criticas (3)

### VIS-001 — Border dos cards NAO e violet-dim (primitive `<Card>` usa `ring-1 ring-foreground/10`)
- **Severidade:** critical
- **Categoria:** design-tokens / consistency
- **Evidencia CSS:** `data-slot="card"` computed `border: 0px solid rgba(123, 108, 246, 0.2)`. Border-width e 0px — apesar da className `border-violet-dim` em `cron-card.tsx` (linha 50). O que o usuario ve e o **ring branco 10%** do primitive shadcn (`ring-1 ring-foreground/10`, `card.tsx:15`), nao o token violet do projeto.
- **Consequencia:** `hover:border-violet-glow` e efetivamente dead code. `highlighted ring-2 ring-violet` no estado pulse funciona porque usa `ring`. Visualmente os cards parecem "bordered" mas nao respeitam a paleta.
- **Fix sugerido:** em `cron-card.tsx` trocar `border-violet-dim` por `ring-violet-dim` (ou adicionar `border` alem do `border-violet-dim`); alternativamente editar `ui/card.tsx` para usar `border border-border` em vez de `ring-1 ring-foreground/10` para respeitar design token global.
- **Screenshot:** `screenshots/01-initial-desktop.png` + `css-initial-desktop.json`.

### VIS-002 — Muitos botoes outline visualmente identicos (5+ por card)
- **Severidade:** high -> critical pelo volume
- **Categoria:** visual-hierarchy / UX
- **Evidencia CSS:** Cada card tem 7 botoes em sequencia: `View logs | Run now | Pause | Edit | Duplicate | Delete`, todos `fontSize:12px padding:0 8px bg:void border:violet-dim`. Apenas "Delete" tem texto vermelho e "Run now" tem texto violet. Os demais (`Pause/Edit/Duplicate/View logs`) sao pixel-identicos.
- **Consequencia:** usuario precisa ler texto para distinguir. Em 7 cards = 49 botoes na tela.
- **Fix sugerido:** (a) agrupar acoes secundarias num dropdown "..." (pattern comum em listas); (b) usar icones + label, nao so label; (c) aumentar hierarquia — `Run now` deveria ser o CTA primario do card (fundo violet outline).
- **Screenshot:** `screenshots/01-initial-desktop.png`.

### VIS-003 — Mobile overflow horizontal severo (375px)
- **Severidade:** critical
- **Categoria:** responsive / usability
- **Evidencia screenshot:** `screenshots/01-initial-mobile.png` mostra: (a) "+ New cron" clipado para "+ New cro..." no header; (b) linha de 7 botoes do card quebra em duas linhas mas "Delete" aparece solto na terceira linha e "Edit" fica com opacity-40 do disabled colado em "Pause" sem espaco visual; (c) o badge `success` fica fora do viewport do cabecalho do card; (d) texto "Last run" em 12px coube, mas `Schedule:` colide com monospace longo.
- **Consequencia:** a pagina e pratica mente inusavel em telefones pequenos (<= 375px).
- **Fix sugerido:** em 375px, o header precisa `flex-col gap-2` ou abbreviar para "+ New"; cards devem usar `grid-cols-2 gap-2` para os botoes; badges no header devem wrap (`flex-wrap`).
- **Screenshots:** `01-initial-mobile.png`, `10-empty-state-mobile.png`.

---

## Issues altas (7)

### VIS-004 — Dialog de delete com backdrop quase invisivel (oklab 0 0 0 / 0.1)
- **Severidade:** high
- **Categoria:** modality / visual-clarity
- **Evidencia CSS:** `[data-slot="dialog-overlay"]` computed `backgroundColor: oklab(0 0 0 / 0.1)` — apenas 10% de opacidade preta, SEM blur. Em `screenshots/07-delete-dialog-desktop.png` os cards atras do dialog estao quase totalmente legiveis.
- **Consequencia:** o dialog parece "flutuando" e nao modal; usuario pode nem perceber que algo exige confirmacao. Acessibilidade tambem sofre (foco visual fraco).
- **Fix sugerido:** editar `ui/dialog.tsx` para usar `bg-black/60 backdrop-blur-sm` (shadcn padrao moderno) ou `bg-void/80 backdrop-blur-sm` respeitando tokens.
- **Screenshot:** `07-delete-dialog-desktop.png`.

### VIS-005 — Dialog de delete com ordem de botoes invertida (Delete em cima, Cancel embaixo) no mobile
- **Severidade:** high
- **Categoria:** UX / safety
- **Evidencia screenshot:** `screenshots/07-delete-dialog-mobile.png` empilha botoes e "Delete" aparece em cima do "Cancel" porque `DialogFooter` no shadcn default usa `sm:flex-row-reverse` mas em mobile `flex-col` mantem a ordem do DOM que e `Cancel, Delete`. O resultado visual no screenshot mostra Delete vermelho PRIMEIRO.
- **Consequencia:** em acao destrutiva, o primeiro botao deve ser o de menor risco (Cancel). Pattern atual aumenta chance de delete acidental por tap rapido.
- **Fix sugerido:** forcar ordem reversa no mobile (`flex-col-reverse sm:flex-row`) ou pelo menos garantir `Cancel` em primeiro destaque visual. Alternativamente: tornar Delete secundario (outline red) e Cancel primario (violet).
- **Screenshot:** `07-delete-dialog-mobile.png`.

### VIS-006 — Skills sheet oculta o form sheet durante consulta (dois Sheets side="right" empilhados)
- **Severidade:** high
- **Categoria:** UX / information-architecture
- **Evidencia CDP:** dois `[data-slot="sheet-content"]` coexistem no DOM: form em x=928 w=512, skills em x=1056 w=384 — ambos z-50, side=right. Skills cobre 75% da largura do form, deixando apenas 128px visiveis a esquerda.
- **Consequencia:** usuario clica "Skills disponiveis (33)" para ver nomes das skills, mas PERDE visualmente o campo Prompt que esta tentando preencher. Nao consegue "olhar e escrever" — precisa fechar para cada consulta.
- **Fix sugerido:** skills NAO deveria ser outro Sheet. Opcoes: (a) `<Popover>` ancorado no link, (b) secao expansivel inline abaixo do textarea, (c) sheet do lado esquerdo (`side="left"`). Melhor ainda: autocomplete no proprio textarea.
- **Screenshot:** `06-skills-sheet-desktop.png` vs `06b-after-skills-closed-desktop.png` (form intacto apos fechar).

### VIS-007 — Checkbox "Enabled" usa estilo nativo do browser (branco/cinza out-of-theme)
- **Severidade:** high
- **Categoria:** consistency / design-tokens
- **Evidencia codigo:** `cron-form-sheet.tsx:391` usa `<input type="checkbox" className="h-4 w-4 accent-violet">`. `accent-violet` so tinge quando checked; o box unchecked usa defaults do Chrome (fundo branco, borda cinza).
- **Evidencia screenshot:** `screenshots/03-form-sheet-empty-desktop.png` — o checkbox abaixo de "Enabled" e visualmente uma caixa cinza clara destacando-se do dark theme.
- **Consequencia:** ponto de quebra visual claro. Todo o resto do form e dark + violet, so o checkbox grita.
- **Fix sugerido:** usar `<Checkbox>` do shadcn (precisa criar em `ui/checkbox.tsx` via `bunx shadcn add checkbox`), ou um switch dedicado. Alternativamente: um toggle custom com o token violet.
- **Screenshot:** `03-form-sheet-empty-desktop.png` (canto inferior esquerdo do sheet).

### VIS-008 — `Timezone: UTC` com contraste 3.89:1 (FAIL WCAG AA)
- **Severidade:** high (acessibilidade)
- **Categoria:** contrast / a11y
- **Evidencia CSS:** `cron-form-sheet.tsx:307` usa `text-text-secondary/70` => rgba(155,155,184,0.7) sobre `bg-deep-space` (rgb 12,13,24). Contraste calculado: **3.89:1**. WCAG AA exige 4.5:1 para texto normal.
- **Tamanho do texto:** 10px — ainda pior (AA large text = 18.66px+/bold).
- **Consequencia:** info importante (fuso horario dos proximos runs) fica quase ilegivel para usuarios com baixa visao.
- **Fix sugerido:** `text-text-secondary` (sem /70), que tem 7.16:1. Aumentar fonte para 11-12px.
- **Screenshot:** `03-form-sheet-empty-desktop.png`.

### VIS-009 — `Template vars: {today} {yesterday} {now}` e `N chars` com contraste 3.00:1 (FAIL WCAG AA)
- **Severidade:** high (acessibilidade)
- **Categoria:** contrast / a11y
- **Evidencia CSS:** `cron-form-sheet.tsx:351` e `:356` usam `text-text-secondary/60` => rgba(155,155,184,0.6). Contraste **3.00:1** — falha normal e passa so como large text (nao aplica, texto e 10px).
- **Fix sugerido:** `text-text-secondary/80` minimo (4.6:1) ou ideal `text-text-secondary` (7.16:1).

### VIS-010 — `No cron jobs yet` copy secundario com contraste 3.00:1 (FAIL WCAG AA)
- **Severidade:** high
- **Categoria:** contrast / a11y
- **Evidencia codigo:** `crons-tab.tsx:289` usa `text-text-secondary/60` para "Schedule a prompt to run automatically. You can call any of your Claude skills."
- **Fix sugerido:** `text-text-secondary` ou `text-text-body` (15.86:1) — e empty state, nao precisa ser subliminar.
- **Screenshot:** `10-empty-state-desktop.png`.

---

## Issues medias (6)

### VIS-011 — Emoji `⏰` do empty state renderiza colorido (nao monocromatico)
- **Severidade:** medium
- **Categoria:** visual-consistency
- **Evidencia screenshot:** `10-empty-state-desktop.png` mostra o alarm-clock emoji em vermelho/branco (fonte de emoji do sistema). Destoa completamente do dark theme violet.
- **Fix sugerido:** substituir por icone lucide-react (`<AlarmClock className="h-12 w-12 text-violet/60" />`) para ficar monocromatico e respeitar tokens.
- **Screenshot:** `10-empty-state-desktop.png`.

### VIS-012 — Titulo da pagina (`Cron Jobs (N active)`) e titulo de card ambos 14px
- **Severidade:** medium
- **Categoria:** visual-hierarchy
- **Evidencia CSS:** `h2.text-sm` (14px/600) igual a `CardTitle` forcada para `text-sm` (14px/500).
- **Consequencia:** ao fazer scroll, nao ha ancora visual clara de "header da pagina".
- **Fix sugerido:** subir o titulo para `text-base` ou `text-lg` (16-18px) com weight 600, deixando cards em 14px/500.
- **Screenshot:** `01-initial-desktop.png`.

### VIS-013 — 3 badges por card (`FILE`, `Active`, `success`) competem com o titulo
- **Severidade:** medium
- **Categoria:** density / hierarchy
- **Evidencia screenshot:** `01-initial-desktop.png` — header do card tem titulo a esquerda e 3 badges a direita. Em telas maiores isso respira, mas em tablet ja tem 3 badges empurrando o titulo.
- **Fix sugerido:** `origin` badge e meta (util para distinguir db vs file) mas poderia ser visual sutil — tipo dot indicator ao inves de badge com label. `Active` e `Paused` poderia ser substituido por opacity-60 no card inteiro quando paused (em vez de badge). `success/failure` do lastStatus e o mais util — manter.
- **Screenshot:** `01-initial-desktop.png`.

### VIS-014 — Status spinner do "Run now" sem indicacao global
- **Severidade:** medium
- **Categoria:** feedback
- **Evidencia codigo:** `cron-card.tsx:134` troca label por `"Running"` com spinner inline so no botao clicado. Nao ha toast/banner global.
- **Consequencia:** se usuario clicar e fazer scroll, perde o feedback visual.
- **Fix sugerido:** exibir toast "Cron 'X' iniciada" imediatamente ao clicar (ja existe infra de toast no `crons-tab.tsx`).

### VIS-015 — Header da pagina tem altura fixa 40px (h-10) e pode comprimir em mobile
- **Severidade:** medium
- **Categoria:** responsive
- **Evidencia CSS:** `crons-tab.tsx:255` usa `h-10 items-center justify-between` — em mobile com "+ New cron" + "Advanced" buttons de 14px altura, cabe, mas titulo `text-sm` ja esta no limite.
- **Fix sugerido:** `min-h-10` em vez de `h-10` para permitir crescer se conteudo precisar.

### VIS-016 — Tooltips sao `title=""` nativos do browser (delay 1-2s, styling do OS)
- **Severidade:** medium
- **Categoria:** UX / consistency
- **Evidencia codigo:** `cron-card.tsx:155,164,174` usa `title=` para explicar por que Edit/Delete estao disabled.
- **Consequencia:** tooltip demora 1-2s para aparecer, tem estilo do OS (branco/cinza no Linux, dark no macOS), e nao renderiza nos estados disabled consistentemente (em alguns browsers disabled buttons nao disparam hover events = tooltip nunca aparece).
- **Fix sugerido:** criar `ui/tooltip.tsx` do shadcn (radix tooltip) e usar. Bonus: pode aparecer mesmo em botao disabled se wrap em span.

---

## Issues baixas (3)

### VIS-017 — /crons nao tem nav shell (sem link back para /, /memory, etc)
- **Severidade:** low (consistente com /memory, /harness, /config — padrao do projeto)
- **Categoria:** navigation / IA
- **Evidencia codigo:** `app/crons/page.tsx` renderiza `<CronsTab>` em `<div className="h-screen">` sem DashboardShell. Comparar com `app/page.tsx` que usa DashboardShell com tabs.
- **Consequencia:** se usuario bookmarkar `/crons`, nao tem como voltar exceto por URL manual.
- **Fix sugerido:** extrair um `DashboardLayout` ou criar um `AppLayout` em `app/layout.tsx` com header de nav reutilizavel. Fora de escopo do DASH-04, mas bom registrar.
- **Screenshot:** `99-dashboard-root-for-comparison-desktop.png` mostra a shell presente no `/`.

### VIS-018 — Next.js devtools indicator ("N" floating) sobrepoe conteudo no canto inferior esquerdo
- **Severidade:** low
- **Categoria:** dev-environment
- **Evidencia screenshot:** em quase todas capturas mobile aparece um circulo preto com "N" em baixo a esquerda (01-initial-mobile, 07-delete-dialog-mobile, 10-empty-state-mobile). E o devtools indicator do Next 16.
- **Consequencia:** apenas em dev — nao aparece em producao. Mas durante QA esta confundindo screenshots.
- **Fix sugerido:** none (cosmetico, so afeta dev). Alternativamente desabilitar devIndicators no next config para captures de QA.

### VIS-019 — `text-[10px]`, `text-[11px]`, `text-[10px] text-text-secondary/60` usados ad-hoc no form sheet
- **Severidade:** low
- **Categoria:** design-tokens / tailwind-scale
- **Evidencia codigo:** `cron-form-sheet.tsx:307 (10px), :316 (11px), :347 (11px), :351 (10px), :355 (10px)`. Tamanhos fora da escala Tailwind padrao (12/14/16/18/20/24).
- **Consequencia:** micro-inconsistencias na escala tipografica — diferente entre "preview next runs" (11px) e "Timezone" (10px) sem razao semantica.
- **Fix sugerido:** padronizar em 11px (texto meta) ou usar `text-xs` (12px). Se precisar <12, criar token `text-meta` no theme.

---

## Consistencia cross-estado

| Aspecto | Consistente? | Detalhes |
|---------|-------------|----------|
| Header/Nav | N/A (nao tem) | VIS-017 |
| Cores primarias (violet) | SIM | `+ New cron`, `Create cron`, link Skills, focus ring — todos `bg-violet` / `text-violet` / `ring-violet`. |
| Tokens de fundo | SIM | `bg-deep-space` (#0C0D18) em cards e sheets; `bg-night-panel` em inputs. |
| Tipografia (familia) | SIM | Inter para tudo exceto schedule expressions (font-mono JetBrains). |
| Tipografia (escala) | PARCIAL | Varios `text-[10px]` e `text-[11px]` ad-hoc (VIS-019); hierarquia fraca entre h2 pagina e CardTitle (VIS-012). |
| Radius | SIM | `rounded-xl` (11.2px) nos cards, `rounded-md` (6.4px) nos botoes — escala consistente. |
| Badge style | SIM | Todos 10px uppercase outline — coerentes entre si. |
| Button style | PARCIAL | 5 botoes outline identicos por card (VIS-002) — precisa hierarquia. |
| Sheet vs Dialog | INCONSISTENTE | Form sheet lateral + skills sheet ALSO lateral = colisao (VIS-006). |
| Checkbox | NAO | `Enabled` nativo, resto dark theme (VIS-007). |

---

## Design Tokens Compliance

| Token | Valor | Usado corretamente? |
|-------|-------|---------------------|
| `--color-void` `#06070E` | body background | SIM |
| `--color-deep-space` `#0C0D18` | cards, sheets | SIM |
| `--color-night-panel` `#121425` | inputs, log rows | SIM |
| `--color-violet` `#7B6CF6` | primary buttons, focus, links | SIM |
| `--color-violet-dim` `rgba(123,108,246,0.2)` | borders | **NAO** — primitive `<Card>` usa `ring-foreground/10` (VIS-001) |
| `--color-violet-glow` `rgba(123,108,246,0.4)` | hover border | **NAO** — dead code por VIS-001 |
| `--color-text-primary` `#FFFFFF` | h2, card titles | SIM |
| `--color-text-body` `#E8E8F0` | input text, values | SIM |
| `--color-text-secondary` `#9B9BB8` | labels, meta | PARCIAL — `/60` e `/70` modifiers falham WCAG AA (VIS-008, VIS-009, VIS-010) |

---

## Medicoes WCAG AA (contraste)

| Elemento | FG | BG | Ratio | AA normal | AA large |
|---------|-----|-----|------|-----------|----------|
| Titulo pagina "Cron Jobs" | text-primary | deep-space | 19.33 | PASS | PASS |
| Card title | text-primary | deep-space | 19.33 | PASS | PASS |
| Prompt value | text-body | deep-space | 15.86 | PASS | PASS |
| Label "Schedule:" | text-secondary | deep-space | 7.16 | PASS | PASS |
| **Timezone: UTC** | text-secondary/70 | deep-space | **3.89** | **FAIL** | PASS |
| **Template vars** | text-secondary/60 | deep-space | **3.00** | **FAIL** | PASS |
| **Empty state desc** | text-secondary/60 | deep-space | **3.00** | **FAIL** | PASS |
| Link "Skills disponiveis (33)" | violet | deep-space | 4.90 | PASS | PASS |
| `Delete` button text | red-400 | deep-space | 6.99 | PASS | PASS |
| `Active` badge text | emerald-400 | deep-space (~bg) | 10.06 | PASS | PASS |
| White on `+ New cron` violet btn | white | violet | 3.95 | **FAIL** | PASS |

**3 textos falham AA normal. 1 botao primario falha AA normal mas passa como large (borderline — texto e 12.8px/500, nao se qualifica formalmente como large).**

---

## Resumo executivo

**O que esta bom:**
- Paleta violet + deep-space coerente entre todos os estados.
- Form sheet tem fluxo logico: Name -> Schedule (preset/custom) -> preview -> Prompt -> Target -> Enabled -> Save/Cancel. Hierarquia label/input/helper clara.
- Validacao do cron em tempo real (preview "Every hour" + next runs). Bom feedback inline.
- Advanced sheet e escape hatch bem posicionada — respeita tokens, fonte mono pro conteudo raw.
- Toast tem z-index correto (z-[100] > dialog z-50).
- Empty state tem CTA claro ("+ Create your first cron").
- Separacao db-origin (deletavel/editavel) vs file-origin (read-only) e visualmente representada via badge + disabled state + tooltip explicativo.

**O que precisa consertar antes de shipar:**
1. VIS-001 (border violet-dim nao aplica) — correcao de 1 linha em `cron-card.tsx` OU no primitive `ui/card.tsx`.
2. VIS-003 (mobile overflow) — adicionar `flex-wrap` / `flex-col` responsivos no header e nos action buttons.
3. VIS-004 (dialog sem backdrop) — atualizar `ui/dialog.tsx` para usar `bg-black/60 backdrop-blur-sm`.
4. VIS-006 (skills sheet colide com form) — trocar por Popover ou secao expansivel inline.
5. VIS-007 (checkbox nativo) — adicionar shadcn Checkbox ou toggle custom.
6. VIS-008/009/010 (contraste) — trocar `text-text-secondary/60` e `/70` por `text-text-secondary` direto.

**O que pode esperar:**
- VIS-002 (7 botoes por card) — redesign mais amplo, fora do escopo de dcrv.
- VIS-017 (nav shell em rotas sub) — padrao de projeto, fora de dcrv.

---

## Arquivos

- `screenshots/` — 21 PNGs (3 viewports x 7 estados + 3 extras)
- `screenshots/css-initial-desktop.json` — dump de computed styles do estado inicial
- `screenshots/css-form-sheet.json` — dump do form sheet
- `screenshots/css-delete-dialog.json` — dump do dialog
- `VISUAL-ISSUES.json` — todas as 19 issues em formato estruturado
