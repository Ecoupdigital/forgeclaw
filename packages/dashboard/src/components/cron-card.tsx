"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  ScrollText,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { CronJob, CronLog } from "@/lib/types";
import { useTimezone } from "@/hooks/use-timezone";

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
  const { formatTime } = useTimezone();
  const [showLogs, setShowLogs] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const isRunning = runningId === job.id;
  const isFileOrigin = job.origin === "file";

  const toggleLogExpand = (logId: number) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  return (
    <Card
      className={`border-violet-dim bg-deep-space transition-all hover:border-violet-glow ${
        highlighted ? "animate-pulse ring-2 ring-violet" : ""
      }`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-sm text-text-primary break-words">
            {job.name}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
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
            <span className="text-text-body">{job.lastRun ? formatTime(job.lastRun) : "Never"}</span>
          </div>
          <div className="text-xs text-text-secondary">
            <span className="text-text-secondary">Prompt: </span>
            <span className="text-text-body">
              {job.prompt.slice(0, 80)}
              {job.prompt.length > 80 ? "..." : ""}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap lg:items-center">
          {/* Primary: Run now (violet filled) */}
          <Button
            variant="default"
            size="xs"
            onClick={() => onRunNow(job.id)}
            disabled={isRunning}
            title="Run this cron now"
            className="bg-violet text-white hover:bg-violet/90"
          >
            {isRunning ? (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Running
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <RefreshCw aria-hidden="true" />
                Run now
              </span>
            )}
          </Button>

          {/* Secondary: Pause/Resume (violet outline) */}
          <Button
            variant="outline"
            size="xs"
            onClick={() => onToggle(job.id, !job.enabled)}
            disabled={isFileOrigin}
            title={
              isFileOrigin
                ? "Cannot toggle file-origin jobs. Edit in HEARTBEAT.md."
                : job.enabled
                ? "Pause this cron"
                : "Resume this cron"
            }
            className="border-violet-dim text-violet hover:bg-violet/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {job.enabled ? (
              <span className="flex items-center gap-1">
                <Pause aria-hidden="true" />
                Pause
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Play aria-hidden="true" />
                Resume
              </span>
            )}
          </Button>

          {/* Tertiary: View logs (discreet outline) */}
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowLogs(!showLogs)}
            title={showLogs ? "Hide logs" : "View recent logs"}
            className="border-violet-dim text-text-secondary hover:text-text-body hover:bg-night-panel"
          >
            <span className="flex items-center gap-1">
              <ScrollText aria-hidden="true" />
              {showLogs ? "Hide" : "Logs"}
            </span>
          </Button>

          {/* More menu: Edit / Duplicate / Delete */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="xs"
                  aria-label="More actions"
                  title="More actions"
                  className="text-text-secondary hover:text-text-body hover:bg-night-panel"
                >
                  <span className="flex items-center gap-1">
                    <MoreHorizontal aria-hidden="true" />
                    <span className="sm:hidden lg:inline">More</span>
                  </span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" side="bottom" className="min-w-36">
              <DropdownMenuItem
                disabled={isFileOrigin}
                onClick={() => onEdit(job)}
              >
                <Pencil aria-hidden="true" />
                Edit
                {isFileOrigin && (
                  <span className="ml-auto text-[10px] text-text-secondary">
                    file
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(job)}>
                <Copy aria-hidden="true" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isFileOrigin}
                onClick={() => onDelete(job)}
              >
                <Trash2 aria-hidden="true" />
                Delete
                {isFileOrigin && (
                  <span className="ml-auto text-[10px] text-text-secondary">
                    file
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                    {formatTime(log.startedAt)}
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
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => toggleLogExpand(log.id)}
                      className="flex items-center gap-1 text-[10px] text-violet hover:text-violet/80"
                      aria-label={expandedLogIds.has(log.id) ? "Collapse output" : "Expand output"}
                    >
                      {expandedLogIds.has(log.id) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      output ({log.output.length} chars)
                    </button>
                    {expandedLogIds.has(log.id) && (
                      <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/30 p-2 text-text-body whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                        {log.output}
                      </pre>
                    )}
                    {!expandedLogIds.has(log.id) && (
                      <p className="mt-1 text-text-secondary font-mono text-[10px] truncate">
                        {log.output.slice(0, 120)}{log.output.length > 120 ? "..." : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
