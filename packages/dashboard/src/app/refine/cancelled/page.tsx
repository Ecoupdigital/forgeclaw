"use client";

import { XCircle } from "lucide-react";

export default function RefineCancelledPage() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-night-panel text-text-secondary">
            <XCircle className="h-7 w-7" />
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-text-primary">
            Refine cancelado
          </h1>
          <p className="text-sm text-text-secondary">
            Nenhuma mudanca foi feita em{" "}
            <code className="font-mono text-xs">~/.forgeclaw/harness/</code>.
          </p>
        </div>
        <div className="space-y-2">
          <a
            href="/"
            className="inline-block rounded-md bg-accent px-4 py-2 text-xs text-white hover:bg-accent/90"
          >
            Voltar ao dashboard
          </a>
          <p className="text-[11px] text-text-disabled">
            Rode <code className="font-mono">forgeclaw refine</code> quando
            quiser tentar de novo. Voce pode fechar esta aba.
          </p>
        </div>
      </div>
    </div>
  );
}
