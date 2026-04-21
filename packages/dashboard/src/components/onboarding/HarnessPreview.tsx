"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DiffHighlight } from "./DiffHighlight";
import type {
  OnboardingHarnessFileDTO,
  OnboardingDiffSummary,
} from "@/lib/onboarding-types";

interface HarnessPreviewProps {
  files: OnboardingHarnessFileDTO[];
  diffSummary: OnboardingDiffSummary | null;
}

const FILE_ORDER = [
  "SOUL.md",
  "USER.md",
  "AGENTS.md",
  "TOOLS.md",
  "MEMORY.md",
  "STYLE.md",
  "HEARTBEAT.md",
] as const;

export function HarnessPreview({ files, diffSummary }: HarnessPreviewProps) {
  const sortedFiles = useMemo(() => {
    const map = new Map(files.map((f) => [f.name, f] as const));
    return FILE_ORDER
      .map((name) => map.get(name))
      .filter((f): f is OnboardingHarnessFileDTO => Boolean(f));
  }, [files]);

  const changedCount = sortedFiles.filter((f) => f.changed).length;
  const initial = sortedFiles.find((f) => f.changed)?.name ?? sortedFiles[0]?.name ?? "USER.md";
  const [active, setActive] = useState<string>(initial);

  return (
    <section
      aria-label="Harness preview"
      className="flex h-full flex-col overflow-hidden"
    >
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-deep-space/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">Harness preview</span>
          {changedCount > 0 ? (
            <Badge className="bg-emerald-500/20 text-emerald-300">
              {changedCount} changed
            </Badge>
          ) : (
            <Badge className="bg-white/[0.06] text-text-secondary">
              nothing yet
            </Badge>
          )}
        </div>
        {diffSummary && (
          <span className="truncate text-[10px] text-text-disabled" title={diffSummary.summary}>
            {diffSummary.opsCount} op{diffSummary.opsCount !== 1 ? "s" : ""} · {diffSummary.filesTouched.join(", ")}
          </span>
        )}
      </header>

      <Tabs value={active} onValueChange={setActive} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 my-2 flex w-fit flex-wrap gap-1 bg-transparent">
          {sortedFiles.map((f) => (
            <TabsTrigger
              key={f.name}
              value={f.name}
              className="gap-2 font-mono text-[11px]"
              aria-label={`Preview of ${f.name}`}
            >
              {f.name}
              {f.changed && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {sortedFiles.map((f) => (
          <TabsContent
            key={f.name}
            value={f.name}
            className="flex-1 overflow-y-auto px-4 pb-4"
          >
            {f.changed ? (
              <DiffHighlight
                currentContent={f.currentContent}
                previewContent={f.previewContent}
              />
            ) : (
              <pre className="m-0 overflow-x-auto rounded-md border border-white/[0.06] bg-deep-space p-3 font-mono text-[11px] leading-relaxed text-text-secondary">
                <code>{f.currentContent || `(${f.name} empty)`}</code>
              </pre>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
