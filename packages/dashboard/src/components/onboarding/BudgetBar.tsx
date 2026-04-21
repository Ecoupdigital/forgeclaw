"use client";

import type { OnboardingBudgetDTO } from "@/lib/onboarding-types";

interface BudgetBarProps {
  budget: OnboardingBudgetDTO;
}

function Progress({
  label,
  used,
  max,
  unit,
  warningThreshold = 0.7,
  errorThreshold = 0.9,
}: {
  label: string;
  used: number;
  max: number;
  unit?: string;
  warningThreshold?: number;
  errorThreshold?: number;
}) {
  const pct = max > 0 ? Math.min(1, used / max) : 0;
  const pctStr = `${Math.round(pct * 100)}%`;
  const tone =
    pct >= errorThreshold
      ? "bg-red-500"
      : pct >= warningThreshold
        ? "bg-amber-400"
        : "bg-emerald-400";

  return (
    <div className="flex min-w-[110px] flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-disabled">
          {label}
        </span>
        <span className="text-[10px] font-mono text-text-secondary">
          {used.toLocaleString("pt-BR")}
          {unit ? unit : ""}/{max.toLocaleString("pt-BR")}
          {unit ? unit : ""}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tone}`}
          style={{ width: pctStr }}
          role="progressbar"
          aria-valuenow={Math.round(pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pctStr}`}
        />
      </div>
    </div>
  );
}

export function BudgetBar({ budget }: BudgetBarProps) {
  const outside = !budget.withinLimits;
  return (
    <div
      className={`flex flex-wrap items-center gap-4 border-b px-4 py-2 ${
        outside ? "border-red-500/30 bg-red-500/10" : "border-white/[0.06] bg-deep-space/60"
      }`}
      aria-label="Budget progress"
    >
      <Progress label="turnos" used={budget.turnsUsed} max={budget.maxTurns} />
      <Progress label="input tk" used={budget.inputTokensUsed} max={budget.maxInputTokens} />
      <Progress label="output tk" used={budget.outputTokensUsed} max={budget.maxOutputTokens} />
      <Progress
        label="tempo"
        used={Math.round(budget.elapsedMs / 1000)}
        max={Math.round(budget.timeoutMs / 1000)}
        unit="s"
      />
      {outside && (
        <span className="text-[11px] text-red-300">
          Budget estourado ({budget.cutoffReason ?? "unknown"}). Entrevista sera encerrada.
        </span>
      )}
    </div>
  );
}
