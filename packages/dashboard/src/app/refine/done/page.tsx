"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

function DoneInner() {
  const params = useSearchParams();
  const backupId = params.get("backupId");

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-text-primary">
            Refine aplicado
          </h1>
          <p className="text-sm text-text-secondary">
            As mudancas foram escritas em{" "}
            <code className="font-mono text-xs">~/.forgeclaw/harness/</code>.
          </p>
          {backupId && (
            <p className="text-xs text-text-disabled">
              Backup: <code className="font-mono">{backupId}</code>
            </p>
          )}
        </div>
        <div className="space-y-2">
          <a
            href="/"
            className="inline-block rounded-md bg-accent px-4 py-2 text-xs text-white hover:bg-accent/90"
          >
            Voltar ao dashboard
          </a>
          <p className="text-[11px] text-text-disabled">
            Rollback disponivel via{" "}
            <code className="font-mono">forgeclaw refine --rollback</code>.
            Voce pode fechar esta aba.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RefineDonePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-text-secondary">Carregando...</p>
        </div>
      }
    >
      <DoneInner />
    </Suspense>
  );
}
