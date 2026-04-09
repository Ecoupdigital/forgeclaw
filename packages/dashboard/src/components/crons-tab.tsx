"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CronCard } from "./cron-card";
import {
  mockCronJobs,
  mockCronLogs,
  mockHeartbeat,
} from "@/lib/mock-data";
import type { CronJob } from "@/lib/types";

export function CronsTab() {
  const [jobs, setJobs] = useState<CronJob[]>(mockCronJobs);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [heartbeat, setHeartbeat] = useState(mockHeartbeat);
  const [editingHeartbeat, setEditingHeartbeat] = useState(false);
  const [savingHeartbeat, setSavingHeartbeat] = useState(false);

  const handleRunNow = useCallback((id: number) => {
    setRunningId(id);
    setTimeout(() => setRunningId(null), 3000);
  }, []);

  const handleToggle = useCallback((id: number, enabled: boolean) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, enabled } : j))
    );
  }, []);

  const handleSaveHeartbeat = useCallback(async () => {
    setSavingHeartbeat(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 1000));
    setSavingHeartbeat(false);
    setEditingHeartbeat(false);
  }, []);

  return (
    <div className="flex h-full">
      {/* Main cron list */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-10 items-center justify-between px-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Cron Jobs
          </h2>
          <Button
            size="xs"
            className="bg-violet text-white hover:bg-violet/90"
          >
            + New Cron
          </Button>
        </div>
        <Separator className="bg-violet-dim" />
        <ScrollArea className="h-[calc(100%-41px)]">
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
                logs={mockCronLogs.filter((l) => l.jobId === job.id)}
                onRunNow={handleRunNow}
                onToggle={handleToggle}
                runningId={runningId}
              />
            ))}
          </div>
        </ScrollArea>
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
                size="xs"
                onClick={() => {
                  setHeartbeat(mockHeartbeat);
                  setEditingHeartbeat(false);
                }}
                disabled={savingHeartbeat}
                className="border-violet-dim text-text-secondary hover:text-text-body"
              >
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={handleSaveHeartbeat}
                disabled={savingHeartbeat}
                className="bg-violet text-white hover:bg-violet/90"
              >
                {savingHeartbeat ? (
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="xs"
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
                  {heartbeat}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
