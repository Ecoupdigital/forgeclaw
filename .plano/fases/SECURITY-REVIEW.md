---
reviewed: 2026-04-15T18:00:00-03:00
files_reviewed: 18
vulnerabilities: 8
critical: 1
high: 3
medium: 3
low: 1
---

# Security Review -- Fases 11-17

## Resumo
**Score:** 7/10

Postura de seguranca solida para um projeto pessoal single-user. Auth com timing-safe comparison, cookie httpOnly, token generation com randomBytes(32), env file com chmod 0600, SQL parametrizado em toda a codebase, e protecao contra sobrescrita de tokens mascarados sao todos pontos positivos. Os problemas encontrados concentram-se em: path traversal no write de harness files, ausencia de rate limiting no login, comparacao non-constant-time no WebSocket auth, e falta de security headers no Next.js.

## Vulnerabilidades

### SEC-001: Path Traversal em writeHarnessFile -- HIGH
**Categoria:** INJ
**Arquivo:** `packages/dashboard/src/lib/core.ts:1008-1020`
**Descricao:** A funcao `writeHarnessFile(name, content)` usa `path.join(HARNESS_DIR, name)` sem validar o parametro `name`. Um atacante autenticado pode enviar `name: "../../.bashrc"` ou `name: "../../../etc/cron.d/malicious"` para escrever arquivos arbitrarios no filesystem.
**Impacto:** Escrita arbitraria de arquivos no servidor. Potencialmente RCE via overwrite de configs, crontabs, ou scripts.
**Remediacao:**
```ts
export async function writeHarnessFile(
  name: string,
  content: string
): Promise<boolean> {
  try {
    // Sanitize: strip path separators and dotdot sequences
    const safeName = name.replace(/[\/\\]/g, '').replace(/\.\./g, '');
    if (!safeName || !safeName.endsWith('.md')) return false;
    
    await mkdir(HARNESS_DIR, { recursive: true });
    const filePath = join(HARNESS_DIR, safeName);
    
    // Double-check resolved path is within HARNESS_DIR
    const { resolve } = await import('node:path');
    if (!resolve(filePath).startsWith(resolve(HARNESS_DIR))) return false;
    
    await writeFile(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}
```

### SEC-002: WebSocket Token Comparison Sem Timing-Safe -- HIGH
**Categoria:** AUTH
**Arquivo:** `packages/core/src/ws-server.ts:319-328`
**Descricao:** A funcao `validateWsToken()` usa comparacao direta `queryToken === expected` (linha 325) e `parts[1] === expected` (linha 329). Isso e vulneravel a timing attacks, ao contrario da `validateToken()` do dashboard que usa XOR constant-time.
**Impacto:** Atacante na mesma rede pode inferir o token byte-a-byte via timing side-channel. Mitigado pelo bind a 127.0.0.1, mas se exposto via reverse proxy, o risco e real.
**Remediacao:**
```ts
import { timingSafeEqual } from 'node:crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}

// Replace queryToken === expected with safeCompare(queryToken, expected)
```

### SEC-003: Ausencia de Rate Limiting no Login Endpoint -- HIGH
**Categoria:** AUTH
**Arquivo:** `packages/dashboard/src/app/api/auth/login/route.ts`
**Descricao:** O endpoint POST /api/auth/login nao implementa rate limiting. Um atacante pode fazer brute-force do dashboardToken (64 chars hex = 256 bits de entropia, porem sem rate limit o endpoint fica aberto a abuse).
**Impacto:** DoS via flood de requests de login. Com tokens curtos ou previssiveis, brute-force se torna viavel.
**Remediacao:**
```ts
// Implementar rate limiting simples em memoria
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_ATTEMPTS;
}
```

### SEC-004: Cookie Auth Token com Max-Age de 30 Dias -- MEDIUM
**Categoria:** AUTH
**Arquivo:** `packages/dashboard/src/lib/auth.ts:8`
**Descricao:** `AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30` (30 dias). O token no cookie e o proprio dashboardToken (segredo estatico), nao um session token derivado. Se o cookie for roubado, ele permanece valido por 30 dias sem possibilidade de revogacao individual.
**Impacto:** Token roubado (XSS, browser extension maliciosa, etc.) da acesso permanente ate rotacao manual do dashboardToken.
**Remediacao:** Considerar gerar session tokens efemeros (JWT com expiracao curta ou tokens opacos com lookup server-side) em vez de armazenar o master token diretamente no cookie. Alternativamente, reduzir Max-Age para 24h-7d.

### SEC-005: Ausencia de Security Headers (CSP, X-Frame-Options, HSTS) -- MEDIUM
**Categoria:** API
**Arquivo:** `packages/dashboard/next.config.ts`
**Descricao:** O Next.js config nao define headers de seguranca. Sem CSP, X-Frame-Options, ou HSTS. O dashboard pode ser embutido em iframes (clickjacking) e scripts inline nao sao restringidos.
**Impacto:** Clickjacking, potencial injecao de scripts em cenarios de XSS refletido.
**Remediacao:**
```ts
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
```

### SEC-006: WS Token Exposto em Query String -- MEDIUM
**Categoria:** DATA
**Arquivo:** `packages/core/src/ws-server.ts:321` e `packages/dashboard/src/app/api/auth/ws-token/route.ts`
**Descricao:** O token de autenticacao do WebSocket e passado via query parameter (`ws://host:4041/?token=xxx`). Query strings sao logadas em access logs, proxy logs, e podem aparecer em Referer headers.
**Impacto:** Token pode vazar para logs de infraestrutura (nginx, reverse proxies, monitoring).
**Remediacao:** Preferir enviar o token no primeiro frame WebSocket apos o upgrade (protocolo "auth" message), ou usar um token efemero de curta duracao (nonce) em vez do master token. O endpoint `/api/auth/ws-token` ja existe e poderia retornar um nonce one-time em vez do token real.

### SEC-007: writeConfig Aceita Qualquer Campo sem Validacao -- LOW
**Categoria:** API
**Arquivo:** `packages/dashboard/src/app/api/config/route.ts:28`
**Descricao:** O PUT /api/config aceita `body as Record<string, unknown>` e repassa diretamente para `writeConfig()` sem validacao de schema. Um atacante autenticado pode injetar campos arbitrarios no config JSON (ex: `allowedUsers: [atacanteId]`).
**Impacto:** Baixo porque requer autenticacao, mas permite escalar privilegios adicionando novos allowedUsers no config do bot, ou alterar workingDir para diretorio sensivel.
**Remediacao:**
```ts
// Usar Zod para validar os campos permitidos antes de escrever
const ConfigUpdateSchema = z.object({
  workingDir: z.string().optional(),
  vaultPath: z.string().nullable().optional(),
  voiceProvider: z.enum(['groq', 'openai', 'none']).optional(),
  // ... campos editaveis pelo dashboard
  // EXCLUIR: botToken, dashboardToken, allowedUsers
}).strict();
```

### SEC-008: Token Estatico sem Rotacao -- CRITICAL
**Categoria:** AUTH
**Arquivo:** `packages/cli/src/commands/install.ts:257` e `packages/dashboard/src/lib/auth.ts`
**Descricao:** O `dashboardToken` e gerado uma vez durante `forgeclaw install` e nunca muda. Ele e usado diretamente como credencial (nao ha sessoes, nao ha refresh tokens). O mesmo token autentica: (1) cookie HTTP do dashboard, (2) Bearer header das API routes, (3) WebSocket upgrade, (4) IPC entre dashboard e bot. Se comprometido, nao ha mecanismo de rotacao sem editar manualmente o config ou re-executar install.
**Impacto:** Comprometimento do token = acesso total permanente ao dashboard, execucao de comandos via Claude, leitura/escrita de memorias, controle de cron jobs. Nao ha como invalidar sessoes existentes.
**Remediacao:** Implementar um comando `forgeclaw rotate-token` que gere novo token e invalide o anterior. Considerar introduzir session tokens efemeros para o dashboard (o master token autentica, mas o cookie recebe um session ID com expiracao).

## Checklist

### Authentication & Session (AUTH)
- [ ] Login brute-force protegido (rate limiting) -- **FALTANDO** (SEC-003)
- [x] Token gerado com entropia adequada (randomBytes(32) = 256 bits)
- [ ] Token com rotacao -- **FALTANDO** (SEC-008)
- [x] Cookie httpOnly -- implementado
- [x] Cookie SameSite=Lax -- implementado
- [x] Cookie Secure em producao -- implementado
- [x] Timing-safe comparison no dashboard -- implementado
- [ ] Timing-safe comparison no WebSocket -- **FALTANDO** (SEC-002)
- [ ] Session tokens efemeros -- **FALTANDO** (SEC-004)

### Authorization (AUTHZ)
- [x] Todas API routes protegidas com requireApiAuth()
- [x] WebSocket upgrade protegido com validateWsToken()
- [x] IPC endpoints (/cron/reload, /cron/run-now) protegidos
- [x] Telegram bot com allowedUsers whitelist
- [x] Proxy redireciona para /login sem cookie

### Injection (INJ)
- [x] SQL parametrizado em toda a codebase (better-sqlite3 + prepared statements)
- [x] FTS5 search sanitizado com sanitizeFtsQuery() -- remove caracteres especiais, tokeniza, wrap em aspas
- [x] XSS: React auto-escapa, nenhum uso de dangerouslySetInnerHTML/innerHTML/eval
- [ ] Path traversal em writeHarnessFile -- **VULNERAVEL** (SEC-001)
- [x] Daily log readDailyLog() valida formato de data com regex antes de join

### Data Exposure (DATA)
- [x] .env no .gitignore
- [x] API keys em env file separado (nao no config JSON)
- [x] Env file com chmod 0600
- [x] Config file com chmod 0600
- [x] Tokens mascarados na resposta do GET /api/config
- [x] Protecao contra write-back de tokens mascarados em writeConfig()
- [x] Nenhum NEXT_PUBLIC_ expondo secrets client-side
- [ ] Token em WS query string pode vazar em logs -- **RISCO** (SEC-006)
- [x] Stack traces nao expostos (try/catch com mensagens genericas)

### API Security (API)
- [x] WS server bind a 127.0.0.1 (nao exposto publicamente)
- [x] CORS nao configurado (N/A -- sem origin cruzada explicitada)
- [x] Input validation com Zod em cron endpoints
- [ ] Input validation ausente em config PUT -- **FALTANDO** (SEC-007)
- [ ] Security headers (CSP, X-Frame-Options) -- **FALTANDO** (SEC-005)
- [x] Cron job validation (schedule syntax, topic existence)

### Dependencies (DEPS)
- [x] Lock file presente (bun.lockb)
- [x] Nenhum uso de eval/innerHTML/dangerouslySetInnerHTML detectado

### Pontos Positivos
1. Todas as 14+ API routes usam requireApiAuth() consistentemente
2. SQL 100% parametrizado, incluindo FTS5 com sanitizacao propria
3. Separacao clara: tokens em env file (chmod 600), nao no config JSON
4. writeConfig() tem protecao anti-masking (nao sobrescreve tokens com "***hidden***")
5. WebSocket server escuta apenas em 127.0.0.1
6. Telegram bot com whitelist de userId
7. Chat rendering em React sem dangerouslySetInnerHTML
