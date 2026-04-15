---
phase: 13-dashboard-auth
plan: 13-02
type: feature
autonomous: true
wave: 1
depends_on: [13-01]
requirements: [PKG-B6]
must_haves:
  truths:
    - "Pagina /login exibe form com input de token e botao de submit"
    - "Submit com token correto seta cookie fc-token e redireciona para /"
    - "Submit com token incorreto exibe erro"
    - "Proxy redireciona para /login quando cookie ausente/invalido"
    - "Proxy permite acesso a /login sem cookie"
    - "Proxy permite acesso a /api/* sem intervencao (APIs validam separadamente)"
    - "Proxy permite acesso a _next/static e _next/image"
  artifacts:
    - path: "packages/dashboard/src/app/login/page.tsx"
      provides: "Login page component"
    - path: "packages/dashboard/src/app/api/auth/login/route.ts"
      provides: "POST endpoint que valida token e seta cookie"
    - path: "packages/dashboard/src/proxy.ts"
      provides: "Next.js 16 proxy (ex-middleware) que valida cookie"
  key_links:
    - from: "login/page.tsx"
      to: "api/auth/login/route.ts"
      via: "fetch POST com token no body"
    - from: "proxy.ts"
      to: "lib/auth.ts"
      via: "import validateToken, AUTH_COOKIE_NAME"
    - from: "api/auth/login/route.ts"
      to: "lib/auth.ts"
      via: "import validateToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE"
---

# Fase 13 Plano 02: Login Page + Proxy (Auth Gate)

**Objetivo:** Criar a pagina de login, o endpoint de autenticacao, e o proxy (ex-middleware do Next.js 16) que protege todas as rotas de pagina. Apos este plano, visitantes sem token sao redirecionados para /login.

## Contexto

@packages/dashboard/src/lib/auth.ts -- Helpers de auth do plano 13-01
@packages/dashboard/src/app/layout.tsx -- Layout root, referencia de estilos/fontes
@packages/dashboard/src/app/globals.css -- CSS global com Tailwind 4
@packages/dashboard/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md -- CRITICO: Next.js 16 usa proxy.ts, NAO middleware.ts. Funcao exportada como `proxy`, nao `middleware`.

## Tarefas

<task id="1" type="auto">
<files>packages/dashboard/src/app/api/auth/login/route.ts</files>
<action>
Criar API route POST que recebe token, valida, e retorna cookie.

```typescript
import { validateToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth";
import { getDashboardToken } from "@/lib/core";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const token = body?.token;

    if (!token || typeof token !== "string") {
      return Response.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Check if auth is even configured
    const expected = await getDashboardToken();
    if (!expected) {
      return Response.json(
        { error: "Dashboard authentication is not configured. Run 'forgeclaw install' to set up." },
        { status: 500 }
      );
    }

    const valid = await validateToken(token);
    if (!valid) {
      return Response.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Set httpOnly cookie with the token
    const response = Response.json({ ok: true });

    // Build Set-Cookie header manually for maximum control
    const cookieParts = [
      `${AUTH_COOKIE_NAME}=${token}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${AUTH_COOKIE_MAX_AGE}`,
    ];

    // Only add Secure flag in production (not localhost dev)
    if (process.env.NODE_ENV === "production") {
      cookieParts.push("Secure");
    }

    response.headers.set("Set-Cookie", cookieParts.join("; "));
    return response;
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
```

NOTA: Usar SameSite=Lax (nao Strict) para que o cookie funcione em navegacao normal. HttpOnly impede acesso via JavaScript. Secure somente em production (localhost nao precisa).
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>POST /api/auth/login aceita { token: string }, valida contra config, retorna cookie httpOnly fc-token em caso de sucesso, 401 em caso de falha.</done>
</task>

<task id="2" type="auto">
<files>packages/dashboard/src/app/api/auth/logout/route.ts</files>
<action>
Criar API route POST que limpa o cookie de autenticacao.

```typescript
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = Response.json({ ok: true });

  // Clear the auth cookie by setting Max-Age=0
  const cookieParts = [
    `${AUTH_COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=0`,
  ];

  response.headers.set("Set-Cookie", cookieParts.join("; "));
  return response;
}
```
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>POST /api/auth/logout limpa cookie fc-token setando Max-Age=0.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/app/login/page.tsx</files>
<action>
Criar pagina de login como Client Component. Design minimalista seguindo a estetica dark do dashboard (bg-void, text-text-body).

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json() as { ok?: boolean; error?: string };

      if (res.ok && data.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error ?? "Authentication failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-heading">
            ForgeClaw
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Enter your dashboard token to continue
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-text-body mb-1.5">
              Dashboard Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here"
              autoFocus
              autoComplete="off"
              required
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-text-body placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Authenticating..." : "Enter Dashboard"}
          </button>
        </form>

        {/* Help text */}
        <p className="text-center text-xs text-text-muted">
          Your token was shown during{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">
            forgeclaw install
          </code>
          . Check your config at{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">
            ~/.forgeclaw/forgeclaw.config.json
          </code>
        </p>
      </div>
    </div>
  );
}
```

CSS classes usadas: `bg-void`, `text-text-heading`, `text-text-body`, `text-text-muted`, `border-border`, `bg-surface-1`, `bg-surface-2`, `bg-accent`, `text-accent` -- todos ja definidos no globals.css do dashboard.

Se `text-text-heading` nao existir, usar `text-zinc-100`. Se `bg-accent` nao existir, usar `bg-blue-600`.

NOTA: Usar `useRouter` de `next/navigation` (nao `next/router`). Chamar `router.refresh()` apos redirect para forcar re-validacao do proxy.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>Pagina /login renderiza form com input de token, chama POST /api/auth/login, redireciona para / em caso de sucesso, exibe erro em caso de falha.</done>
</task>

<task id="4" type="auto">
<files>packages/dashboard/src/proxy.ts</files>
<action>
Criar proxy.ts na raiz do diretorio `src/` (Next.js 16 procura em src/ quando srcDir e src).

CRITICO: Next.js 16 renomeou middleware.ts para proxy.ts. A funcao exportada DEVE ser `proxy`, NAO `middleware`. Consultar `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Cookie name must match lib/auth.ts AUTH_COOKIE_NAME */
const AUTH_COOKIE = "fc-token";

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Runs before every matched route. Redirects to /login if auth cookie is missing.
 *
 * Auth for API routes is NOT handled here -- each API route uses requireApiAuth()
 * from lib/auth.ts instead, because the proxy cannot do async config reads
 * reliably and API routes need to return JSON 401 (not redirect).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API without cookie
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Allow all API routes (they validate auth themselves via requireApiAuth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get(AUTH_COOKIE);
  if (!token?.value) {
    // Redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie exists -- allow through.
  // Token validity is verified at the API layer. The proxy only checks
  // presence to avoid expensive async config reads on every page load.
  // If the token is invalid, API calls will fail with 401 and the UI
  // will redirect to login.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser icon)
     * - public files with extensions (.png, .svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$).*)",
  ],
};
```

NOTAS de design:
- O proxy so checa PRESENCA do cookie, nao validade. Isso porque o proxy roda no edge/node pre-render e fazer `readFile` do config seria lento/fragil. A validacao real acontece nos API routes via `requireApiAuth()`.
- Se o cookie existe mas e invalido, os API routes retornam 401 e o frontend deve redirecionar para /login.
- API routes sao excluidas do proxy para evitar redirect HTML em respostas JSON.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>proxy.ts redireciona para /login quando cookie fc-token ausente. Permite /login, /api/*, e static assets sem cookie.</done>
</task>

<task id="5" type="auto">
<files>packages/dashboard/src/app/login/layout.tsx</files>
<action>
Criar layout minimo para a pagina de login que NAO inclui o DashboardShell (sidebar, tabs, etc). A pagina de login deve ser standalone.

```tsx
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

Este layout e necessario para que o login page nao herde nenhum layout especial. Como o root layout (app/layout.tsx) ja aplica fonte, bg-void e body styling, este layout so precisa fazer pass-through.

Se o app/layout.tsx tiver algum provider (context, theme) que precise estar disponivel na login page, este layout deve preservar isso. Verificar app/layout.tsx antes de implementar -- atualmente ele nao tem providers, entao o pass-through e suficiente.
</action>
<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 | head -20</automated></verify>
<done>Login page tem layout standalone que nao carrega DashboardShell.</done>
</task>

## Criterios de Sucesso

- [ ] POST /api/auth/login valida token e seta cookie httpOnly
- [ ] POST /api/auth/logout limpa cookie
- [ ] Pagina /login renderiza form com input de token
- [ ] Login bem-sucedido redireciona para /
- [ ] Login falho mostra mensagem de erro
- [ ] proxy.ts redireciona para /login quando cookie ausente
- [ ] proxy.ts permite /login, /api/*, e static assets
- [ ] Compilacao TypeScript limpa
