"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * /refine/bootstrap
 *
 * Auto-login entry point for the `forgeclaw refine` CLI handoff. The proxy
 * routes unauthenticated requests to /refine?token=X through here so the
 * user does not need to paste the dashboard token manually.
 *
 * Flow:
 *   1. Read ?token= and ?next= from the URL
 *   2. POST /api/auth/login { token } -> sets fc-token cookie
 *   3. window.location.replace(next) -> lands on the original /refine URL
 *
 * Runs entirely client-side so the cookie Set-Cookie header from the API
 * response gets persisted by the browser before navigation.
 */
export default function RefineBootstrapPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    const next = params.get("next") ?? "/refine";

    if (!token) {
      setStatus("error");
      setError("Token ausente na URL. Abra o link fornecido pelo CLI novamente.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ token }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setStatus("error");
          setError(body.error ?? `Autenticacao falhou (HTTP ${res.status})`);
          return;
        }
        // Cookie is set; redirect to the original destination (without ?token=).
        if (typeof window !== "undefined") {
          window.location.replace(next);
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError((err as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-lg font-semibold text-red-300">
            Falha ao autenticar via CLI
          </h1>
          <p className="text-sm text-text-secondary">{error}</p>
          <a
            href="/login"
            className="inline-block rounded-md bg-accent px-3 py-2 text-xs text-white hover:bg-accent/90"
          >
            Ir para login manual
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <div className="text-center">
        <p className="text-sm text-text-secondary">Autenticando via CLI...</p>
      </div>
    </div>
  );
}
