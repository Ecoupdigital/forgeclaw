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

      const data = (await res.json()) as { ok?: boolean; error?: string };

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
          <h1 className="text-2xl font-bold text-text-primary">
            ForgeClaw
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your dashboard token to continue
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="token"
              className="mb-1.5 block text-sm font-medium text-text-body"
            >
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
              disabled={loading}
              aria-describedby={error ? "login-error" : undefined}
              className="w-full rounded-md border border-border bg-deep-space px-3 py-2 text-sm text-text-body placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {error && (
            <p id="login-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-void disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Enter Dashboard"}
          </button>
        </form>

        {/* Help text */}
        <p className="text-center text-xs text-text-secondary">
          Esqueceu o token? Rode{" "}
          <code className="rounded bg-night-panel px-1 py-0.5 font-mono text-xs">
            forgeclaw token
          </code>
          {" "}no terminal.
        </p>
      </div>
    </div>
  );
}
