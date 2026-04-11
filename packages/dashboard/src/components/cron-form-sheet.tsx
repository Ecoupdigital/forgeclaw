"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import cronstrue from "cronstrue";
import { CronExpressionParser } from "cron-parser";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { CRON_PRESETS, CRON_CUSTOM_SENTINEL } from "@/lib/cron-presets";
import type { CronJob, SkillInfo } from "@/lib/types";

interface TopicSlim {
  id: number;
  name: string;
  chatId: number;
  threadId: number | null;
}

interface CronFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null/undefined = create mode, preenchido = edit mode */
  initialJob?: CronJob | null;
  onSaved: (job: CronJob) => void;
}

interface SchedulePreview {
  humanReadable: string | null;
  nextRuns: string[];
  error: string | null;
}

// Server timezone — must match CronEngine's runtime timezone so the "next
// runs" the form shows match what the scheduler actually does. CronEngine
// uses `new Cron(expr, handler)` with croner's default (system local time),
// and the host runs in Etc/UTC. If the host TZ ever changes, update this.
const SERVER_TZ = "Etc/UTC";

// Display timezone — where the USER is. This is what the form shows next to
// "Next runs:" so the user sees wall-clock times in their own locale,
// independent of whatever TZ the server happens to run in.
const DISPLAY_TZ = "America/Sao_Paulo";

// Optional override via browser detection. Currently hard-coded to BRT
// because the user is in Novo Hamburgo/RS and wants presets to feel like
// their local time. If this product ever goes multi-user we should read
// from a profile setting.
const BROWSER_TZ =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "local";

const displayFormatter =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: DISPLAY_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    : null;

function formatInDisplayTz(d: Date): string {
  if (displayFormatter) return displayFormatter.format(d);
  return d.toISOString();
}

function validateSchedule(expr: string): SchedulePreview {
  const trimmed = expr.trim();
  if (!trimmed) {
    return {
      humanReadable: null,
      nextRuns: [],
      error: "Schedule is required",
    };
  }
  try {
    // Parse in the SERVER's timezone so the Date objects we get back
    // represent the exact moments CronEngine will fire. We then format
    // those moments in the user's display timezone for readable output.
    const iter = CronExpressionParser.parse(trimmed, { tz: SERVER_TZ });
    const runs: string[] = [];
    for (let i = 0; i < 3; i++) {
      runs.push(formatInDisplayTz(iter.next().toDate()));
    }
    let human: string | null = null;
    try {
      human = cronstrue.toString(trimmed, { use24HourTimeFormat: true });
    } catch {
      human = null;
    }
    return { humanReadable: human, nextRuns: runs, error: null };
  } catch (err) {
    return {
      humanReadable: null,
      nextRuns: [],
      error: err instanceof Error ? err.message : "Invalid cron expression",
    };
  }
}

export function CronFormSheet({
  open,
  onOpenChange,
  initialJob,
  onSaved,
}: CronFormSheetProps) {
  const isEdit = Boolean(initialJob?.id);

  // Form state
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<string>(CRON_PRESETS[0].value);
  const [customSchedule, setCustomSchedule] = useState("");
  const [prompt, setPrompt] = useState("");
  const [targetTopicId, setTargetTopicId] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);

  // External data
  const [topics, setTopics] = useState<TopicSlim[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when sheet opens / initialJob changes
  useEffect(() => {
    if (!open) return;
    if (initialJob) {
      setName(initialJob.name);
      const matchingPreset = CRON_PRESETS.find(
        (p) => p.value === initialJob.schedule
      );
      if (matchingPreset) {
        setPreset(matchingPreset.value);
        setCustomSchedule("");
      } else {
        setPreset(CRON_CUSTOM_SENTINEL);
        setCustomSchedule(initialJob.schedule);
      }
      setPrompt(initialJob.prompt);
      setTargetTopicId(initialJob.targetTopicId);
      setEnabled(initialJob.enabled);
    } else {
      setName("");
      setPreset(CRON_PRESETS[0].value);
      setCustomSchedule("");
      setPrompt("");
      setTargetTopicId(null);
      setEnabled(true);
    }
    setSubmitError(null);
  }, [open, initialJob]);

  // Load topics and skills when open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          fetch("/api/topics"),
          fetch("/api/skills"),
        ]);
        const tData = (await tRes.json()) as { topics: TopicSlim[] };
        const sData = (await sRes.json()) as { skills: SkillInfo[] };
        if (cancelled) return;
        setTopics(tData.topics ?? []);
        setSkills(sData.skills ?? []);
      } catch (err) {
        console.error("[CronFormSheet] Failed to load topics/skills:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Resolved schedule (preset or custom)
  const currentSchedule =
    preset === CRON_CUSTOM_SENTINEL ? customSchedule : preset;
  const preview = useMemo(
    () => validateSchedule(currentSchedule),
    [currentSchedule]
  );

  const canSave =
    name.trim().length > 0 &&
    prompt.trim().length > 0 &&
    preview.error === null &&
    !saving;

  const handleSubmit = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setSubmitError(null);
    try {
      let res: Response;
      if (isEdit && initialJob) {
        res = await fetch("/api/crons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: initialJob.id,
            action: "update",
            name: name.trim(),
            schedule: currentSchedule.trim(),
            prompt: prompt.trim(),
            targetTopicId,
            enabled,
          }),
        });
      } else {
        res = await fetch("/api/crons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            schedule: currentSchedule.trim(),
            prompt: prompt.trim(),
            targetTopicId,
            enabled,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Save failed");
      }
      // Construir CronJob result (se backend retornou, usa; senao, monta local)
      const saved: CronJob = {
        id: data.job?.id ?? initialJob?.id ?? 0,
        name: name.trim(),
        schedule: currentSchedule.trim(),
        prompt: prompt.trim(),
        targetTopicId,
        enabled,
        lastRun: initialJob?.lastRun ?? null,
        lastStatus: initialJob?.lastStatus ?? null,
        origin: "db",
        sourceFile: null,
      };
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    isEdit,
    initialJob,
    name,
    currentSchedule,
    prompt,
    targetTopicId,
    enabled,
    onSaved,
    onOpenChange,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-lg overflow-y-auto bg-deep-space border-violet-dim"
      >
        <SheetHeader>
          <SheetTitle className="text-text-primary">
            {isEdit ? "Edit cron" : "New cron"}
          </SheetTitle>
          <SheetDescription className="text-text-secondary">
            {isEdit
              ? "Update this cron job."
              : "Schedule a prompt to run on a cron expression."}
          </SheetDescription>
        </SheetHeader>

        <Separator className="bg-violet-dim" />

        <div className="flex flex-col gap-4 p-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="cron-name"
              className="text-xs font-medium text-text-secondary"
            >
              Name
            </label>
            <Input
              id="cron-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning summary"
              className="border-violet-dim bg-night-panel text-text-body"
            />
          </div>

          {/* Schedule preset */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="cron-schedule-preset"
              className="text-xs font-medium text-text-secondary"
            >
              Schedule
            </label>
            <select
              id="cron-schedule-preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="rounded-md border border-violet-dim bg-night-panel px-3 py-2 text-sm text-text-body focus:outline-none focus:ring-2 focus:ring-violet"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} ({p.value})
                </option>
              ))}
              <option value={CRON_CUSTOM_SENTINEL}>Custom...</option>
            </select>
            {preset === CRON_CUSTOM_SENTINEL && (
              <Input
                value={customSchedule}
                onChange={(e) => setCustomSchedule(e.target.value)}
                placeholder="e.g. 0 9 * * * or @daily"
                className="mt-2 font-mono border-violet-dim bg-night-panel text-text-body"
              />
            )}
            <p className="text-xs text-text-secondary">
              Runs on server ({SERVER_TZ}), displayed in {DISPLAY_TZ}
              {BROWSER_TZ !== DISPLAY_TZ && ` · your browser: ${BROWSER_TZ}`}
            </p>
            {preview.error && (
              <p className="text-xs text-red-400">{preview.error}</p>
            )}
            {!preview.error && preview.humanReadable && (
              <p className="text-xs text-text-body">{preview.humanReadable}</p>
            )}
            {!preview.error && preview.nextRuns.length > 0 && (
              <div className="text-[11px] text-text-secondary">
                <span className="text-text-secondary/80">Next runs:</span>
                <ul className="ml-1 list-disc pl-3">
                  {preview.nextRuns.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="cron-prompt"
              className="text-xs font-medium text-text-secondary"
            >
              Prompt
            </label>
            <Textarea
              id="cron-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Use /up:progresso e me envie um resumo do dia. Disponivel: {today}, {yesterday}, {now}."
              className="min-h-[120px] resize-y border-violet-dim bg-night-panel font-mono text-xs text-text-body focus-visible:ring-violet"
            />
            <div className="flex items-center justify-between">
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="text-xs text-violet underline hover:text-violet/80"
                    >
                      Skills disponiveis ({skills.length})
                    </button>
                  }
                />
                <PopoverContent
                  className="max-h-[60vh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto border-violet-dim bg-deep-space"
                  side="top"
                  align="start"
                >
                  <p className="mb-2 text-xs text-text-secondary">
                    Voce pode chamar qualquer uma destas no prompt (ex:
                    /up:progresso). Skills que dependem de input interativo
                    nao funcionam bem em cron.
                  </p>
                  <div className="flex flex-col gap-2">
                    {skills.length === 0 && (
                      <p className="text-xs text-text-secondary">
                        No skills found in ~/.claude/skills/
                      </p>
                    )}
                    {skills.map((s) => (
                      <div
                        key={s.source}
                        className="rounded-md border border-violet-dim bg-night-panel p-2"
                      >
                        <p className="font-mono text-xs text-text-primary">
                          {s.name}
                        </p>
                        {s.description && (
                          <p className="mt-0.5 text-[11px] text-text-secondary">
                            {s.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <span className="text-xs text-text-secondary">
                {prompt.length} chars
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Template vars: <span className="font-mono">{"{today}"}</span>{" "}
              <span className="font-mono">{"{yesterday}"}</span>{" "}
              <span className="font-mono">{"{now}"}</span>
            </p>
          </div>

          {/* Target topic */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="cron-target-topic"
              className="text-xs font-medium text-text-secondary"
            >
              Target topic
            </label>
            <select
              id="cron-target-topic"
              value={targetTopicId ?? ""}
              onChange={(e) =>
                setTargetTopicId(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="rounded-md border border-violet-dim bg-night-panel px-3 py-2 text-sm text-text-body focus:outline-none focus:ring-2 focus:ring-violet"
            >
              <option value="">Default (use harness default)</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (chat {t.chatId})
                </option>
              ))}
            </select>
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-2">
            <Switch
              id="cron-enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked)}
            />
            <label
              htmlFor="cron-enabled"
              className="cursor-pointer text-xs text-text-secondary"
            >
              Enabled
            </label>
          </div>

          {submitError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
              {submitError}
            </p>
          )}
        </div>

        <SheetFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1 border-violet-dim text-text-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSave}
              className="flex-1 bg-violet text-white hover:bg-violet/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create cron"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
