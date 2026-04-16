"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HarnessEditor } from "./harness-editor";
import type { HarnessFile } from "@/lib/types";

export function HarnessTab() {
  const [files, setFiles] = useState<HarnessFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [source, setSource] = useState<"core" | "mock" | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/harness", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        files: HarnessFile[];
        source: "core" | "mock";
      };
      setFiles(data.files);
      setSource(data.source);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load harness");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const handleSave = useCallback(
    async (name: string, content: string) => {
      const res = await fetch("/api/harness", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!data.success) {
        throw new Error(data.error ?? "Save failed");
      }
      // Refresh so subsequent edits see the new saved content as baseline
      setFiles((prev) =>
        prev.map((f) => (f.name === name ? { ...f, content } : f))
      );
    },
    []
  );

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Arquivos de personalidade
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Arquivos de system prompt que definem a personalidade e contexto do ForgeClaw.
              Alterações são aplicadas imediatamente.
            </p>
          </div>
          {source === "mock" && (
            <span className="rounded bg-amber-500/20 px-2 py-1 text-[10px] text-amber-400">
              Dados mock — core indisponível
            </span>
          )}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-sm text-text-secondary">Carregando arquivos de personalidade...</p>
          </div>
        )}

        {loadError && !loading && (
          <div className="py-16 text-center">
            <p className="text-sm text-red-400">Error: {loadError}</p>
          </div>
        )}

        {!loading && !loadError && files.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-text-secondary">
              Nenhum arquivo de personalidade encontrado
            </p>
            <p className="mt-1 text-xs text-text-secondary/60">
              Crie arquivos em ~/.forgeclaw/harness/
            </p>
          </div>
        )}

        {!loading &&
          !loadError &&
          files.map((file) => (
            <HarnessEditor
              key={`${file.name}:${file.content.length}`}
              file={file}
              onSave={handleSave}
            />
          ))}
      </div>
    </ScrollArea>
  );
}
