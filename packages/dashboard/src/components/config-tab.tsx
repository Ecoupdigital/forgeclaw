"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ForgeClawConfig } from "@/lib/types";
import { useModels } from "@/hooks/use-models";

interface ConfigFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number";
  disabled?: boolean;
  mono?: boolean;
  id: string;
}

function ConfigField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  mono = false,
  id,
}: ConfigFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="shrink-0 text-sm text-text-secondary">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`max-w-sm border-violet-dim bg-night-panel text-sm text-text-body focus-visible:ring-violet ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  id: string;
}

function SelectField({ label, value, onChange, options, id }: SelectFieldProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <label htmlFor={id} className="text-sm text-text-secondary">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-violet-dim bg-night-panel px-3 py-1.5 text-sm text-text-body focus:outline-none focus:ring-2 focus:ring-violet"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface EditableIdListProps {
  label: string;
  ids: number[];
  onChange: (ids: number[]) => void;
  minItems?: number;
}

function EditableIdList({ label, ids, onChange, minItems }: EditableIdListProps) {
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) return;
    if (ids.includes(parsed)) return; // no duplicates
    onChange([...ids, parsed]);
    setDraft('');
  };

  const handleRemove = (id: number) => {
    onChange(ids.filter((x) => x !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="py-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="mt-2 space-y-1.5">
        {ids.map((id) => (
          <div
            key={id}
            className="flex items-center justify-between rounded-md border border-violet-dim bg-night-panel px-3 py-1.5"
          >
            <span className="font-mono text-sm text-text-body">{id}</span>
            <button
              type="button"
              onClick={() => handleRemove(id)}
              disabled={minItems !== undefined && ids.length <= minItems}
              className={`ml-2 text-xs ${
                minItems !== undefined && ids.length <= minItems
                  ? 'text-text-secondary/30 cursor-not-allowed'
                  : 'text-red-400 hover:text-red-300'
              }`}
              aria-label={`Remove ${id}`}
            >
              Remove
            </button>
          </div>
        ))}
        {ids.length === 0 && (
          <span className="text-xs text-text-secondary/60 italic">
            No IDs configured
          </span>
        )}
        <div className="flex gap-2 pt-1">
          <Input
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Telegram user/group ID"
            className="max-w-[220px] border-violet-dim bg-night-panel text-sm font-mono text-text-body focus-visible:ring-violet"
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!draft || Number.isNaN(parseInt(draft, 10))}
            variant="outline"
            size="sm"
            className="border-violet-dim text-text-secondary hover:bg-violet/10 hover:text-text-body"
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConfigTab() {
  const [config, setConfig] = useState<ForgeClawConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [source, setSource] = useState<string>("unknown");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config);
        setSource(data.source);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const { models } = useModels();

  const updateField = useCallback(
    <K extends keyof ForgeClawConfig>(key: K, value: ForgeClawConfig[K]) => {
      setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [config]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        Loading config...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        Could not load configuration.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Header + Save */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">
              Configuration
            </h2>
            <Badge
              className={
                source === "core"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              }
            >
              {source === "core" ? "Live" : "Mock"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {status === "saved" && (
              <Badge className="bg-emerald-500/20 text-emerald-400">
                Saved
              </Badge>
            )}
            {status === "error" && (
              <Badge className="bg-red-500/20 text-red-400">Error</Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-violet text-white hover:bg-violet/90"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>

        {/* Claude Code */}
        <Card className="">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-text-primary">
              Claude Code
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <SelectField
              id="claudeModel"
              label="Model"
              value={config.claudeModel ?? "sonnet"}
              onChange={(v) => updateField("claudeModel", v || undefined)}
              options={
                models.length > 0
                  ? models.map((m) => ({
                      value: m.id,
                      label: `${m.label} — ${m.id}`,
                    }))
                  : [{ value: config.claudeModel ?? "sonnet", label: config.claudeModel ?? "sonnet" }]
              }
            />
            <Separator className="bg-white/[0.06]" />
            <ConfigField
              id="maxSessions"
              label="Max Concurrent Sessions"
              value={String(config.maxConcurrentSessions ?? 3)}
              onChange={(v) =>
                updateField("maxConcurrentSessions", parseInt(v) || 3)
              }
              type="number"
            />
            <Separator className="bg-white/[0.06]" />
            <SelectField
              id="defaultRuntime"
              label="Default Runtime"
              value={config.defaultRuntime ?? "claude-code"}
              onChange={(v) =>
                updateField(
                  "defaultRuntime",
                  v as "claude-code" | "codex"
                )
              }
              options={[
                { value: "claude-code", label: "Claude Code" },
                { value: "codex", label: "Codex" },
              ]}
            />
            <Separator className="bg-white/[0.06]" />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-text-secondary">
                Show Runtime Badge
              </span>
              <button
                type="button"
                onClick={() =>
                  updateField("showRuntimeBadge", !config.showRuntimeBadge)
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  config.showRuntimeBadge ? "bg-violet" : "bg-night-panel"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    config.showRuntimeBadge
                      ? "translate-x-4"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card className="">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-text-primary">
              Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ConfigField
              id="botToken"
              label="Bot Token"
              value={config.botToken}
              onChange={(v) => updateField("botToken", v)}
              type="password"
              mono
            />
            <Separator className="bg-white/[0.06]" />
            <EditableIdList
              label="Allowed Users"
              ids={config.allowedUsers}
              onChange={(ids) => {
                if (ids.length === 0) return; // prevent lockout — at least 1 user required
                updateField('allowedUsers', ids);
              }}
              minItems={1}
            />
            <Separator className="bg-white/[0.06]" />
            <EditableIdList
              label="Allowed Groups"
              ids={config.allowedGroups ?? []}
              onChange={(ids) => updateField('allowedGroups', ids)}
            />
          </CardContent>
        </Card>

        {/* Voice */}
        <Card className="">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-text-primary">
                Voice (STT)
              </CardTitle>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  config.voiceProvider && config.voiceProvider !== "none"
                    ? "bg-emerald-500"
                    : "bg-text-secondary/40"
                }`}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <SelectField
              id="voiceProvider"
              label="Provider"
              value={config.voiceProvider ?? "none"}
              onChange={(v) =>
                updateField(
                  "voiceProvider",
                  v as "groq" | "openai" | "none"
                )
              }
              options={[
                { value: "groq", label: "Groq (Whisper Large v3)" },
                { value: "openai", label: "OpenAI Whisper" },
                { value: "none", label: "Disabled" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Memory */}
        <Card className="">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-text-primary">
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <SelectField
              id="memoryReviewMode"
              label="Review Mode"
              value={config.memoryReviewMode ?? "hybrid"}
              onChange={(v) =>
                updateField(
                  "memoryReviewMode",
                  v as "auto" | "hybrid" | "review"
                )
              }
              options={[
                { value: "auto", label: "Auto (trust janitor)" },
                { value: "hybrid", label: "Hybrid (auto + review queue)" },
                { value: "review", label: "Manual (all to review)" },
              ]}
            />
            <Separator className="bg-white/[0.06]" />
            <ConfigField
              id="memoryThreshold"
              label="Auto-approve Threshold"
              value={String(config.memoryAutoApproveThreshold ?? 85)}
              onChange={(v) =>
                updateField(
                  "memoryAutoApproveThreshold",
                  Math.max(0, Math.min(100, parseInt(v) || 85))
                )
              }
              type="number"
            />
            <Separator className="bg-white/[0.06]" />
            <ConfigField
              id="vaultPath"
              label="Vault Path"
              value={config.vaultPath ?? ""}
              onChange={(v) => updateField("vaultPath", v || undefined)}
              mono
            />
          </CardContent>
        </Card>

        {/* Paths */}
        <Card className="">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-text-primary">
              Paths
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ConfigField
              id="workingDir"
              label="Working Directory"
              value={config.workingDir}
              onChange={(v) => updateField("workingDir", v)}
              mono
            />
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-text-primary">System</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Version</span>
                <span className="font-mono text-text-body">0.1.0</span>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Runtime</span>
                <span className="font-mono text-text-body">Bun</span>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Dashboard</span>
                <span className="font-mono text-text-body">
                  localhost:4040
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
