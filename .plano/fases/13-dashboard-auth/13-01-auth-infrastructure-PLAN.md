---
phase: 13-dashboard-auth
plan: 13-01
type: feature
autonomous: true
wave: 0
depends_on: []
requirements: [PKG-B6]
must_haves:
  truths:
    - "ForgeClawConfig type includes dashboardToken field"
    - "Config validator accepts and preserves dashboardToken"
    - "Installer generates a 32-byte hex token and saves it to config"
    - "Token is displayed to user at end of install"
    - "Dashboard lib/core.ts can read dashboardToken from config (unmasked for server-side auth)"
    - "Auth helper function validates Bearer token from API request headers"
    - "Auth helper function validates fc-token cookie from page requests"
  artifacts:
    - path: "packages/core/src/types.ts"
      provides: "dashboardToken field on ForgeClawConfig"
    - path: "packages/core/src/config.ts"
      provides: "dashboardToken preserved through validateConfig"
    - path: "packages/cli/src/commands/install.ts"
      provides: "Token generation during install"
    - path: "packages/dashboard/src/lib/auth.ts"
      provides: "requireAuth() and validateToken() helpers"
    - path: "packages/dashboard/src/lib/core.ts"
      provides: "getDashboardToken() function for server-side auth"
  key_links:
    - from: "packages/cli/src/commands/install.ts"
      to: "packages/core/src/types.ts"
      via: "writes dashboardToken to forgeclaw.config.json matching ForgeClawConfig shape"
    - from: "packages/dashboard/src/lib/auth.ts"
      to: "packages/dashboard/src/lib/core.ts"
      via: "reads token via getDashboardToken()"
---

# Fase 13 Plano 01: Auth Infrastructure (Types + Token Gen + Auth Helpers)

**Objetivo:** Estabelecer toda a infraestrutura de autenticacao: campo dashboardToken no tipo e validacao de config, geracao de token no installer, e funcoes helper de auth que serao usadas pelo proxy e API routes.

## Contexto

@packages/core/src/types.ts -- ForgeClawConfig interface, precisa campo dashboardToken
@packages/core/src/config.ts -- validateConfig(), precisa preservar dashboardToken
@packages/cli/src/commands/install.ts -- Installer, precisa gerar token
@packages/dashboard/src/lib/core.ts -- Leitura de config no dashboard, precisa getDashboardToken()
@packages/dashboard/src/lib/types.ts -- Dashboard-side types (ForgeClawConfig mirror)

## Tarefas

<task id="1" type="auto">
<files>packages/core/src/types.ts</files>
<action>
Adicionar campo `dashboardToken` na interface `ForgeClawConfig`. O campo e opcional para backward compatibility com configs existentes que nao tem token.

Localizar a interface `ForgeClawConfig` (atualmente linha ~12) e adicionar APOS o campo `memoryAutoApproveThreshold`:

```typescript
/** Random token for dashboard authentication. Generated during install. */
dashboardToken?: string;
```

NAO alterar nenhum outro campo da interface.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/core/tsconfig.json 2>&1 | head -20</automated></verify>
<done>ForgeClawConfig tem campo `dashboardToken?: string` e o projeto compila sem erros.</done>
</task>

<task id="2" type="auto">
<files>packages/core/src/config.ts</files>
<action>
Modificar a funcao `validateConfig()` para preservar o campo `dashboardToken` quando presente no JSON.

Na funcao `validateConfig` (linha ~12), no objeto de retorno (linha ~36), adicionar o campo `dashboardToken`:

```typescript
dashboardToken: typeof obj.dashboardToken === 'string' ? obj.dashboardToken : undefined,
```

Adicionar esta linha APOS a linha do `memoryAutoApproveThreshold`. O campo e opcional, entao configs existentes sem ele continuam funcionando (retorna `undefined`).

NAO adicionar validacao complexa -- o token e uma string opaca. Se presente, preservar; se ausente, `undefined`.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/core/tsconfig.json 2>&1 | head -20</automated></verify>
<done>validateConfig() retorna dashboardToken quando presente no JSON e undefined quando ausente. Compilacao limpa.</done>
</task>

<task id="3" type="auto">
<files>packages/cli/src/commands/install.ts</files>
<action>
Gerar um token aleatorio de 32 bytes (hex) durante o install e salva-lo no config. O token sera exibido ao usuario no final do install.

1. Adicionar import no topo do arquivo:
```typescript
import { randomBytes } from 'node:crypto'
```

2. Na funcao `install()`, APOS a construcao do objeto `config` (linha ~246, onde `const config = { botToken, ... }`), adicionar o campo `dashboardToken`:

```typescript
const config = {
  botToken,
  allowedUsers: [Number(userId)],
  workingDir,
  vaultPath,
  voiceProvider,
  userName,
  company,
  role,
  dashboardToken: (existingConfig.dashboardToken as string) ?? randomBytes(32).toString('hex'),
}
```

Logica: se config existente ja tem token (modo update), preservar. Se nao, gerar novo.

3. No bloco `outro()` no final do install (linha ~381), adicionar o token na mensagem de saida. Modificar o template string para incluir:

```typescript
outro(`ForgeClaw is ready!

  Open Telegram and send /start to your bot
  Dashboard: http://localhost:4040
  Dashboard Token: ${config.dashboardToken}
  Status: forgeclaw status
  Logs: forgeclaw logs

  API keys stored in: ~/.forgeclaw/.env
  Config: ~/.forgeclaw/forgeclaw.config.json
  
  IMPORTANT: Save the Dashboard Token above. You'll need it to access the dashboard.`)
```
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli/tsconfig.json 2>&1 | head -20</automated></verify>
<done>Installer gera dashboardToken de 64 caracteres hex (32 bytes), preserva token existente em modo update, e exibe token ao usuario no final.</done>
</task>

<task id="4" type="auto">
<files>packages/dashboard/src/lib/types.ts</files>
<action>
Adicionar campo `dashboardToken` na interface `ForgeClawConfig` do dashboard. O dashboard tem sua propria copia da interface em `lib/types.ts`.

Localizar a interface `ForgeClawConfig` no arquivo e adicionar:

```typescript
dashboardToken?: string;
```

Importante: Verificar se a interface existe neste arquivo. Se nao existir como interface separada, procurar onde o tipo ForgeClawConfig e definido no dashboard side e adicionar la.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>Dashboard-side ForgeClawConfig type inclui dashboardToken opcional.</done>
</task>

<task id="5" type="auto">
<files>packages/dashboard/src/lib/core.ts</files>
<action>
Adicionar funcao `getDashboardToken()` que le o token do config SEM mascarar. A funcao `getConfig()` existente mascara o botToken -- o dashboardToken precisa ser lido sem mascara para comparacao server-side.

Adicionar a seguinte funcao ANTES da funcao `writeConfig()` (em torno da linha 842):

```typescript
/**
 * Read the dashboard token from config WITHOUT masking.
 * Used server-side only (proxy, API auth) to validate incoming tokens.
 * Returns null if config doesn't exist or has no dashboardToken.
 */
export async function getDashboardToken(): Promise<string | null> {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.dashboardToken === "string" && parsed.dashboardToken.length > 0) {
      return parsed.dashboardToken;
    }
    return null;
  } catch {
    return null;
  }
}
```

TAMBEM: Na funcao `getConfig()` existente (linha ~827), adicionar mascaramento do dashboardToken similar ao botToken. Apos a linha que mascara botToken, adicionar:

```typescript
// Mask dashboardToken for dashboard display
if (parsed.dashboardToken) {
  parsed.dashboardToken = parsed.dashboardToken.slice(0, 8) + "***hidden***";
}
```

Isso garante que o token nao vaza na UI do ConfigTab.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>getDashboardToken() retorna token raw para auth server-side. getConfig() mascara dashboardToken para exibicao na UI.</done>
</task>

<task id="6" type="auto">
<files>packages/dashboard/src/lib/auth.ts</files>
<action>
Criar arquivo novo com funcoes helper de autenticacao usadas pelo proxy e API routes.

```typescript
import { cookies } from "next/headers";
import { getDashboardToken } from "./core";

/** Name of the cookie that stores the dashboard auth token. */
export const AUTH_COOKIE_NAME = "fc-token";

/** Max age of the auth cookie in seconds (30 days). */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Validate a token string against the configured dashboardToken.
 * Returns true if tokens match, false otherwise.
 * If no dashboardToken is configured, returns true (auth disabled / dev mode).
 */
export async function validateToken(token: string | null | undefined): Promise<boolean> {
  const expected = await getDashboardToken();
  // If no token configured, auth is disabled (backward compat)
  if (!expected) return true;
  if (!token) return false;
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expected.length) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(token);
  const b = encoder.encode(expected);
  return timingSafeEqual(a, b);
}

/**
 * Constant-time buffer comparison.
 * Uses XOR accumulation -- not crypto.timingSafeEqual because that
 * requires Node.js crypto which may not be available in all Next.js
 * runtimes. This is equivalent for our use case.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Check auth from an API route Request.
 * Checks Authorization header first (Bearer <token>), then fc-token cookie.
 * Returns { ok: true } if authenticated, { ok: false, response: Response } otherwise.
 */
export async function requireApiAuth(
  request: Request
): Promise<{ ok: true } | { ok: false; response: Response }> {
  // Check if auth is configured at all
  const expected = await getDashboardToken();
  if (!expected) return { ok: true }; // No token = auth disabled

  // 1. Try Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      const valid = await validateToken(parts[1]);
      if (valid) return { ok: true };
    }
    return {
      ok: false,
      response: Response.json({ error: "Invalid token" }, { status: 401 }),
    };
  }

  // 2. Try cookie (for requests from the dashboard UI)
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (tokenCookie) {
      const valid = await validateToken(tokenCookie.value);
      if (valid) return { ok: true };
    }
  } catch {
    // cookies() may fail outside request context
  }

  return {
    ok: false,
    response: Response.json({ error: "Authentication required" }, { status: 401 }),
  };
}
```

NOTAS:
- `cookies()` e importado de `next/headers` (funcao async no Next.js 16)
- Timing-safe comparison implementada inline para evitar dependencia de crypto.timingSafeEqual (que pode nao estar disponivel no runtime do proxy)
- Se dashboardToken nao esta configurado, auth e desabilitado (backward compat com installs existentes)
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>auth.ts exporta validateToken(), requireApiAuth(), AUTH_COOKIE_NAME e AUTH_COOKIE_MAX_AGE. Compilacao limpa.</done>
</task>

## Criterios de Sucesso

- [ ] ForgeClawConfig (core) tem campo dashboardToken opcional
- [ ] validateConfig() preserva dashboardToken
- [ ] ForgeClawConfig (dashboard) tem campo dashboardToken opcional
- [ ] Installer gera token de 32 bytes hex e exibe ao usuario
- [ ] getDashboardToken() le token raw do config
- [ ] getConfig() mascara dashboardToken para UI
- [ ] auth.ts tem validateToken() com timing-safe comparison
- [ ] auth.ts tem requireApiAuth() que checa header e cookie
- [ ] Todos os packages compilam sem erros TypeScript
