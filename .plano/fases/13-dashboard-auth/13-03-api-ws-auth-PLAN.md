---
phase: 13-dashboard-auth
plan: 13-03
type: feature
autonomous: true
wave: 2
depends_on: [13-01, 13-02]
requirements: [PKG-B6]
must_haves:
  truths:
    - "Todas as 19 API routes validam token via requireApiAuth()"
    - "API routes retornam 401 JSON quando token invalido"
    - "API routes aceitam auth via Bearer header OU cookie fc-token"
    - "WS server valida token no upgrade request via query param ou header"
    - "WS upgrade sem token retorna 401"
    - "Dashboard UI envia cookie automaticamente em requests"
    - "Dashboard WS connection passa token como query param"
  artifacts:
    - path: "packages/dashboard/src/app/api/*/route.ts"
      provides: "Auth guard em todas as 19 API routes"
    - path: "packages/core/src/ws-server.ts"
      provides: "Token validation no WebSocket upgrade"
    - path: "packages/dashboard/src/hooks/use-websocket.ts"
      provides: "WS hook atualizado com token param (se existir)"
  key_links:
    - from: "app/api/*/route.ts"
      to: "lib/auth.ts"
      via: "import { requireApiAuth }"
    - from: "core/src/ws-server.ts"
      to: "core/src/config.ts"
      via: "import { getConfig } para ler dashboardToken"
---

# Fase 13 Plano 03: API Routes Auth + WebSocket Auth

**Objetivo:** Aplicar autenticacao em todas as 19 API routes do dashboard e no WebSocket server (port 4041). Apos este plano, nenhum endpoint e acessivel sem token valido.

## Contexto

@packages/dashboard/src/lib/auth.ts -- requireApiAuth() helper
@packages/dashboard/src/app/api/config/route.ts -- Exemplo de API route (padrao a seguir)
@packages/core/src/ws-server.ts -- WebSocket server com Bun.serve, precisa auth no upgrade
@packages/core/src/config.ts -- getConfig() para ler dashboardToken no bot process

## Tarefas

<task id="1" type="auto">
<files>
packages/dashboard/src/app/api/config/route.ts
packages/dashboard/src/app/api/sessions/route.ts
packages/dashboard/src/app/api/topics/route.ts
packages/dashboard/src/app/api/topics/[id]/runtime/route.ts
packages/dashboard/src/app/api/crons/route.ts
packages/dashboard/src/app/api/crons/[id]/logs/route.ts
packages/dashboard/src/app/api/harness/route.ts
packages/dashboard/src/app/api/heartbeat/route.ts
packages/dashboard/src/app/api/memory/route.ts
packages/dashboard/src/app/api/memory/entries/route.ts
packages/dashboard/src/app/api/memory/entries/[id]/route.ts
packages/dashboard/src/app/api/memory/entries/[id]/restore/route.ts
packages/dashboard/src/app/api/memory/daily/route.ts
packages/dashboard/src/app/api/memory/retrievals/route.ts
packages/dashboard/src/app/api/memory/audit/route.ts
packages/dashboard/src/app/api/memory/config/route.ts
packages/dashboard/src/app/api/runtimes/route.ts
packages/dashboard/src/app/api/skills/route.ts
packages/dashboard/src/app/api/models/route.ts
</files>
<action>
Adicionar auth guard em TODAS as 19 API route files. O padrao e identico para cada uma:

1. Adicionar import no topo:
```typescript
import { requireApiAuth } from "@/lib/auth";
```

2. Em CADA funcao handler exportada (GET, POST, PUT, DELETE, PATCH), adicionar como PRIMEIRA linha:
```typescript
const auth = await requireApiAuth(request);
if (!auth.ok) return auth.response;
```

ATENCAO: Algumas funcoes GET nao recebem `request` como parametro. Nelas, adicionar o parametro:
- ANTES: `export async function GET() {`
- DEPOIS: `export async function GET(request: Request) {`

Exemplo completo de transformacao (usando config/route.ts como modelo):

ANTES:
```typescript
import * as core from "@/lib/core";
import { mockConfig } from "@/lib/mock-data";

export async function GET() {
  try {
    const config = await core.getConfig();
    // ...
```

DEPOIS:
```typescript
import * as core from "@/lib/core";
import { mockConfig } from "@/lib/mock-data";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const config = await core.getConfig();
    // ...
```

LISTA COMPLETA de arquivos e suas funcoes exportadas que precisam do guard:

1. `api/config/route.ts` -- GET(), PUT(request)
2. `api/sessions/route.ts` -- GET(request)
3. `api/topics/route.ts` -- GET(), PUT(request)
4. `api/topics/[id]/runtime/route.ts` -- PUT(request, ...)
5. `api/crons/route.ts` -- GET(), POST(request), PUT(request), DELETE(request)
6. `api/crons/[id]/logs/route.ts` -- GET(request, ...)
7. `api/harness/route.ts` -- GET(), PUT(request)
8. `api/heartbeat/route.ts` -- GET(), PUT(request)
9. `api/memory/route.ts` -- GET(), PUT(request)
10. `api/memory/entries/route.ts` -- GET(request), POST(request)
11. `api/memory/entries/[id]/route.ts` -- GET(request, ...), PUT(request, ...), DELETE(request, ...)
12. `api/memory/entries/[id]/restore/route.ts` -- POST(request, ...)
13. `api/memory/daily/route.ts` -- GET(request)
14. `api/memory/retrievals/route.ts` -- GET(request)
15. `api/memory/audit/route.ts` -- GET(request)
16. `api/memory/config/route.ts` -- GET(), PUT(request)
17. `api/runtimes/route.ts` -- GET()
18. `api/skills/route.ts` -- GET()
19. `api/models/route.ts` -- GET()

Para funcoes que usam parametros de rota como segundo argumento (ex: `GET(request: Request, { params }: { params: Promise<{ id: string }> })`), o `request` ja esta presente -- so adicionar o auth guard.

NAO modificar /api/auth/login/route.ts e /api/auth/logout/route.ts -- esses sao endpoints de auth e nao devem ter guard.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20 && echo "---" && grep -rL "requireApiAuth" packages/dashboard/src/app/api/*/route.ts packages/dashboard/src/app/api/*/*/route.ts packages/dashboard/src/app/api/*/*/*/route.ts 2>/dev/null | grep -v "auth/"</automated></verify>
<done>Todas as 19 API routes tem auth guard. Nenhum arquivo API (exceto auth/) falta requireApiAuth. Compilacao limpa.</done>
</task>

<task id="2" type="auto">
<files>packages/core/src/ws-server.ts</files>
<action>
Adicionar validacao de token no WebSocket upgrade request. O token e passado como query parameter `token` na URL de conexao WS.

1. No inicio do arquivo, adicionar import:
```typescript
import { getConfig } from './config';
```
(getConfig ja e importado na linha 12 -- verificar e NAO duplicar)

2. Criar funcao helper de validacao de WS token (adicionar ANTES da funcao `startWSServer`):

```typescript
/**
 * Validate the dashboard token from a WS upgrade request.
 * Token can come from:
 *   - query parameter: ws://host:4041/?token=xxx
 *   - Authorization header: Bearer xxx
 * Returns true if valid or if no dashboardToken is configured (auth disabled).
 */
async function validateWsToken(req: Request): Promise<boolean> {
  const config = await getConfig();
  const expected = config.dashboardToken;

  // No token configured = auth disabled (backward compat)
  if (!expected) return true;

  // Try query parameter first
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken && queryToken === expected) return true;

  // Try Authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1] === expected) {
      return true;
    }
  }

  return false;
}
```

3. No `fetch` handler dentro de `Bun.serve` (linha ~317), ANTES da linha `const upgraded = server.upgrade(req, {`, adicionar validacao:

```typescript
// Validate dashboard token before WebSocket upgrade
const wsAuthValid = await validateWsToken(req);
if (!wsAuthValid) {
  return new Response('Unauthorized', { status: 401 });
}
```

4. Tambem validar token nos HTTP endpoints do IPC (`/cron/reload`, `/cron/run-now`). Adicionar ANTES de cada handler:

Para `/cron/reload` (linha ~332):
```typescript
if (url.pathname === '/cron/reload' && req.method === 'POST') {
  // IPC from dashboard -- validate token
  const ipcAuthValid = await validateWsToken(req);
  if (!ipcAuthValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... existing code
}
```

Para `/cron/run-now` (linha ~349):
```typescript
if (url.pathname === '/cron/run-now' && req.method === 'POST') {
  // IPC from dashboard -- validate token
  const ipcAuthValid = await validateWsToken(req);
  if (!ipcAuthValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... existing code
}
```

NOTA: O IPC de /cron/reload e /cron/run-now e chamado pelo dashboard Next.js (outro processo). O dashboard precisa passar o token nesses requests tambem. Isso sera tratado no proximo task.

NOTA 2: O `/health` endpoint NAO deve ter auth -- e usado para health checks e deve permanecer publico.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/core/tsconfig.json 2>&1 | head -20</automated></verify>
<done>WS upgrade requer token valido via query param ou header. IPC endpoints /cron/reload e /cron/run-now tambem validam token. /health permanece publico.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/app/api/crons/route.ts</files>
<action>
Atualizar o helper `notifyCronReload()` e quaisquer chamadas IPC ao bot process para incluir o dashboardToken como Authorization header.

No arquivo `packages/dashboard/src/app/api/crons/route.ts`, localizar a funcao `notifyCronReload()` (linha ~24) e modificar:

ANTES:
```typescript
async function notifyCronReload(): Promise<void> {
  try {
    await fetch(`${BOT_IPC_URL}/cron/reload`, {
      method: "POST",
      signal: AbortSignal.timeout(1000),
    });
  } catch {
```

DEPOIS:
```typescript
async function notifyCronReload(): Promise<void> {
  try {
    // Read token for IPC auth
    const { getDashboardToken } = await import("@/lib/core");
    const token = await getDashboardToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    await fetch(`${BOT_IPC_URL}/cron/reload`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(1000),
    });
  } catch {
```

Procurar OUTROS locais no mesmo arquivo onde `BOT_IPC_URL` e usado (ex: `/cron/run-now`) e aplicar o mesmo padrao de auth header. Grep por `BOT_IPC_URL` ou `127.0.0.1:4041` no arquivo.

Se existirem outros arquivos no dashboard que fazem IPC ao bot (grep por `4041` em packages/dashboard/src/), aplicar o mesmo padrao.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20 && grep -n "4041\|BOT_IPC" packages/dashboard/src/app/api/crons/route.ts</automated></verify>
<done>Todas as chamadas IPC do dashboard ao bot incluem Authorization header com dashboardToken.</done>
</task>

<task id="4" type="auto">
<files>packages/dashboard/src/hooks/use-websocket.ts</files>
<action>
Atualizar o hook de WebSocket do dashboard para incluir o token na conexao.

1. Primeiro, verificar se o hook existe:
```bash
ls packages/dashboard/src/hooks/
```

Se existir `use-websocket.ts` ou similar, modificar a URL de conexao para incluir o token como query param.

O dashboard precisa ler o token do cookie `fc-token` e passa-lo na URL do WebSocket porque WebSocket nao envia cookies automaticamente no upgrade request.

Localizar onde o WebSocket e instanciado (procurar `new WebSocket` no codebase do dashboard). Modificar a URL:

ANTES (exemplo):
```typescript
const ws = new WebSocket("ws://localhost:4041");
```

DEPOIS:
```typescript
// Read token from cookie for WS auth
function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)fc-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const token = getTokenFromCookie();
const wsUrl = new URL("ws://localhost:4041");
if (token) {
  wsUrl.searchParams.set("token", token);
}
const ws = new WebSocket(wsUrl.toString());
```

NOTA: O cookie e httpOnly, entao `document.cookie` NAO vai funcionar. Alternativa: criar um endpoint API no dashboard que retorna o token para o client-side, ou passar o token de outra forma.

ABORDAGEM MELHOR: Como o cookie e httpOnly e nao acessivel via JS, o dashboard deve:
1. Criar um endpoint GET /api/auth/ws-token que retorna o token para uso no WS (validando o cookie server-side)
2. O client chama esse endpoint, pega o token, e usa no WS URL

Criar endpoint auxiliar:

**Arquivo: packages/dashboard/src/app/api/auth/ws-token/route.ts**
```typescript
import { cookies } from "next/headers";
import { validateToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getDashboardToken } from "@/lib/core";

/**
 * Returns the dashboard token for WebSocket authentication.
 * Only accessible to already-authenticated users (cookie validated).
 */
export async function GET() {
  const expected = await getDashboardToken();
  if (!expected) {
    // Auth disabled
    return Response.json({ token: null });
  }

  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (!tokenCookie?.value) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const valid = await validateToken(tokenCookie.value);
    if (!valid) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    // Return the token so the client can use it in WS URL
    return Response.json({ token: tokenCookie.value });
  } catch {
    return Response.json({ error: "Auth check failed" }, { status: 500 });
  }
}
```

Depois, no hook de WebSocket ou no componente que cria a conexao WS, fazer:

```typescript
// Fetch WS token from API (because cookie is httpOnly)
async function getWsToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/ws-token");
    if (!res.ok) return null;
    const data = await res.json() as { token?: string | null };
    return data.token ?? null;
  } catch {
    return null;
  }
}
```

E usar na criacao do WebSocket:
```typescript
const token = await getWsToken();
const wsUrl = new URL("ws://localhost:4041");
if (token) {
  wsUrl.searchParams.set("token", token);
}
const ws = new WebSocket(wsUrl.toString());
```

Localizar TODOS os pontos onde `new WebSocket` e usado no dashboard e aplicar este padrao.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20 && grep -rn "new WebSocket" packages/dashboard/src/ | head -10</automated></verify>
<done>WebSocket connections do dashboard incluem token como query param. Endpoint /api/auth/ws-token fornece token para client-side.</done>
</task>

<task id="5" type="auto">
<files>packages/dashboard/src/components/dashboard-shell.tsx</files>
<action>
Adicionar botao de logout no header do dashboard e logica de redirect quando API retorna 401.

1. Localizar o componente DashboardShell e adicionar um botao de logout no header/navbar. Posicionar no canto direito do header.

```tsx
// Adicionar import
import { useRouter } from "next/navigation";

// Dentro do componente, adicionar funcao de logout:
const router = useRouter();

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  router.push("/login");
  router.refresh();
}
```

Adicionar botao no header (procurar o elemento de header existente):
```tsx
<button
  onClick={handleLogout}
  className="text-xs text-text-muted hover:text-text-body transition-colors px-2 py-1 rounded hover:bg-surface-2"
  title="Logout"
>
  Logout
</button>
```

2. Adicionar interceptor global para respostas 401. Em algum lugar na inicializacao do dashboard (pode ser no DashboardShell useEffect), adicionar deteccao de 401:

```tsx
// Dentro de um useEffect no DashboardShell:
// Override fetch para detectar 401 globalmente
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    // Token invalido ou expirado -- redirecionar para login
    window.location.href = "/login";
  }
  return response;
};

return () => {
  window.fetch = originalFetch;
};
```

ALTERNATIVA mais limpa: Nao fazer fetch override global. Em vez disso, nos hooks que fazem fetch (useSWR, useEffect com fetch), tratar 401 individualmente. Escolher a abordagem que melhor se encaixa na arquitetura existente do componente.

Verificar se o DashboardShell ja e um Client Component ("use client"). Se nao for, verificar se o botao de logout pode ser um componente separado.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>Dashboard tem botao de logout no header. Sessoes 401 redirecionam para /login.</done>
</task>

## Criterios de Sucesso

- [ ] Todas as 19 API routes retornam 401 sem token valido
- [ ] API routes aceitam Bearer header e cookie fc-token
- [ ] WS upgrade rejeita conexoes sem token
- [ ] WS connection do dashboard passa token via query param
- [ ] IPC calls (cron/reload, cron/run-now) incluem auth header
- [ ] Botao de logout existe no dashboard header
- [ ] 401 responses causam redirect para /login
- [ ] Compilacao TypeScript limpa em todos os packages
