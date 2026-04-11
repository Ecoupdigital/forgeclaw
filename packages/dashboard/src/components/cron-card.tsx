"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CronJob, CronLog } from "@/lib/types";

interface CronCardProps {
  job: CronJob;
  logs: CronLog[];
  onRunNow: (id: number) => void;
  onToggle: (id: number, enabled: boolean) => void;
  onEdit: (job: CronJob) => void;
  onDelete: (job: CronJob) => void;
  onDuplicate: (job: CronJob) => void;
  runningId: number | null;
  highlighted?: boolean;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "Never";
  const d = new Date(ts);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CronCard({
  job,
  logs,
  onRunNow,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  runningId,
  highlighted = false,
}: CronCardProps) {
  const [showLogs, setShowLogs] = useState(false);
  const isRunning = runningId === job.id;
  const isFileOrigin = job.origin === "file";
  const fileTooltip = "Edit in HEARTBEAT.md";

  return (
    <Card
      className={`border-violet-dim bg-deep-space transition-all hover:border-violet-glow ${
        highlighted ? "animate-pulse ring-2 ring-violet" : ""
      }`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-text-primary">{job.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] uppercase ${
                job.origin === "db"
                  ? "border-violet/60 bg-violet/20 text-violet"
                  : "border-text-secondary/30 bg-text-secondary/10 text-text-secondary"
              }`}
              title={
                job.origin === "db"
                  ? "Created via dashboard (stored in DB)"
                  : "Declared in HEARTBEAT.md"
              }
            >
              {job.origin}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                job.enabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-text-secondary/30 bg-text-secondary/10 text-text-secondary"
              }`}
            >
              {job.enabled ? "Active" : "Paused"}
            </Badge>
            {job.lastStatus && (
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  job.lastStatus === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}
              >
                {job.lastStatus}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mb-3 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-secondary">Schedule:</span>
            <span className="font-mono text-text-body">{job.schedule}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-secondary">Last run:</span>
            <span className="text-text-body">{formatTimestamp(job.lastRun)}</span>
          </div>
          <div className="text-xs text-text-secondary">
            <span className="text-text-secondary">Prompt: </span>
            <span className="text-text-body">
              {job.prompt.slice(0, 80)}
              {job.prompt.length > 80 ? "..." : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowLogs(!showLogs)}
            className="border-violet-dim text-text-secondary hover:text-text-body hover:bg-night-panel"
          >
            {showLogs ? "Hide logs" : "View logs"}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onRunNow(job.id)}
            disabled={isRunning}
            className="border-violet-dim text-violet hover:bg-violet/10"
          >
            {isRunning ? (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-violet/30 border-t-violet" />
                Running
              </span>
            ) : (
              "Run now"
            )}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onToggle(job.id, !job.enabled)}
            className="border-violet-dim text-text-secondary hover:text-text-body hover:bg-night-panel"
          >
            {job.enabled ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onEdit(job)}
            disabled={isFileOrigin}
            title={isFileOrigin ? fileTooltip : "Edit this cron"}
            className="border-violet-dim text-text-secondary hover:text-text-body hover:bg-night-panel disabled:cursor-not-allowed disabled:opacity-40"
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onDuplicate(job)}
            title="Duplicate as a new dashboard cron"
            className="border-violet-dim text-text-secondary hover:text-text-body hover:bg-night-panel"
          >
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onDelete(job)}
            disabled={isFileOrigin}
            title={isFileOrigin ? fileTooltip : "Delete this cron"}
            className="border-violet-dim text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </Button>
        </div>

        {showLogs && (
          <div className="mt-3 space-y-2 border-t border-violet-dim pt-3">
            {logs.length === 0 && (
              <p className="text-xs text-text-secondary">No logs yet</p>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-md bg-night-panel p-2 text-xs"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-text-secondary">
                    {formatTimestamp(log.startedAt)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      log.status === "success"
                        ? "border-emerald-500/30 text-emerald-400"
                        : log.status === "running"
                        ? "border-amber-500/30 text-amber-400"
                        : "border-red-500/30 text-red-400"
                    }`}
                  >
                    {log.status}
                  </Badge>
                </div>
                {log.output && (
                  <p className="text-text-body whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                    {log.output}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
