"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { CronExpressionParser } from "cron-parser";
import { AlarmClock } from "lucide-react";
import { CronCard } from "./cron-card";
import { CronFormSheet } from "./cron-form-sheet";
import { DeleteCronDialog } from "./delete-cron-dialog";
import type { CronJob, CronLog } from "@/lib/types";

type ToastKind = "success" | "error";
interface ToastState {
  text: string;
  kind: ToastKind;
}

/** Result from a "Run Now" execution, shown inline on the card. */
export interface RunResult {
  status: string;
  output: string | null;
  finishedAt: number;
}

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

export function CronsTab() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [logs, setLogs] = useState<Record<number, CronLog[]>>({});
  const [runningId, setRunningId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Form sheet state (create / edit / duplicate)
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<CronJob | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Advanced sheet (raw HEARTBEAT.md editor)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [heartbeat, setHeartbeat] = useState("");
  const [savingHeartbeat, setSavingHeartbeat] = useState(false);

  // Highlight (pulse) for recently saved card
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  // Inline run results from "Run Now" polling
  const [runResults, setRunResults] = useState<Record<number, RunResult>>({});
  const pollTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());

  // Cleanup poll timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of pollTimers.current.values()) {
        clearInterval(timer);
      }
    };
  }, []);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((text: string, kind: ToastKind = "success") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch jobs + their recent logs
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/crons");
      const data = (await res.json()) as { jobs?: CronJob[] };
      const list = data.jobs ?? [];
      setJobs(list);
      const logsMap: Record<number, CronLog[]> = {};
      await Promise.all(
        list.map(async (job) => {
          try {
            const lr = await fetch(`/api/crons/${job.id}/logs`);
            const ld = (await lr.json()) as { logs?: CronLog[] };
            if (ld.logs) {
              logsMap[job.id] = ld.logs
                .filter((l) => l.finishedAt)
                .slice(0, 10);
            }
          } catch {
            /* ignore per-job log failure */
          }
        })
      );
      setLogs(logsMap);
    } catch (err) {
      console.error("Failed to fetch crons:", err);
    }
  }, []);

  const fetchHeartbeat = useCallback(async () => {
    try {
      const hbRes = await fetch("/api/heartbeat");
      const hbData = (await hbRes.json()) as { content?: string };
      if (typeof hbData.content === "string") setHeartbeat(hbData.content);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchJobs(), fetchHeartbeat()]);
      setLoading(false);
    })();
  }, [fetchJobs, fetchHeartbeat]);

  const clearPoll = useCallback((id: number) => {
    const timer = pollTimers.current.get(id);
    if (timer) {
      clearInterval(timer);
      pollTimers.current.delete(id);
    }
  }, []);

  const handleDismissResult = useCallback((id: number) => {
    setRunResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleRunNow = useCallback(
    async (id: number) => {
      // Clear any previous result for this job
      handleDismissResult(id);
      setRunningId(id);
      const job = jobs.find((j) => j.id === id);
      showToast(`Executing "${job?.name ?? `#${id}`}"...`);

      // Snapshot the current latest log id so we can detect a NEW log
      const currentLogs = logs[id] ?? [];
      const latestLogId = currentLogs.length > 0 ? currentLogs[0].id : 0;

      try {
        const res = await fetch("/api/crons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action: "run_now" }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!data.success) {
          showToast(data.error || "Run now failed", "error");
          setRunningId(null);
          return;
        }
      } catch (err) {
        console.error("Run now failed:", err);
        showToast("Run now failed", "error");
        setRunningId(null);
        return;
      }

      // Start polling for the result
      const startedAt = Date.now();
      const poll = async () => {
        // Timeout check
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          clearPoll(id);
          setRunningId((prev) => (prev === id ? null : prev));
          showToast("Execution timed out -- check Telegram for results", "error");
          return;
        }

        try {
          const lr = await fetch(`/api/crons/${id}/logs`);
          const ld = (await lr.json()) as { logs?: CronLog[] };
          const allLogs = ld.logs ?? [];
          // Find a completed log newer than the one we had before triggering
          const newLog = allLogs.find(
            (l) => l.id > latestLogId && l.finishedAt
          );
          if (newLog) {
            clearPoll(id);
            setRunningId((prev) => (prev === id ? null : prev));
            setRunResults((prev) => ({
              ...prev,
              [id]: {
                status: newLog.status,
                output: newLog.output,
                finishedAt: newLog.finishedAt!,
              },
            }));
            // Also refresh the full logs list so the card's log history is current
            setLogs((prev) => ({
              ...prev,
              [id]: allLogs.filter((l) => l.finishedAt).slice(0, 10),
            }));
            const statusLabel = newLog.status === "success" ? "completed" : "failed";
            showToast(
              `"${job?.name ?? `#${id}`}" ${statusLabel}`,
              newLog.status === "success" ? "success" : "error"
            );
          }
        } catch {
          // Ignore transient fetch errors, keep polling
        }
      };

      // Poll immediately once, then every POLL_INTERVAL_MS
      poll();
      const timer = setInterval(poll, POLL_INTERVAL_MS);
      pollTimers.current.set(id, timer);
    },
    [jobs, logs, showToast, clearPoll, handleDismissResult]
  );

  const handleToggle = useCallback(
    async (id: number, enabled: boolean) => {
      let snapshot: CronJob[] = [];
      setJobs((prev) => {
        snapshot = prev;
        return prev.map((j) => (j.id === id ? { ...j, enabled } : j));
      });
      try {
        const res = await fetch("/api/crons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action: "toggle", enabled }),
        });
        if (!res.ok) {
          const data = (await res
            .json()
            .catch(() => ({}))) as { error?: string };
          throw new Error(
            data.error || `Toggle failed (HTTP ${res.status})`
          );
        }
      } catch (err) {
        console.error("Failed to toggle cron:", err);
        setJobs(snapshot);
        const msg = err instanceof Error ? err.message : "Toggle failed";
        showToast(msg, "error");
      }
    },
    [showToast]
  );

  const handleNew = useCallback(() => {
    setEditingJob(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((job: CronJob) => {
    setEditingJob(job);
    setFormOpen(true);
  }, []);

  const handleDuplicate = useCallback((job: CronJob) => {
    // Sentinel id=0: CronFormSheet treats `Boolean(initialJob?.id)` as false,
    // so the form opens in CREATE mode but with all fields prefilled.
    const copy: CronJob = {
      ...job,
      id: 0,
      name: `${job.name} (cópia)`,
      origin: "db",
      sourceFile: null,
      lastRun: null,
      lastStatus: null,
    };
    setEditingJob(copy);
    setFormOpen(true);
  }, []);

  const handleAskDelete = useCallback((job: CronJob) => {
    setDeleteTarget(job);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/crons?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        showToast(`Automação "${deleteTarget.name}" excluída`);
        setDeleteTarget(null);
        await fetchJobs();
      } else {
        showToast(data.error || "Falha ao excluir", "error");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Falha ao excluir", "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchJobs, showToast]);

  const handleSaved = useCallback(
    async (saved: CronJob) => {
      const wasEdit = Boolean(editingJob && editingJob.id);
      showToast(wasEdit ? "Automação atualizada" : "Automação criada");
      setEditingJob(null);
      await fetchJobs();
      // Pulse highlight 3s on the affected card
      if (saved.id) {
        setHighlightedId(saved.id);
        setTimeout(() => setHighlightedId(null), 3000);
      }
    },
    [editingJob, fetchJobs, showToast]
  );

  const handleSaveHeartbeat = useCallback(async () => {
    setSavingHeartbeat(true);
    try {
      const res = await fetch("/api/heartbeat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: heartbeat }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("HEARTBEAT.md salvo");
      setAdvancedOpen(false);
      // Reload jobs because file-origin crons may have changed
      await fetchJobs();
    } catch (err) {
      console.error("Failed to save heartbeat:", err);
      showToast("Falha ao salvar", "error");
    } finally {
      setSavingHeartbeat(false);
    }
  }, [heartbeat, showToast, fetchJobs]);

  // Sort jobs by next fire (ascending). Disabled / invalid go last.
  const sortedJobs = useMemo(() => {
    const withNext = jobs.map((j) => {
      let next = Number.MAX_SAFE_INTEGER;
      if (j.enabled) {
        try {
          next = CronExpressionParser.parse(j.schedule).next().getTime();
        } catch {
          /* invalid schedule, sort to end */
        }
      }
      return { job: j, next };
    });
    withNext.sort((a, b) => a.next - b.next);
    return withNext.map((w) => w.job);
  }, [jobs]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">Carregando automações...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex min-h-10 flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <h2 className="text-sm font-semibold text-text-primary">
          Automações ({jobs.filter((j) => j.enabled).length} ativas)
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleNew}
            className="bg-violet text-white hover:bg-violet/90"
          >
            <span className="sm:hidden">+ Nova</span>
            <span className="hidden sm:inline">+ Nova automação</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdvancedOpen(true)}
            className="border-violet-dim text-text-secondary hover:text-text-body"
          >
            Avançado
          </Button>
        </div>
      </div>
      <Separator className="bg-violet-dim" />

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {sortedJobs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlarmClock
                className="h-14 w-14 text-violet/60"
                aria-hidden="true"
              />
              <p className="text-sm text-text-secondary">Nenhuma automação ainda</p>
              <p className="max-w-xs text-sm text-text-body">
                Agende um prompt para rodar automaticamente. Você pode chamar
                qualquer uma das suas skills.
              </p>
              <Button
                size="lg"
                onClick={handleNew}
                className="mt-2 w-full max-w-xs bg-violet text-white hover:bg-violet/90 sm:w-auto"
              >
                + Criar sua primeira automação
              </Button>
            </div>
          )}
          {sortedJobs.map((job) => (
            <CronCard
              key={job.id}
              job={job}
              logs={logs[job.id] ?? []}
              onRunNow={handleRunNow}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleAskDelete}
              onDuplicate={handleDuplicate}
              runningId={runningId}
              highlighted={highlightedId === job.id}
              runResult={runResults[job.id] ?? null}
              onDismissResult={handleDismissResult}
            />
          ))}
        </div>
      </div>

      {/* Form sheet (create / edit / duplicate) */}
      <CronFormSheet
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingJob(null);
        }}
        initialJob={editingJob}
        onSaved={handleSaved}
      />

      {/* Delete confirmation modal */}
      <DeleteCronDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        jobName={deleteTarget?.name ?? ""}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />

      {/* Advanced sheet (raw HEARTBEAT.md editor) */}
      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-xl overflow-y-auto bg-deep-space border-violet-dim"
        >
          <SheetHeader>
            <SheetTitle className="text-text-primary">
              Avançado: HEARTBEAT.md
            </SheetTitle>
            <SheetDescription className="text-text-secondary">
              Editor direto do HEARTBEAT.md. Alterações aqui recarregam as
              automações de origem arquivo. Automações criadas pelo dashboard
              (origem DB) não são afetadas.
            </SheetDescription>
          </SheetHeader>
          <Separator className="bg-violet-dim" />
          <div className="px-4 pb-2">
            <Textarea
              value={heartbeat}
              onChange={(e) => setHeartbeat(e.target.value)}
              disabled={savingHeartbeat}
              className="min-h-[500px] resize-y border-violet-dim bg-night-panel font-mono text-xs leading-relaxed text-text-body focus-visible:ring-violet"
              aria-label="Edit HEARTBEAT.md"
            />
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={() => setAdvancedOpen(false)}
                disabled={savingHeartbeat}
                className="flex-1 border-violet-dim text-text-secondary"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveHeartbeat}
                disabled={savingHeartbeat}
                className="flex-1 bg-violet text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {savingHeartbeat ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-[100] rounded-md border px-4 py-2 text-xs shadow-lg ${
            toast.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
              : "border-red-500/30 bg-red-500/20 text-red-300"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
