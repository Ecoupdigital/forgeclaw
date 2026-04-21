---
phase: 27-dashboard-first-run-onboarding
plan: 27-03
subsystem: dashboard
tags: [onboarding, ui, split-pane, diff-highlight, responsive, react-hook]
requires:
  - "27-01 (proxy gates + /app/onboarding/layout.tsx + sentinel helpers)"
  - "27-02 (6 API routes /api/onboarding/* + DTOs OnboardingSessionSnapshot)"
  - "26 (DEFAULT_BUDGET constants, harnessFiles order)"
provides:
  - "hooks/use-onboarding.ts (useOnboarding — single source of truth client-side)"
  - "components/onboarding/OnboardingApp.tsx (container client com loading/error states)"
  - "components/onboarding/OnboardingLayout.tsx (split desktop >=768px / tabs mobile)"
  - "components/onboarding/InterviewerChat.tsx (bolhas + thinking + StatusPill + textarea)"
  - "components/onboarding/HarnessPreview.tsx (7 tabs SOUL/USER/AGENTS/TOOLS/MEMORY/STYLE/HEARTBEAT)"
  - "components/onboarding/DiffHighlight.tsx (LCS line-by-line emerald/red/secondary)"
  - "components/onboarding/ActionsBar.tsx (Pausar/Pular/Aprovar + confirm dialogs)"
affects:
  - "packages/dashboard/src/app/onboarding/page.tsx (substitui placeholder da 27-01 por <OnboardingApp />)"
tech-stack:
  added: []
  patterns:
    - "FetchState discriminated union (idle/loading/ready/error) pra narrowing no client"
    - "Optimistic UI update em sendMessage (status=thinking antes do server responder)"
    - "matchMedia listener dentro de useEffect pra responsive runtime (evita hydration mismatch)"
    - "LCS O(m*n) com walk-back pra diff unificado — bom pra arquivos <200 linhas"
    - "Bubble e StatusPill como helpers locais no InterviewerChat (nao exportados) — encapsulamento simples"
    - "handlePause com window.close + alert fallback (placeholder honesto ate 27-04 entregar pause real)"
key-files:
  created:
    - "packages/dashboard/src/hooks/use-onboarding.ts (216 linhas)"
    - "packages/dashboard/src/components/onboarding/DiffHighlight.tsx (116 linhas)"
    - "packages/dashboard/src/components/onboarding/HarnessPreview.tsx (101 linhas)"
    - "packages/dashboard/src/components/onboarding/InterviewerChat.tsx (218 linhas)"
    - "packages/dashboard/src/components/onboarding/ActionsBar.tsx (131 linhas)"
    - "packages/dashboard/src/components/onboarding/OnboardingLayout.tsx (58 linhas)"
    - "packages/dashboard/src/components/onboarding/OnboardingApp.tsx (88 linhas)"
  modified:
    - "packages/dashboard/src/app/onboarding/page.tsx (15 linhas; substitui placeholder 27-01)"
decisions:
  - "Hook useOnboarding e single source of truth — snapshot + inFlight + error + 5 acoes (start/refresh/sendMessage/approve/skip). Evita prop-drilling e centraliza fetch em 1 lugar"
  - "Optimistic append do turno do user no sendMessage: antes do /api responder, UI ja mostra mensagem + status=thinking. Reduz percepcao de latencia de ~400ms (round-trip Interviewer) pra <16ms"
  - "NO_SESSION + autoStart=true encadeia refresh -> start automaticamente. Usuario que entra em /onboarding nao precisa clicar 'iniciar' — a pagina boota entrevista sozinha no mount"
  - "ALREADY_DONE retornado pelo POST /start forca redirect pra /. Belt-and-suspenders contra race com proxy (caso sentinel apareca entre proxy check e start)"
  - "LCS sobre diff npm package: zero deps novas, ~40 linhas, determinista, suficiente pra arquivos harness (<200 linhas). Se precisar de arquivo grande no futuro, trocar e tambem trivial"
  - "maxLines=400 no DiffHighlight: evita crash de UI se diff for catastrofico (ex: arquivo reescrito inteiro 1000L -> 400 linhas visiveis + contador de overflow)"
  - "FILE_ORDER hardcoded em HarnessPreview em vez de iterar HARNESS_FILES_ALL do core: mantem UI estavel contra mudancas futuras no core e nao adiciona import @forgeclaw/core no bundle client"
  - "matchMedia dentro de useEffect com setIsDesktop(false) inicial: hydration-safe. Server renderiza mobile layout, client atualiza apos mount. Pequeno flash de re-render no desktop, mas evita mismatch erro"
  - "StatusPill com labels em pt-BR traduzidos (pronto/aguardando/pensando/finalizado/abortado/erro): localidade do produto e pt-BR, tradicao do dashboard existente"
  - "handlePause usa window.close + alert fallback em vez de criar /api/onboarding/pause: pause de verdade e escopo de 27-04. Por ora, tab fechada = proxima visita reabre entrevista ativa (store singleton HMR-safe mantem)"
  - "Bubble e StatusPill helpers locais (nao exportados, mesmo arquivo): scope minimo, evita 3 arquivos pra algo que so InterviewerChat usa"
  - "Error banner com role='alert' e Retry button inline: accessibility + affordance clara em caso de 401/500"
  - "Tailwind classes usam tokens CSS do dashboard existente (bg-void, bg-deep-space, bg-night-panel, text-text-primary, text-text-secondary, text-text-disabled, violet, accent, emerald-500, red-500) — consistencia visual"
metrics:
  duration_seconds: 304
  tasks_completed: 8
  tasks_total: 8
  commits: 7
  files_created: 7
  files_modified: 1
  tests_added: 0
  completed_at: "2026-04-21T13:01:16Z"
---

# Fase 27 Plano 03: Componentes UI (Chat + Preview Split + Actions) — Summary

## One-liner

UI de onboarding em 7 componentes React client + hook `useOnboarding` consumindo as 6 API routes da 27-02 — split pane responsivo (>=768px: 2-col grid; mobile: Tabs shadcn), chat com bolhas/thinking/StatusPill pt-BR, preview com 7 tabs (SOUL/USER/AGENTS/TOOLS/MEMORY/STYLE/HEARTBEAT) e `DiffHighlight` via LCS O(m*n), barra de acoes com dialogs de confirmacao — validado com typecheck zero-erro no escopo + build Turbopack `Compiled successfully in 3.0s` + probe HTTP 200 em `/onboarding` renderizando `"Carregando onboarding..."` com script chunk `OnboardingApp.tsx` no bundle.

## O que foi construido

### 1. `hooks/use-onboarding.ts` (216 linhas)

Hook que encapsula o ciclo de vida completo da entrevista:

- **FetchState discriminated union**: `idle | loading | ready{snapshot} | error{error,code}`
- **fetchJson helper**: wrapper em torno de `fetch` com `credentials: 'same-origin'` (cookie `fc-token`), JSON error codes extraidos do body
- **bootstrap on mount**: `refresh()` -> se 404 NO_SESSION e `autoStart=true`, cai pra `start()`
- **ALREADY_DONE handler**: 409 no `/start` redireciona pra `/` via `window.location.href`
- **Optimistic update em sendMessage**: appenda turno do user + seta `status=thinking` antes do server responder
- **approve/skip**: retorna `redirectTo` do server e navega via `window.location.href`
- **mounted ref**: previne setState apos unmount (dev HMR)

API expoe: `{ state, snapshot, inFlight, error, refresh, start, sendMessage, approve, skip }`.

### 2. `components/onboarding/DiffHighlight.tsx` (116 linhas)

Renderizador de diff line-by-line via LCS:

- Tabela LCS O(m*n) construida com nested loop
- Walk-back emite sequencia de `{kind: 'unchanged'|'added'|'removed', text}`
- `reverse()` no final pra ordem natural (topo -> base)
- Early return se `oldText === newText` (todas linhas unchanged)
- Render via `<pre><code>` com spans coloridos:
  - `added`: `bg-emerald-500/10 text-emerald-300` + prefixo `+`
  - `removed`: `bg-red-500/10 text-red-300 line-through` + prefixo `-`
  - `unchanged`: `text-text-secondary` + prefixo ` `
- `maxLines=400` default; overflow vira `"... (N more lines truncated)"`

### 3. `components/onboarding/HarnessPreview.tsx` (101 linhas)

Painel direito com tabs por arquivo:

- `FILE_ORDER = ['SOUL.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'MEMORY.md', 'STYLE.md', 'HEARTBEAT.md']`
- `sortedFiles` filtra os files presentes mantendo ordem deterministica
- Header mostra:
  - Badge `"N changed"` (emerald) ou `"nothing yet"` (white/6)
  - Diff summary: `"{opsCount} op(s) · {filesTouched.join(', ')}"` com `title` para hover
- Tabs:
  - Inicial = primeiro arquivo com `changed=true`, fallback = `sortedFiles[0]?.name ?? 'USER.md'`
  - TabTrigger com bolinha verde 1.5x1.5 em changed, font-mono, `aria-label={'Preview of ' + name}`
- TabContent:
  - Changed: usa `DiffHighlight`
  - Unchanged: `<pre>` com `currentContent || '({name} empty)'`

### 4. `components/onboarding/InterviewerChat.tsx` (218 linhas)

Painel esquerdo com chat bubbles + input:

- Props: `messages[], status, currentQuestion, currentRationale, inFlight, onSend, error?, onRetry?`
- Helpers locais (nao exportados): `Bubble` (interviewer/user com variantes accent/thinking) e `StatusPill` (6 status em pt-BR)
- `canSend = status === 'asking' && !inFlight && draft.trim().length > 0`
- `disabledInput = status in {done, aborted, error}`
- Keyboard: `Enter` envia (nao se `shiftKey`), Esc fecha dialogs (inherited from shadcn Dialog)
- Auto-scroll pro fundo em `messages.length` change
- Auto-focus textarea quando status vira `asking`
- Error banner com `role='alert'` + Retry button red-300
- Placeholder: "Digite sua resposta. Enter envia, Shift+Enter quebra linha."
- Bubbles:
  - User: `self-end bg-accent/20`
  - Interviewer (normal): `self-start bg-night-panel/60 text-text-secondary`
  - Interviewer (accent, para currentQuestion): `self-start border-violet/40 bg-violet/10`
  - Interviewer (thinking): `<Loader2 class='animate-spin' />` + "Pensando..."
- StatusPill cores: pending=text-secondary, asking=emerald, thinking=violet pulse, done=accent, aborted/error=red-300

### 5. `components/onboarding/ActionsBar.tsx` (131 linhas)

Barra inferior com Pausar / Pular / Aprovar:

- `canApprove = status === 'done' && !inFlight`
- `canSkip = status !== 'error' && !inFlight`
- Dialog unico com state `confirm: null | 'skip' | 'approve'`:
  - Skip dialog: "O template do arquetipo sera usado como esta" + menciona `forgeclaw refine` (fase 28)
  - Approve dialog: "As mudancas serao escritas em `~/.forgeclaw/harness/`"
- Pausar: ghost, icone PauseCircle, disabled while inFlight, calls `onPause` callback
- Pular: ghost, SkipForward, abre confirm dialog
- Aprovar: emerald solid, CheckCircle2 (ou Loader2 spin em inFlight), abre confirm dialog

### 6. `components/onboarding/OnboardingLayout.tsx` (58 linhas)

Container responsivo:

- `isDesktop` via `window.matchMedia('(min-width: 768px)')` dentro de useEffect
- Desktop: `<div class='flex h-full flex-col'><div class='grid grid-cols-[minmax(320px,1fr)_1.2fr]'>{chat}{preview}</div>{actions}</div>`
- Mobile: `<Tabs defaultValue='chat'>` com 2 trigger (Chat / Preview) + actions no fundo
- matchMedia listener cleanup no useEffect return

### 7. `components/onboarding/OnboardingApp.tsx` (88 linhas)

Container root client que conecta o hook com os 3 paineis:

- `useOnboarding({ autoStart: true })`
- 3 estados centralizados:
  - `idle | loading sem snapshot`: `<p>Carregando onboarding...</p>`
  - `error sem snapshot`: red text + button "Tentar novamente"
  - `!snapshot`: `<p>Snapshot indisponivel.</p>`
  - else: `<OnboardingLayout>` com os 3 paineis
- `handlePause` = `window.close()` + `alert(...)` fallback pra browser que bloqueia

### 8. `app/onboarding/page.tsx` (15 linhas, reescrito)

Substitui placeholder da 27-01:

- Continua SSR component
- `readOnboardedMeta()` defensivamente (belt-and-suspenders vs proxy gate)
- Se onboarded: `<p>Already onboarded at {meta.at}. Redirecting...</p>`
- Else: `<OnboardingApp />`

## Runtime Verification

### Typecheck (`bun tsc --noEmit` em `packages/dashboard`)

**Zero erros novos nos 7 arquivos criados + 1 modificado:**

```
hooks/use-onboarding.ts                            — 0 errors
components/onboarding/DiffHighlight.tsx            — 0 errors
components/onboarding/HarnessPreview.tsx           — 0 errors
components/onboarding/InterviewerChat.tsx          — 0 errors
components/onboarding/ActionsBar.tsx               — 0 errors
components/onboarding/OnboardingLayout.tsx         — 0 errors
components/onboarding/OnboardingApp.tsx            — 0 errors
app/onboarding/page.tsx                            — 0 errors
```

**4 erros pre-existentes** (documentados em 27-01/27-02 e STATE.md):

- `core/src/index.ts:11` MemoryManager re-export ambiguity (Fase 22)
- `lib/core.ts:41-42` x3 `vaultDailyLogPath` missing em `ForgeClawConfig` (Fase 23-02)

### Build smoke (`bun run build`)

```
✓ Compiled successfully in 3.0s
  Running TypeScript ...
Failed to type check.
../core/src/index.ts:11:1 Type error: Module './memory-manager' has already exported...
```

**Compilacao passou** (Turbopack bundling OK — todos componentes empacotados, chunk `packages_dashboard_src_app_onboarding_page_tsx_0n24358._.js` gerado). Typecheck falha nos mesmos 4 erros pre-existentes — criterio do plano: `Compiled successfully` OU ausencia de `Failed to compile` → satisfeito.

### E2E HTTP probe

Dev server ja rodando em `localhost:4040`. Sequencia (sentinel temporariamente removido para reproduzir fluxo de onboarding real):

| Request | Expected | Actual |
|---------|----------|--------|
| `GET /api/onboarding/health` (publico) | 200 JSON | 200 com campos onboarded=true, harnessDirExists=true, interviewerReady=false (bun:sqlite in turbopack — pre-existente) |
| `GET /onboarding` (sem cookie) | 307 -> /login | 307 (gate 3 de auth cookie funcionando) |
| `GET /onboarding` (cookie fc-token, sentinel removido) | 200 renderiza OnboardingApp | 200 com: `<title>ForgeClaw Onboarding</title>`, SSR mostra "Carregando onboarding...", bundle client tem chunk `OnboardingApp.tsx`, `page_tsx`, hydration pega dai |

Sentinel restaurado (JSON com source=interview, archetype=solo-builder, at preservado) imediatamente apos probe — repositorio igual ao estado pre-teste.

### Audit CI

```
AUDIT PASS — 0 critical findings in distributed code.
```

Zero findings de contexto pessoal nos 7 arquivos novos + page.tsx.

## Commits

| Hash | Tarefa | Mensagem |
|------|--------|----------|
| `fb41e76` | 1 | feat(27-03): add useOnboarding hook (client state + API calls) |
| `11cc1fc` | 2 | feat(27-03): add DiffHighlight component (LCS line-by-line diff) |
| `76331c5` | 3 | feat(27-03): add HarnessPreview (7 file tabs with DiffHighlight) |
| `948845f` | 4 | feat(27-03): add InterviewerChat (bubbles + thinking + textarea) |
| `93f99ce` | 5 | feat(27-03): add ActionsBar (Pausar / Pular / Aprovar + dialogs) |
| `a7865e7` | 6 | feat(27-03): add OnboardingLayout (responsive split/tabs) |
| `fa87ce5` | 7 | feat(27-03): wire OnboardingApp container and swap page.tsx to use it |

Task 8 e validation-only (typecheck + build + audit) — sem commit dedicado.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Zero auto-correcoes necessarias.

### Auth Gates

Nenhum.

### Out-of-scope (Deferred)

Nenhuma acao nova — apenas registro:

- 4 erros de typecheck pre-existentes (MemoryManager Fase 22 + vaultDailyLogPath x3 Fase 23-02) continuam inalterados. Zero regressoes introduzidas.
- `interviewerReady: false` no /api/onboarding/health persiste em dev server (bun:sqlite nao resolve em turbopack). Ja documentado em 27-01. Nao impede renderizacao da UI — o hook dispara `/start` e, quando turbopack nao consegue carregar o core, o server devolve 500 `INTERVIEWER_FAILED` e a UI mostra error banner com Retry. Producao via webpack deve resolver.
- Pause de verdade (persistir sessao em disco e retomar apos restart do server) e escopo de 27-04. Por ora `handlePause` fecha a tab; proxima visita reabre com store singleton HMR-safe preservando a entrevista ativa no processo.

## Criterios de Sucesso

- [x] `packages/dashboard/src/hooks/use-onboarding.ts` expoe snapshot + actions (start, sendMessage, approve, skip, refresh)
- [x] Hook bootstrap no mount (refresh; cai pra start se NO_SESSION); trata ALREADY_DONE redirecionando pra /
- [x] `DiffHighlight.tsx` calcula LCS e renderiza linhas +/- com cores emerald/red
- [x] `HarnessPreview.tsx` lista 7 arquivos em tabs (SOUL/USER/AGENTS/TOOLS/MEMORY/STYLE/HEARTBEAT), bolinha verde em changed, badge "N changed" no header
- [x] `InterviewerChat.tsx` renderiza mensagens, thinking indicator, currentQuestion accent, input textarea com Enter/Shift+Enter, StatusPill
- [x] `ActionsBar.tsx` expoe Pausar/Pular/Aprovar com dialogs de confirmacao; Aprovar so enabled em status=done
- [x] `OnboardingLayout.tsx` muda entre split (>=768px) e tabs (mobile) via matchMedia
- [x] `OnboardingApp.tsx` monta tudo + loading/error states centralizados
- [x] `page.tsx` atualizado pra renderizar <OnboardingApp />
- [x] Typecheck do dashboard sem novos erros cross-file (4 pre-existentes continuam)
- [x] Build Turbopack compila sem erros de bundling
- [x] Audit CI PASS

## Self-Check: PASSOU

- `packages/dashboard/src/hooks/use-onboarding.ts` — ENCONTRADO (216 linhas, useOnboarding export + sendMessage + approve + skip + autoStart + NO_SESSION + ALREADY_DONE + credentials verificados)
- `packages/dashboard/src/components/onboarding/DiffHighlight.tsx` — ENCONTRADO (116 linhas, computeDiff + LCS + added/removed/unchanged)
- `packages/dashboard/src/components/onboarding/HarnessPreview.tsx` — ENCONTRADO (101 linhas, FILE_ORDER + DiffHighlight + changedCount + TabsList)
- `packages/dashboard/src/components/onboarding/InterviewerChat.tsx` — ENCONTRADO (218 linhas, Shift+Enter + Pensando + StatusPill + Bubble + aria-label)
- `packages/dashboard/src/components/onboarding/ActionsBar.tsx` — ENCONTRADO (131 linhas, Pausar + Pular + "Aprovar e salvar" + canApprove + "forgeclaw refine")
- `packages/dashboard/src/components/onboarding/OnboardingLayout.tsx` — ENCONTRADO (58 linhas, matchMedia + grid-cols-[minmax + Tabs + isDesktop)
- `packages/dashboard/src/components/onboarding/OnboardingApp.tsx` — ENCONTRADO (88 linhas, useOnboarding + OnboardingLayout + InterviewerChat + HarnessPreview + ActionsBar)
- `packages/dashboard/src/app/onboarding/page.tsx` — ATUALIZADO (renderiza OnboardingApp)
- Commits `fb41e76`, `11cc1fc`, `76331c5`, `948845f`, `93f99ce`, `a7865e7`, `fa87ce5` — todos presentes em `git log`

## Entrega pra Proximos Planos

**27-04 (wire completo + seguro + testes e2e)** pode consumir:

- UI pronta pra smoke test end-to-end com dashboard + installer real (instanciar Interviewer com mock via env var injection, enviar mensagens via `sendMessage`, aprovar via `approve`, verificar sentinel escrito em `~/.forgeclaw/.onboarded` com `source='interview'`)
- `handlePause` placeholder — 27-04 pode substituir por chamada a novo `POST /api/onboarding/pause` que persiste `InterviewState` em disco, e o hook recuperar via `refresh()` com sessao retomada
- E2E com Playwright / vitest-browser pode testar fluxos:
  - Onboarding completo (start -> 3 messages -> approve -> redirect /)
  - Skip path (start -> skip confirm -> redirect /)
  - Error handling (401 mid-session -> error banner -> retry)
  - Responsive: force mobile viewport, verificar tabs renderizam, nao split
- `DiffHighlight` pode ganhar proptest de equivalencia (randomize old/new, confirmar que applicar diff -> previewContent == newText)

**27-05 (polish + docs)** pode consumir:

- Visual QA do diff highlight com cenarios reais do Interviewer (nao so 'Ana at Acme')
- Copy review das strings (em pt-BR): "Pensando...", "Entrevista finalizada", StatusPill labels, dialogs de confirmacao
- A11y audit com axe-core: contrastes, aria-labels, keyboard-only nav

**28 (refine)** pode reusar quase tudo:

- `OnboardingApp` e agnostica de "primeiro run" vs "refine" — se backend expuser o mesmo `OnboardingSessionSnapshot` shape, UI renderiza identica
- Talvez so um header diferente ("Refine your harness" vs "Welcome to ForgeClaw") — trivial com prop opcional no OnboardingApp
