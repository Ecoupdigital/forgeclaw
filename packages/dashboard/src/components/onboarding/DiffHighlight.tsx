"use client";

import { useMemo } from "react";

interface DiffHighlightProps {
  currentContent: string;
  previewContent: string;
  /** max lines rendered. When exceeded, preview is truncated with "... (N more)". */
  maxLines?: number;
}

interface DiffLine {
  kind: "unchanged" | "added" | "removed";
  text: string;
}

/**
 * Minimal diff renderer.
 *
 * Uses a LCS (longest common subsequence) table. Good enough for harness files
 * which are short (<200 lines). Not optimized for large files — if we need
 * that later, swap for `diff` npm package.
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  if (oldText === newText) {
    return oldText.split("\n").map((t) => ({ kind: "unchanged" as const, text: t }));
  }
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // LCS length table
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Walk back
  const out: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      out.push({ kind: "unchanged", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      out.push({ kind: "removed", text: oldLines[i - 1] });
      i--;
    } else {
      out.push({ kind: "added", text: newLines[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    out.push({ kind: "removed", text: oldLines[i - 1] });
    i--;
  }
  while (j > 0) {
    out.push({ kind: "added", text: newLines[j - 1] });
    j--;
  }
  return out.reverse();
}

export function DiffHighlight({
  currentContent,
  previewContent,
  maxLines = 400,
}: DiffHighlightProps) {
  const lines = useMemo(
    () => computeDiff(currentContent, previewContent),
    [currentContent, previewContent],
  );

  const visible = lines.slice(0, maxLines);
  const overflow = Math.max(0, lines.length - maxLines);

  return (
    <pre className="m-0 overflow-x-auto rounded-md border border-white/[0.06] bg-deep-space p-3 font-mono text-[11px] leading-relaxed">
      <code>
        {visible.map((line, idx) => {
          const cls =
            line.kind === "added"
              ? "bg-emerald-500/10 text-emerald-300"
              : line.kind === "removed"
                ? "bg-red-500/10 text-red-300 line-through"
                : "text-text-secondary";
          const sign =
            line.kind === "added" ? "+ " : line.kind === "removed" ? "- " : "  ";
          return (
            <span
              key={idx}
              className={`block whitespace-pre-wrap px-2 -mx-2 ${cls}`}
            >
              <span className="select-none opacity-50">{sign}</span>
              {line.text || " "}
            </span>
          );
        })}
        {overflow > 0 && (
          <span className="block px-2 text-text-disabled">
            ... ({overflow} more lines truncated)
          </span>
        )}
      </code>
    </pre>
  );
}
