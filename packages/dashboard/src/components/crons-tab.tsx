"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { CronCard } from "./cron-card";
import type { CronJob, CronLog } from "@/lib/types";

export function CronsTab() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [logs, setLogs] = useState<Record<number, CronLog[]>>({});
  const [runningId, setRunningId] = useState<number | null>(null);
  const [heartbeat, setHeartbeat] = useState("");
  const [editingHeartbeat, setEditingHeartbeat] = useState(false);
  const [savingHeartbeat, setSavingHeartbeat] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch jobs
  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, hbRes] = await Promise.all([
          fetch("/api/crons"),
          fetch("/api/heartbeat"),
        ]);
        const jobsData = await jobsRes.json();
        const hbData = await hbRes.json();

        if (jobsData.jobs) setJobs(jobsData.jobs);
        if (hbData.content) setHeartbeat(hbData.content);

        // Fetch logs for each job
        if (jobsData.jobs) {
          const logsMap: Record<number, CronLog[]> = {};
          await Promise.all(
            jobsData.jobs.map(async (job: CronJob) => {
              try {
                const res = await fetch(`/api/crons/${job.id}/logs`);
                const data = await res.json();
                if (data.logs) {
                  // Only show completed logs (not dangling "running" entries)
                  logsMap[job.id] = data.logs
                    .filter((l: CronLog) => l.finishedAt)
                    .slice(0, 5);
                }
              } catch { /* ignore */ }
            })
          );
          setLogs(logsMap);
        }
      } catch (err) {
        console.error("Failed to fetch crons:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleRunNow = useCallback(async (id: number) => {
    setRunningId(id);
    try {
      await fetch("/api/crons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "run_now" }),
      });
    } catch (err) {
      console.error("Failed to run cron:", err);
    } finally {
      setTimeout(() => setRunningId(null), 3000);
    }
  }, []);

  const handleToggle = useCallback(async (id: number, enabled: boolean) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, enabled } : j))
    );
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

  const handleSaveHeartbeat = useCallback(async () => {
    setSavingHeartbeat(true);
    try {
      await fetch("/api/heartbeat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: heartbeat }),
      });
      setEditingHeartbeat(false);
    } catch (err) {
      console.error("Failed to save heartbeat:", err);
    } finally {
      setSavingHeartbeat(false);
    }
  }, [heartbeat]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">Loading crons...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main cron list */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-10 items-center justify-between px-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Cron Jobs ({jobs.filter((j) => j.enabled).length} active)
          </h2>
        </div>
        <Separator className="bg-violet-dim" />
        <div className="h-[calc(100%-41px)] overflow-y-auto">
          <div className="flex flex-col gap-3 p-4">
            {jobs.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="text-sm text-text-secondary">No cron jobs configured</p>
                <p className="mt-1 text-xs text-text-secondary/60">
                  Edit HEARTBEAT.md to add cron jobs
                </p>
              </div>
            )}
            {jobs.map((job) => (
              <CronCard
                key={job.id}
                job={job}
                logs={logs[job.id] ?? []}
                onRunNow={handleRunNow}
                onToggle={handleToggle}
                runningId={runningId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Heartbeat editor sidebar */}
      <div className="w-96 shrink-0 border-l border-violet-dim bg-deep-space">
        <div className="flex h-10 items-center justify-between px-4">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-secondary">
            HEARTBEAT.md
          </h2>
          {editingHeartbeat ? (
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingHeartbeat(false)}
                disabled={savingHeartbeat}
                className="border-violet-dim text-text-secondary hover:text-text-body"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveHeartbeat}
                disabled={savingHeartbeat}
                className="bg-violet text-white hover:bg-violet/90"
              >
                {savingHeartbeat ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingHeartbeat(true)}
              className="border-violet-dim text-violet hover:bg-violet/10"
            >
              Edit
            </Button>
          )}
        </div>
        <Separator className="bg-violet-dim" />
        <div className="p-4">
          {editingHeartbeat ? (
            <Textarea
              value={heartbeat}
              onChange={(e) => setHeartbeat(e.target.value)}
              disabled={savingHeartbeat}
              className="min-h-[400px] resize-y rounded-md border-violet-dim bg-night-panel font-mono text-xs leading-relaxed text-text-body focus-visible:ring-violet"
              aria-label="Edit HEARTBEAT.md"
            />
          ) : (
            <Card className="border-violet-dim bg-night-panel">
              <CardContent className="p-3">
                <pre className="font-mono text-xs leading-relaxed text-text-body whitespace-pre-wrap">
                  {heartbeat || "No HEARTBEAT.md found"}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
