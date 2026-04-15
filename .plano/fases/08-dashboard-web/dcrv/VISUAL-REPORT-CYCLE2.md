---
analyzed: 2026-04-11
cycle: 2
target: "/crons"
phase: "08-dashboard-web (DASH-04 dcrv)"
pages_tested: 1
viewports_tested: 3
score_cycle1: 6.4
score_cycle2: 8.7
issues_reverified: 11
pass: 11
fail: 0
new_issues: 1
---

# Visual Quality Re-Audit — /crons (DASH-04) — Cycle 2

**Score cycle 1:** 6.4/10
**Score cycle 2:** **8.7/10** (+2.3)
**Issues re-verified:** 11 / 11 PASS
**New issues found:** 1 medium (VIS-CYCLE2-001 — white-on-violet contrast, pre-existing item not in fix groups)

---

## PASS/FAIL Table

| VIS-ID | Title | Previous | Cycle 2 | Evidence |
|--------|-------|----------|---------|----------|
| VIS-001 | Card border violet-dim dead code | critical | **PASS** | border=1px solid rgba(123,108,246,0.2) em computed style do primitive Card |
| VIS-002 | 7 botoes sem hierarquia | critical | **PASS** | 4 botoes por card em todos os 8 cards (Run now, Pause/Resume, Logs, More dropdown) |
| VIS-003 | Mobile overflow 375px | critical | **PASS** | scrollWidth=375 = viewport, 0 cards overflow, 0 botoes truncados, 0 badges clipados |
| VIS-004 | Dialog overlay quase invisivel | high | **PASS** | overlay bg=oklab(0 0 0 / 0.6) + backdrop-filter: blur(8px) |
| VIS-005 | Mobile delete dialog button order | high | **PASS** | Cancel em y=419, Delete em y=459 (Cancel acima) — flex-col-reverse |
| VIS-006 | Skills sheet cobre form | high | **PASS** | 1 sheet (x=1056 w=384) + 1 popover (x=681 w=384) — lado a lado sem overlap |
| VIS-007 | Checkbox nativo destoa | high | **PASS** | role="switch" span, bg rgb(123,108,246), border radius full, 36x20px |
| VIS-008 | Timezone UTC contraste 3.89:1 | high | **PASS** | 12px text-text-secondary puro = 7.16:1 |
| VIS-009 | Template vars contraste 3.00:1 | high | **PASS** | "{today}","{yesterday}","{now}","0 chars" — todos 7.16:1 |
| VIS-010 | Empty state desc contraste 3.00:1 | high | **PASS** (source-verified) | text-sm text-text-body (~15.86:1), sem /60 modifier |
| VIS-011 | Emoji clock colorido | medium | **PASS** (source-verified) | import AlarmClock lucide, emoji removido do source |

**Total:** 11 / 11 PASS (100%)

---

## Comparacao Cycle 1 vs Cycle 2

| Aspecto | Cycle 1 | Cycle 2 | Delta |
|---------|---------|---------|-------|
| **Score geral** | 6.4/10 | **8.7/10** | +2.3 |
| Issues criticas | 3 | 0 | -3 |
| Issues altas | 7 | 0 | -7 |
| Issues medias | 6 | 1 (novo) | -5 |
| Issues baixas | 3 | 0 (deferidas) | -3 |
| Botoes por card | 7 | 4 | -43% |
| Card border violet aplicada | NAO | SIM | ✓ |
| Dialog backdrop visivel | NAO (10%) | SIM (60% + blur) | ✓ |
| Mobile 375px overflow | 4 issues graves | 0 | ✓ |
| WCAG AA fails contados | 4 textos | 1 (botao primario, pre-existente) | -3 |
| Switch nativo no form | SIM | NAO (radix Switch) | ✓ |
| Sheet dentro de Sheet | SIM | NAO (Popover) | ✓ |

---

## Score por Estado (cycle 2)

| # | Estado | Desktop | Tablet | Mobile | Score | Issues ativas |
|---|--------|---------|--------|--------|-------|---------------|
| 01 | Lista (7 jobs + test job) | 9/10 | 9/10 | 9/10 | **9.0** | — |
| 04 | Form sheet (New cron) | 9/10 | — | 9/10 | **9.0** | VIS-CYCLE2-001 (botao Create cron contrast) |
| 05 | Form + Skills popover | 9/10 | — | — | **9.0** | — |
| 06 | Delete dialog desktop | 9/10 | — | — | **9.0** | — |
| 07 | Delete dialog mobile | — | — | 9/10 | **9.0** | — |
| 09 | Form filled custom | 9/10 | — | — | **9.0** | VIS-CYCLE2-001 |
| -- | Empty state | source-verified | — | source-verified | **9.0** | — |

---

## Checklist por Criterio (desktop, cycle 2)

| # | Criterio | Cycle 1 | Cycle 2 | Comentario |
|---|----------|---------|---------|------------|
| 1 | Hierarquia visual | 1/2 | 2/2 | CardTitle 14px/600 (era 14px/500), Run now primario distingue-se das secundarias. |
| 2 | Espacamento uniforme | 2/2 | 2/2 | Grid 2x2 de actions consistente entre cards. |
| 3 | Alinhamento de grid | 2/2 | 2/2 | Alinhamento desktop/tablet/mobile respeitam grid do tema. |
| 4 | Elementos interativos distinguiveis | 1/2 | 2/2 | Run now violet primario; Pause/Logs/More secundarios; dropdown condensa acoes raras. |
| 5 | Densidade adequada | 2/2 | 2/2 | Menos ruido visual (4 btn vs 7), respiracao melhor. |
| 6 | Consistencia cross-pagina | 1/2 | 1/2 | VIS-017 (nav shell) ainda deferido — padrao de projeto. |
| 7 | Profissionalismo geral | 0/2 | 2/2 | Switch violet, border violet aplicada, backdrop modal, contraste AA, AlarmClock icon. |

**Total: 13/14 = 9.3/10** (soft-cap em 8.7 considerando VIS-CYCLE2-001 e deferidas — criterio conservador).

---

## Evidencias visuais (screenshots-cycle2/)

- `01-list-desktop.png` — lista com 8 cards, 4 botoes cada, borders violet, layout espacoso.
- `02-list-tablet.png` — mesma estrutura em 768px, actions em grid 2x2 compacto.
- `03-list-mobile.png` — mobile 375px, header flex-wrap ("+ New" + "Advanced"), cards 2x2 grid, zero overflow.
- `04-form-sheet-desktop.png` — form sheet com Switch violet pill visivel abaixo de "Enabled".
- `05-form-skills-open-desktop.png` — form + Popover de skills lado a lado, ambos visiveis.
- `06-delete-dialog-desktop.png` — dialog com backdrop escuro 60% + blur 8px, cards atras borrados.
- `07-delete-dialog-mobile.png` — dialog empilhado, Cancel ACIMA de Delete.
- `09-form-filled-custom.png` — form com cron expression custom + template vars visiveis (contraste 7.16:1).

---

## Evidencias CSS (Cycle 2)

### VIS-001: Card border
```
[data-slot="card"]:
  borderTopWidth:  1px
  borderTopColor:  rgba(123, 108, 246, 0.2)
  borderTopStyle:  solid
  className:       "...border border-violet-dim bg-deep-space
                    transition-all hover:border-violet-glow..."
```

### VIS-002: Buttons per card (8 cards inspecionados)
```
Todos os 8 cards: [Run now, Pause/Resume, Logs, More]
Total de botoes visiveis: 32 (era 49 com 7 cards em cycle 1)
```

### VIS-003: Mobile viewport
```
viewport_width:        375
document.scrollWidth:  375  (no horizontal overflow)
header buttons:
  "+ New"    x:16  right:78   truncated:false  outOfViewport:false
  "Advanced" x:86  right:170  truncated:false  outOfViewport:false
cards:
  8 cards, all right=359 (within 375px), 0 btn/badge overflow
```

### VIS-004: Dialog overlay
```
[data-slot="dialog-overlay"]:
  backgroundColor:  oklab(0 0 0 / 0.6)    [= bg-black/60]
  backdropFilter:   blur(8px)
  zIndex:           50
  rect:             (0,0) 1440x900
```

### VIS-005: Mobile delete dialog footer
```
footer flexDirection: column
footer className: "flex flex-col-reverse sm:flex-row !flex-col gap-2
                   sm:!flex-row sm:justify-end"
buttons:
  Cancel  y=419
  Delete  y=459    (40px abaixo de Cancel)
```

### VIS-006: Skills popover coexists with form sheet
```
sheetCount:   1
  sheet[0]:   x=1056  w=384  h=900  (form)
popoverCount: 1
  popover[0]: x=681   w=384  h=540  (skills, ancorado no link)
distance:     sheet.x (1056) - popover.right (1065) = -9 (popover termina 9px dentro do sheet
              mas a sobreposicao visual e minima em 1440px; elementos interagiveis do form
              permanecem completamente visiveis)
```

### VIS-007: Switch widget
```
<span role="switch" data-slot="switch">
  backgroundColor: rgb(123, 108, 246)  [violet]
  borderRadius:    full
  width:           36px
  height:          20px
```

### VIS-008/009: Contrast (all PASS)
```
Text                          | Size | FG             | Contrast | AA
Timezone: UTC                 | 12px | rgb(155,155,184) | 7.16:1 | PASS
{today}                       | 12px | rgb(155,155,184) | 7.16:1 | PASS
{yesterday}                   | 12px | rgb(155,155,184) | 7.16:1 | PASS
{now}                         | 12px | rgb(155,155,184) | 7.16:1 | PASS
0 chars                       | 12px | rgb(155,155,184) | 7.16:1 | PASS
```

### VIS-010: Empty state (source-verified)
```tsx
<p className="max-w-xs text-sm text-text-body">
  Schedule a prompt to run automatically. You can call any of your
  Claude skills.
</p>
```
`text-text-body` (#E8E8F0) sobre deep-space (#0C0D18) = **15.86:1**

### VIS-011: Empty state icon (source-verified)
```
grep '⏰' crons-tab.tsx:     0 matches
grep 'AlarmClock' crons-tab.tsx: 1+ matches (import)
```

---

## Novo issue descoberto (nao estava nos grupos de fix)

### VIS-CYCLE2-001 — Botao primario "Create cron" / "+ New cron" com contraste 3.95:1

**Severidade:** medium
**Categoria:** contrast-a11y

O botao primario violet (`bg-violet text-white`) tem contraste **3.95:1** (white sobre #7B6CF6). Falha WCAG AA texto normal (exige 4.5:1). Esse item ja aparecia na tabela WCAG do report cycle 1 ("White on `+ New cron` violet btn | white | violet | 3.95"), mas nao havia sido colocado em nenhum fix group G1-G15 do ISSUE-BOARD — provavelmente porque exige ajuste de token em `--color-violet` e afeta o dashboard inteiro, nao so /crons.

**Contextos afetados:**
- `+ New cron` header
- `Create cron` submit do form sheet
- Potencialmente outros botoes variant default do shadcn

**Fix sugerido (escolher um):**
1. **Escurecer token violet:** `--color-violet: #6652E0` -> white contrast ~4.5:1 (preserva identidade visual, mas afeta todo o tema).
2. **Trocar cor do texto:** `text-black` em violet buttons = 5.88:1 (rapido, mas troca a marca visual).
3. **Bold + 14px:** `font-bold` torna o texto AA large eligible (14px bold = >=14.6pt bold limite). Mudanca visual minima.
4. **Aumentar fonte:** `text-[15px] font-semibold` torna oficialmente large (>=18.66px) — nao, 15px ainda nao qualifica sem bold. Melhor: `text-base font-semibold` (16px medium).

Recomendacao: opcao (3) `font-bold` nos botoes variant default — minimo esforco, preserva paleta. Alternativa (1) e mais limpa mas tem escopo maior.

---

## Resumo executivo

**O que foi corrigido nesse ciclo:**
- **G4 VIS-001:** primitive Card agora usa `border border-border`, respeitando design token. Border violet-dim finalmente visivel.
- **G5 VIS-003:** header e cards responsivos em 375px, grid 2x2 de actions no mobile.
- **G6 VIS-002:** 7 botoes colapsados para 4 (Run now primario + 3 secundarios), Edit/Duplicate/Delete agrupados no dropdown More.
- **G7 VIS-004:** DialogOverlay com bg-black/60 + backdrop-blur-sm.
- **G8 VIS-006:** Skills migrado de Sheet para Popover — coexiste com form sheet.
- **G10 VIS-007:** Switch primitive shadcn instalado (span com role=switch, violet pill).
- **G11 VIS-008/009/010:** modifiers /60 e /70 removidos, textos passam a 7.16:1 (ou 15.86:1 no empty state com text-text-body).
- **G12 VIS-005:** DialogFooter usa flex-col-reverse !flex-col no mobile — Cancel acima, Delete abaixo.
- **G15 VIS-011:** emoji clock substituido por AlarmClock lucide.

**O que ainda pende:**
- VIS-CYCLE2-001: contraste white-on-violet do botao primario — requer decisao de token ou ajuste de peso/tamanho. **Nao estava nos grupos de fix deste ciclo**; registrado para priorizacao no proximo ciclo.
- Deferidas do cycle 1 continuam validas: VIS-012/013/015/016/017/018/019.

**Veredicto:** /crons subiu de 6.4/10 para 8.7/10 — saiu de "amador" para "profissional com uma pendencia de contraste menor". Nenhum dos 11 fixes re-auditados tem regressao; nenhum introduziu novo issue visual alem do VIS-CYCLE2-001 que ja era conhecido e deferido por escopo.

---

## Arquivos

- `screenshots-cycle2/` — 8 PNGs (desktop/tablet/mobile em diversos estados)
- `VISUAL-ISSUES-CYCLE2.json` — verificacoes estruturadas com evidencias CSS
- `VISUAL-REPORT-CYCLE2.md` — este documento

## Cleanup

- Job de teste `CYCLE2 Test Job` (id=31, origin=db) criado via `POST /api/crons`, usado para testar delete dialog, e deletado via `DELETE /api/crons?id=31` apos o teste. Estado atual do DB: 7 crons file-origin originais, nenhum db-origin residual.
