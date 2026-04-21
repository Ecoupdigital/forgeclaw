"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, PauseCircle, SkipForward } from "lucide-react";
import type { OnboardingStatus } from "@/lib/onboarding-types";

interface ActionsBarProps {
  status: OnboardingStatus;
  inFlight: boolean;
  onApprove: () => Promise<void> | void;
  onSkip: () => Promise<void> | void;
  onPause: () => void;
}

export function ActionsBar({
  status,
  inFlight,
  onApprove,
  onSkip,
  onPause,
}: ActionsBarProps) {
  const [confirm, setConfirm] = useState<null | "skip" | "approve">(null);

  const canApprove = status === "done" && !inFlight;
  const canSkip = status !== "error" && !inFlight;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] bg-deep-space/80 px-4 py-2 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPause}
        disabled={inFlight}
        className="gap-2 text-text-secondary hover:text-text-primary"
        aria-label="Pausar e retomar depois"
      >
        <PauseCircle className="h-4 w-4" />
        Pausar
      </Button>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirm("skip")}
          disabled={!canSkip}
          className="gap-2 text-text-secondary hover:text-text-primary"
          aria-label="Pular entrevista e usar template puro"
        >
          <SkipForward className="h-4 w-4" />
          Pular
        </Button>
        <Button
          size="sm"
          onClick={() => setConfirm("approve")}
          disabled={!canApprove}
          className="gap-2 bg-emerald-500 text-white hover:bg-emerald-500/90 disabled:opacity-40"
          aria-label="Aprovar diff e aplicar no harness"
        >
          {inFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Aprovar e salvar
        </Button>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          {confirm === "skip" && (
            <>
              <DialogHeader>
                <DialogTitle>Pular a entrevista?</DialogTitle>
                <DialogDescription>
                  O template do arquetipo sera usado como esta, sem customizacoes.
                  Voce pode rodar <code className="font-mono text-xs">forgeclaw refine</code>{" "}
                  depois pra refinar.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirm(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    setConfirm(null);
                    await onSkip();
                  }}
                  className="bg-accent hover:bg-accent/90"
                >
                  Pular
                </Button>
              </DialogFooter>
            </>
          )}
          {confirm === "approve" && (
            <>
              <DialogHeader>
                <DialogTitle>Aprovar e aplicar?</DialogTitle>
                <DialogDescription>
                  As mudancas serao escritas em <code className="font-mono text-xs">~/.forgeclaw/harness/</code>.
                  Voce vai ser redirecionado pro dashboard principal.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirm(null)}>
                  Revisar
                </Button>
                <Button
                  onClick={async () => {
                    setConfirm(null);
                    await onApprove();
                  }}
                  className="bg-emerald-500 hover:bg-emerald-500/90"
                >
                  Aplicar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
