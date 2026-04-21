"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import { OnboardingLayout } from "./OnboardingLayout";
import { InterviewerChat } from "./InterviewerChat";
import { HarnessPreview } from "./HarnessPreview";
import { ActionsBar } from "./ActionsBar";
import { BudgetBar } from "./BudgetBar";

export function OnboardingApp() {
  const {
    state,
    snapshot,
    inFlight,
    error,
    refresh,
    sendMessage,
    approve,
    skip,
    pause,
  } = useOnboarding({ autoStart: true });

  const handlePause = async () => {
    await pause();
  };

  if (state.kind === "idle" || (state.kind === "loading" && !snapshot)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">Carregando onboarding...</p>
      </div>
    );
  }

  if (state.kind === "error" && !snapshot) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-red-300">Erro: {state.error}</p>
        <button
          onClick={() => void refresh()}
          className="rounded-md bg-accent px-3 py-2 text-xs text-white hover:bg-accent/90"
        >
          Tentar novamente
        </button>
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <BudgetBar budget={snapshot.budget} />
      <div className="flex-1 overflow-hidden">
        <OnboardingLayout
          chat={
            <InterviewerChat
              messages={snapshot.messages}
              status={snapshot.status}
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
              files={snapshot.harnessFiles}
              diffSummary={snapshot.diffSummary}
            />
          }
          actions={
            <ActionsBar
              status={snapshot.status}
              inFlight={inFlight}
              onApprove={approve}
              onSkip={skip}
              onPause={handlePause}
            />
          }
        />
      </div>
    </div>
  );
}
