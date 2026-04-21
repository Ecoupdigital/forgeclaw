---
phase: 27-dashboard-first-run-onboarding
plan: 27-01
subsystem: dashboard
tags: [onboarding, sentinel, proxy, health-endpoint, next16]
requires:
  - "26 (Interviewer + loadInterviewerBase disponiveis no @forgeclaw/core)"
  - "25 (installer consome /api/onboarding/health no handoff)"
provides:
  - "lib/onboarding-state.ts (isOnboarded/markOnboarded/readOnboardedMeta/clearOnboarded/harnessDirExists + constants)"
  - "proxy.ts com gate 4 e 5 (sentinel → /onboarding; onboarded + /onboarding → /)"
  - "/app/onboarding/layout.tsx (SSR guard defensivo)"
  - "/app/onboarding/page.tsx (placeholder — UI real vem em 27-03)"
  - "/app/api/onboarding/health/route.ts (publico, sem auth)"
affects:
  - "packages/dashboard/package.json (adiciona @forgeclaw/core workspace)"
tech-stack:
  added: ["vitest test file para dashboard (primeiro)"]
  patterns:
    - "Sentinel file como first-run gate (inspiracao: git/config locks)"
    - "Atomic write via tmp + renameSync (race-free)"
    - "Dynamic import com try/catch para deps que podem falhar em dev runtime"
    - "vi.mock('node:os') para isolar homedir em testes (vs process.env.HOME que nao funciona)"
key-files:
  created:
    - "packages/dashboard/src/lib/onboarding-state.ts"
    - "packages/dashboard/src/app/onboarding/layout.tsx"
    - "packages/dashboard/src/app/onboarding/page.tsx"
    - "packages/dashboard/src/app/api/onboarding/health/route.ts"
    - "packages/dashboard/tests/onboarding-state.test.ts"
  modified:
    - "packages/dashboard/src/proxy.ts (gates 4 e 5 adicionados)"
    - "packages/dashboard/package.json (@forgeclaw/core workspace dep)"
decisions:
  - "Sentinel como JSON (nao empty file) pra carregar source/archetype/summary/at → reusavel em Fase 27-04 (seguro) e 28 (refine sabe quando re-entrevistar)"
  - "source discriminado como uniao de 3 strings fixas (installer/interview/skipped) — rejeita valores fora da whitelist em readOnboardedMeta"
  - "Proxy faz checagem SYNC (existsSync). Edge runtime do Next.js 16 tolera node:fs em page route, mas mantivemos codigo simples (sem async). Custo: ~1 stat call por request, desprezivel"
  - "Layout onboarding usa isOnboarded() SSR defensivamente — belt-and-suspenders vs proxy bypass em corner cases"
  - "Health endpoint PUBLICO (sem requireApiAuth) — CLI installer polla antes do login. Payload nao expoe segredo (so paths e booleans)"
  - "Dynamic import de @forgeclaw/core com try/catch — bun:sqlite nao resolve em dev server do Next.js (turbopack). Graceful fallback: interviewerReady=false + interviewerError na response"
metrics:
  duration_seconds: 489
  tasks_completed: 6
  tasks_total: 6
  commits: 6
  files_created: 5
  files_modified: 2
  tests_added: 9
  completed_at: "2026-04-21T12:40:08Z"
---

# Fase 27 Plano 01: Sentinel `.onboarded`, Middleware Redirect e Health Endpoint — Summary

## One-liner

First-run gate do dashboard via sentinel `~/.forgeclaw/.onboarded` (write atomico + read sync em proxy.ts), rota `/onboarding` com bidirectional redirect (ausente → force `/onboarding`; presente + em `/onboarding` → volta pra `/`), e endpoint publico `GET /api/onboarding/health` consumido pelo CLI installer — validado end-to-end com 9 testes vitest e 6 probes HTTP reais.

## O que foi construido

### 1. `lib/onboarding-state.ts` (125 linhas)

Modulo utilitario unico que encapsula o protocolo do sentinel:
- **`isOnboarded(): boolean`** — sync `existsSync` (safe em proxy edge runtime).
- **`markOnboarded(meta): OnboardedMeta`** — atomic write via tmp + renameSync. Cria FORGECLAW_DIR se necessario. Injeta `at` (ISO string) e `atEpoch` automaticamente.
- **`readOnboardedMeta(): OnboardedMeta | null`** — le + valida shape (`at` string, `source` whitelist de 3 valores). Retorna null pra sentinel malformado, missing ou com source desconhecido.
- **`clearOnboarded(): void`** — unlinkSync idempotente (fase 28 `forgeclaw refine`).
- **`harnessDirExists(): boolean`** — helper pro health endpoint.
- Constantes: `FORGECLAW_DIR`, `HARNESS_DIR`, `SENTINEL_FILENAME`, `SENTINEL_PATH`.

### 2. `proxy.ts` — Gate 4 e 5

Ordem de gates:
1. Public paths (`/login`, `/api/auth/*`) → `next()`
2. API routes → `next()` (auto-guardam via `requireApiAuth`)
3. Auth cookie ausente → `redirect(/login)`
4. **[NOVO]** Sem sentinel + rota != `/onboarding*` → `redirect(/onboarding)`
5. **[NOVO]** Com sentinel + rota == `/onboarding*` → `redirect(/)`

Matcher preservado identico ao original.

### 3. `app/onboarding/layout.tsx` (32 linhas)

Server component com belt-and-suspenders: `isOnboarded()` SSR antes de renderizar → `redirect("/")` se sentinel existir (defesa contra race com proxy). Container full-viewport sem DashboardShell.

### 4. `app/onboarding/page.tsx` (44 linhas)

Placeholder server component. Verifica `readOnboardedMeta()` defensivamente. Renderiza tela de boas-vindas que o CLI installer pode linkar via `buildOnboardingUrl(/onboarding?token=...)`. Menciona 27-02 (interviewer) como milestone futura.

### 5. `app/api/onboarding/health/route.ts` (40 linhas)

Endpoint publico (sem auth — CLI polla antes do login):

```json
{
  "ok": true,
  "onboarded": true,
  "harnessDirExists": true,
  "interviewerReady": false,
  "interviewerError": "Failed to load external module bun:sqlite: ...",
  "sentinelPath": "/root/.forgeclaw/.onboarded",
  "harnessDir": "/root/.forgeclaw/harness",
  "serverTime": 1776775149185
}
```

Dynamic import de `@forgeclaw/core` com try/catch — retorna `interviewerReady: false + interviewerError` se falhar, nao crasha.

### 6. `tests/onboarding-state.test.ts` (123 linhas, 9 testes vitest)

Isola HOME via `vi.mock('node:os')` (substitui `homedir()` por tmpdir per-teste). Cobre:
- Sentinel ausente → `isOnboarded()=false`, `readOnboardedMeta()=null`.
- Roundtrip `markOnboarded` → `isOnboarded` → `readOnboardedMeta` preservando source/archetype/summary/at.
- Sentinel malformado (JSON invalido) → `readOnboardedMeta()=null`.
- Source desconhecido (`"hacker"`) → `readOnboardedMeta()=null`.
- `clearOnboarded` idempotente (noop quando missing, removal quando present).
- Atomic write: sem `.tmp` residual pos-escrita.
- `markOnboarded` cria `FORGECLAW_DIR` quando missing.
- `markOnboarded` idempotente (overwrite preserva novo source).
- `harnessDirExists` false antes de mkdir, true depois.

## Runtime Verification

Dashboard real iniciado em `http://localhost:4040` com `.next` limpo. Probes HTTP:

| Request | Expected | Actual |
|---------|----------|--------|
| `GET /api/onboarding/health` (no auth) | 200, JSON contrato | ✓ 200 com todos os campos |
| `GET /` (no cookie) | 307 → `/login` (gate 3) | ✓ |
| `GET /onboarding` (no cookie) | 307 → `/login` (gate 3) | ✓ |
| `GET /login` | 200 | ✓ |
| `GET /` (cookie, sentinel presente) | 200 | ✓ |
| `GET /onboarding` (cookie, sentinel presente) | 307 → `/` (gate 5) | ✓ |
| `GET /` (cookie, sentinel removido) | 307 → `/onboarding` (gate 4) | ✓ |
| `GET /onboarding` (cookie, sentinel removido) | 200, renderiza "Welcome to ForgeClaw" | ✓ |

Sentinel real restaurado ao final do teste.

## Commits

| Hash | Tarefa | Mensagem |
|------|--------|----------|
| `417ff13` | 1 | feat(27-01): add onboarding-state helpers (sentinel .onboarded) |
| `3e80db9` | 2 | feat(27-01): add onboarding gates to proxy.ts |
| `91eba2c` | 3 | feat(27-01): add /onboarding route layout (SSR guard) |
| `281573b` | 4 | feat(27-01): add /onboarding placeholder page |
| `7a8c13a` | 5 | feat(27-01): add /api/onboarding/health endpoint + core workspace dep |
| `771ec1c` | 6 | test(27-01): add vitest suite for onboarding-state |

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Blocker] `@forgeclaw/core: workspace:*` faltando no `package.json` do dashboard**
- **Encontrado durante:** Tarefa 5
- **Issue:** O plano assumia que `@forgeclaw/core` ja estava listado nas deps do dashboard via workspace protocol. Inspecao de `packages/dashboard/package.json` mostrou que NAO estava. O import dinamico `await import("@forgeclaw/core")` no health endpoint quebraria em runtime (TS2307 + runtime error).
- **Correcao:** Adicionado `"@forgeclaw/core": "workspace:*"` em `packages/dashboard/package.json` (mesma convencao do `packages/cli`, adicionada em 25-01). `bun install` re-link simbolico sem mudar lockfile.
- **Arquivos modificados:** `packages/dashboard/package.json`
- **Commit:** `7a8c13a` (bundled com route.ts)

**2. [Regra 3 - Blocker] Teste no path errado: vitest config nao inclui `src/**/__tests__`**
- **Encontrado durante:** Tarefa 6
- **Issue:** Plano especificou `packages/dashboard/src/lib/__tests__/onboarding-state.test.ts`, mas `vitest.config.ts` raiz usa `include: ['packages/*/tests/**/*.test.ts']`. Teste naquele path seria invisivel pra `bunx vitest run`.
- **Correcao:** Teste movido para `packages/dashboard/tests/onboarding-state.test.ts` (convencao do repo, igual `packages/core/tests/` e `packages/cli/tests/`).
- **Arquivos modificados:** `packages/dashboard/tests/onboarding-state.test.ts` (criado no path certo desde o inicio)
- **Commit:** `771ec1c`

**3. [Regra 1 - Bug] `process.env.HOME` nao funciona para isolar testes**
- **Encontrado durante:** Tarefa 6 (primeira rodada de testes com 2 falhas)
- **Issue:** Plano sugeria isolar HOME via `process.env.HOME = tmpHome` antes de cada teste. Tentativa inicial falhou: `os.homedir()` em Node e Bun le do passwd entry do sistema, NAO de `process.env.HOME`. Comprovado com `bun -e "process.env.HOME='/tmp/fake'; console.log(require('os').homedir())"` → imprime `/root`.
- **Correcao:** Substituido por `vi.mock('node:os', ...)` que intercepta `homedir()` e retorna `tmpHome` per-teste. Combinado com `vi.resetModules()` no `beforeEach` para re-avaliar `FORGECLAW_DIR = join(homedir(), ...)` a cada import dinamico.
- **Arquivos modificados:** `packages/dashboard/tests/onboarding-state.test.ts` (estrategia de mock reescrita antes do commit final)
- **Commit:** `771ec1c`

### Auth Gates

Nenhum.

### Out-of-scope (Deferred)

Nao acoes tomadas — registrar apenas:
- **Typecheck do dashboard tem 5 erros pre-existentes** (`core/src/index.ts` MemoryManager ambiguity, `lib/core.ts` vaultDailyLogPath x3, `.next/dev/types/validator.ts` LayoutRoutes cache). Zero erros nos 5 arquivos novos desta plano. MemoryManager ambiguity vem de Fase 22 (agentes); `vaultDailyLogPath` vem de Fase 23-02 (config precisa atualizar tipo em `@forgeclaw/core/types`). Cache `.next/types` auto-heala no proximo `next build`.
- **`interviewerReady: false` em dev server** — dynamic import de `@forgeclaw/core` falha porque `bun:sqlite` nao resolve no turbopack do Next.js. Graceful fallback ja registrado no `interviewerError`. Producao com `next build` deve resolver (webpack runtime) OU sera resolvido em 27-02 quando o interviewer for refatorado pra nao depender de bun:sqlite no path de `loadInterviewerBase` (essa funcao so le um .md, nao precisa de DB).

## Criterios de Sucesso

- [x] `onboarding-state.ts` exporta isOnboarded/markOnboarded/readOnboardedMeta/clearOnboarded/harnessDirExists + constantes.
- [x] `markOnboarded` escreve atomicamente (tmp + renameSync) e cria FORGECLAW_DIR.
- [x] `readOnboardedMeta` retorna null em JSON invalido e valida source contra whitelist.
- [x] `proxy.ts` redireciona pra `/onboarding` quando sentinel ausente + usuario fora de `/onboarding`.
- [x] `proxy.ts` redireciona pra `/` quando sentinel presente + usuario em `/onboarding`.
- [x] `app/onboarding/layout.tsx` roda isOnboarded() SSR defensivamente.
- [x] `app/onboarding/page.tsx` retorna 200 com placeholder.
- [x] `app/api/onboarding/health/route.ts` retorna JSON com todos os campos.
- [x] Endpoint publico (sem requireApiAuth) — testado sem cookie → HTTP 200.
- [x] Typecheck do dashboard sem NOVOS erros nos 5 arquivos.
- [x] 9 testes vitest passando em 234ms.
- [x] `bun run audit:personal:ci` PASS.
- [x] E2E HTTP probes em todos os 8 cenarios de gate (verificado com curl).

## Self-Check: PASSOU

- `packages/dashboard/src/lib/onboarding-state.ts` — ENCONTRADO (125 linhas, exports verificados)
- `packages/dashboard/src/proxy.ts` — ATUALIZADO (gates 4 e 5 presentes)
- `packages/dashboard/src/app/onboarding/layout.tsx` — ENCONTRADO
- `packages/dashboard/src/app/onboarding/page.tsx` — ENCONTRADO
- `packages/dashboard/src/app/api/onboarding/health/route.ts` — ENCONTRADO
- `packages/dashboard/tests/onboarding-state.test.ts` — ENCONTRADO (9 testes)
- Commits `417ff13`, `3e80db9`, `91eba2c`, `281573b`, `7a8c13a`, `771ec1c` — todos presentes em `git log`

## Entrega pra Proximos Planos

**27-02 (interview API)** pode consumir:
- `markOnboarded({ source: "interview", archetype, summary })` ao aplicar HarnessDiff com sucesso.
- `clearOnboarded()` pra re-abrir entrevista se usuario pedir undo.

**27-03 (split-pane UI)** substitui `page.tsx` atual por `<OnboardingApp />` client component. Layout atual ja da full-viewport.

**25-03 (installer handoff)** ja consome `/api/onboarding/health` — CLI polla ate `ok: true`. Pos-27-01, tambem pode ler `interviewerReady` pra decidir se abre `/onboarding` (ready) ou cai em fallback estatico (not ready → ir direto pro `/`).
