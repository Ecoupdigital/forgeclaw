"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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
import { CronCard } from "./cron-card";
import { CronFormSheet } from "./cron-form-sheet";
import { DeleteCronDialog } from "./delete-cron-dialog";
import type { CronJob, CronLog } from "@/lib/types";

type ToastKind = "success" | "error";
interface ToastState {
  text: string;
  kind: ToastKind;
}

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
                .slice(0, 5);
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

  const handleRunNow = useCallback(
    async (id: number) => {
      setRunningId(id);
      try {
        const res = await fetch("/api/crons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action: "run_now" }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!data.success) {
          showToast(data.error || "Run now failed", "error");
        }
      } catch (err) {
        console.error("Run now failed:", err);
        showToast("Run now failed", "error");
      } finally {
        setTimeout(() => setRunningId(null), 3000);
      }
    },
    [showToast]
  );

  const handleToggle = useCallback(async (id: number, enabled: boolean) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, enabled } : j)));
    try {
      await fetch("/api/crons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle", enabled }),
      });
    } catch (err) {
      console.error("Failed to toggle cron:", err);
    }
  }, []);

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
      name: `${job.name} (copy)`,
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
        showToast(`Cron "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
        await fetchJobs();
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Delete failed", "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchJobs, showToast]);

  const handleSaved = useCallback(
    async (saved: CronJob) => {
      const wasEdit = Boolean(editingJob && editingJob.id);
      showToast(wasEdit ? "Cron updated" : "Cron created");
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
      showToast("HEARTBEAT.md saved");
      setAdvancedOpen(false);
      // Reload jobs because file-origin crons may have changed
      await fetchJobs();
    } catch (err) {
      console.error("Failed to save heartbeat:", err);
      showToast("Save failed", "error");
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
        <p className="text-sm text-text-secondary">Loading crons...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-10 items-center justify-between px-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Cron Jobs ({jobs.filter((j) => j.enabled).length} active)
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleNew}
            className="bg-violet text-white hover:bg-violet/90"
          >
            + New cron
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdvancedOpen(true)}
            className="border-violet-dim text-text-secondary hover:text-text-body"
          >
            Advanced
          </Button>
        </div>
      </div>
      <Separator className="bg-violet-dim" />

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {sortedJobs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="text-5xl" aria-hidden="true">
                ⏰
              </div>
              <p className="text-sm text-text-secondary">No cron jobs yet</p>
              <p className="max-w-xs text-xs text-text-secondary/60">
                Schedule a prompt to run automatically. You can call any of your
                Claude skills.
              </p>
              <Button
                size="lg"
                onClick={handleNew}
                className="mt-2 bg-violet text-white hover:bg-violet/90"
              >
                + Create your first cron
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
              Advanced: HEARTBEAT.md
            </SheetTitle>
            <SheetDescription className="text-text-secondary">
              Raw editor for HEARTBEAT.md. Changes here hot-reload the
              file-origin cron jobs. Dashboard-created jobs (db-origin) are
              unaffected.
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
                Cancel
              </Button>
              <Button
                onClick={handleSaveHeartbeat}
                disabled={savingHeartbeat}
                className="flex-1 bg-violet text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {savingHeartbeat ? "Saving..." : "Save"}
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
