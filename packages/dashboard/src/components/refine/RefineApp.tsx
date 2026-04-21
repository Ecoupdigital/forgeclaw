"use client";

import { useEffect, useRef } from "react";
import { useRefine } from "@/hooks/use-refine";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { InterviewerChat } from "@/components/onboarding/InterviewerChat";
import { HarnessPreview } from "@/components/onboarding/HarnessPreview";
import { BudgetBar } from "@/components/onboarding/BudgetBar";
import { RefineActionsBar } from "./RefineActionsBar";
import type {
  OnboardingMessageDTO,
  OnboardingHarnessFileDTO,
  OnboardingDiffSummary,
  OnboardingBudgetDTO,
  OnboardingStatus,
} from "@/lib/onboarding-types";
import type {
  RefineMode,
  RefineArchetype,
  RefineSection,
  RefineSessionSnapshot,
} from "@/lib/refine-types";

interface RefineAppProps {
  mode: RefineMode;
  archetype?: RefineArchetype;
  section?: RefineSection;
}

/**
 * Adapts a RefineSessionSnapshot to the DTO shape expected by the existing
 * onboarding components. Shapes are identical by design (Fase 27 <-> 28
 * parallel), so the adapter is mostly an identity cast — we reuse the
 * components WITHOUT duplicating them.
 */
function adaptSnapshot(s: RefineSessionSnapshot) {
  const messages: OnboardingMessageDTO[] = s.messages;
  const harnessFiles: OnboardingHarnessFileDTO[] = s.harnessFiles;
  const diffSummary: OnboardingDiffSummary | null = s.diffSummary;
  const budget: OnboardingBudgetDTO = s.budget;
  const status: OnboardingStatus = s.status;
  return { messages, harnessFiles, diffSummary, budget, status };
}

const MODE_LABELS: Record<RefineMode, string> = {
  default: "Default (entrevista de refinamento)",
  archetype: "Troca de arquetipo",
  section: "Refinar secao",
  reset: "Reset ao template base",
};

export function RefineApp({ mode, archetype, section }: RefineAppProps) {
  const refine = useRefine({ mode, archetype, section });
  const {
    state,
    snapshot,
    inFlight,
    error,
    start,
    sendMessage,
    approve,
    cancel,
    refresh,
  } = refine;

  // Bootstrap once on mount.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
  }, [start]);

  if (state.kind === "idle" || (state.kind === "loading" && !snapshot)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">
          Iniciando sessao de refine...
        </p>
      </div>
    );
  }

  if (state.kind === "error" && !snapshot) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-red-300">Erro: {state.error}</p>
        <div className="flex gap-2">
          <button
            onClick={() => void start()}
            className="rounded-md bg-accent px-3 py-2 text-xs text-white hover:bg-accent/90"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => void cancel()}
            className="rounded-md bg-night-panel px-3 py-2 text-xs text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">Snapshot indisponivel.</p>
      </div>
    );
  }

  const adapted = adaptSnapshot(snapshot);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="border-b border-white/[0.06] bg-deep-space/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">
            ForgeClaw Refine
          </span>
          <span className="rounded-full bg-violet/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-violet">
            {MODE_LABELS[snapshot.mode]}
          </span>
          <span className="text-xs text-text-disabled">
            arquetipo: {snapshot.archetype}
            {snapshot.section ? ` · secao: ${snapshot.section}.md` : ""}
          </span>
        </div>
      </header>
      <BudgetBar budget={adapted.budget} />
      <div className="flex-1 overflow-hidden">
        <OnboardingLayout
          chat={
            <InterviewerChat
              messages={adapted.messages}
              status={adapted.status}
              currentQuestion={snapshot.currentQuestion}
              currentRationale={snapshot.currentRationale}
              inFlight={inFlight}
              onSend={sendMessage}
              error={error}
              onRetry={refresh}
            />
          }
          preview={
            <HarnessPreview
              files={adapted.harnessFiles}
              diffSummary={adapted.diffSummary}
            />
          }
          actions={
            <RefineActionsBar
              status={adapted.status}
              inFlight={inFlight}
              onApprove={approve}
              onCancel={cancel}
            />
          }
        />
      </div>
    </div>
  );
}
