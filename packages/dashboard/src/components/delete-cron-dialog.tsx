"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteCronDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteCronDialog({
  open,
  onOpenChange,
  jobName,
  onConfirm,
  loading = false,
}: DeleteCronDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-violet-dim bg-deep-space sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            Delete cron &ldquo;{jobName}&rdquo;?
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            This cannot be undone. Cron logs for this job are kept for audit.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="!flex-col gap-2 sm:!flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-violet-dim text-text-secondary hover:text-text-body"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-500 text-white hover:bg-red-500/90 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
