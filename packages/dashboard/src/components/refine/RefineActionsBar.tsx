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
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { OnboardingStatus } from "@/lib/onboarding-types";

interface RefineActionsBarProps {
  status: OnboardingStatus;
  inFlight: boolean;
  onApprove: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
}

/**
 * Refine-specific action bar. Mirrors the onboarding ActionsBar but with
 * two actions only (approve / cancel — there is no 'skip' in refine since
 * a diff-less interview is legitimate and user can just cancel to abort).
 */
export function RefineActionsBar({
  status,
  inFlight,
  onApprove,
  onCancel,
}: RefineActionsBarProps) {
  const [confirm, setConfirm] = useState<null | "cancel" | "approve">(null);

  const canApprove = status === "done" && !inFlight;
  const canCancel = !inFlight;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] bg-deep-space/80 px-4 py-2 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirm("cancel")}
        disabled={!canCancel}
        className="gap-2 text-text-secondary hover:text-text-primary"
        aria-label="Cancelar refine sem aplicar"
      >
        <XCircle className="h-4 w-4" />
        Cancelar
      </Button>

      <Button
        size="sm"
        onClick={() => setConfirm("approve")}
        disabled={!canApprove}
        className="gap-2 bg-emerald-500 text-white hover:bg-emerald-500/90 disabled:opacity-40"
        aria-label="Aprovar diff, criar backup e aplicar no harness"
      >
        {inFlight ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Aprovar e aplicar
      </Button>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent>
          {confirm === "cancel" && (
            <>
              <DialogHeader>
                <DialogTitle>Cancelar refine?</DialogTitle>
                <DialogDescription>
                  Nenhuma mudanca sera aplicada no harness. Voce pode rodar{" "}
                  <code className="font-mono text-xs">forgeclaw refine</code>{" "}
                  novamente a qualquer momento.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirm(null)}>
                  Voltar
                </Button>
                <Button
                  onClick={async () => {
                    setConfirm(null);
                    await onCancel();
                  }}
                  className="bg-night-panel hover:bg-night-panel/80"
                >
                  Cancelar refine
                </Button>
              </DialogFooter>
            </>
          )}
          {confirm === "approve" && (
            <>
              <DialogHeader>
                <DialogTitle>Aprovar e aplicar?</DialogTitle>
                <DialogDescription>
                  Um backup sera criado em{" "}
                  <code className="font-mono text-xs">
                    ~/.forgeclaw/harness-backups/
                  </code>{" "}
                  antes das mudancas serem escritas em{" "}
                  <code className="font-mono text-xs">
                    ~/.forgeclaw/harness/
                  </code>
                  . Rollback disponivel via{" "}
                  <code className="font-mono text-xs">
                    forgeclaw refine --rollback
                  </code>
                  .
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
