"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { mockConfig } from "@/lib/mock-data";
import type { ForgeClawConfig } from "@/lib/types";

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

export function ConfigTab() {
  const [config, setConfig] = useState<ForgeClawConfig>(mockConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateField = useCallback(
    <K extends keyof ForgeClawConfig>(key: K, value: ForgeClawConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Save button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            Configuration
          </h2>
          <div className="flex items-center gap-2">
            {saved && (
              <Badge className="bg-emerald-500/20 text-emerald-400">
                Saved
              </Badge>
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
        <Card className="border-violet-dim bg-deep-space">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-text-primary">
                Claude Code
              </CardTitle>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ConfigField
              id="claudeModel"
              label="Model"
              value={config.claudeModel ?? ""}
              onChange={(v) => updateField("claudeModel", v)}
              mono
            />
            <Separator className="bg-violet-dim" />
            <ConfigField
              id="maxSessions"
              label="Max Concurrent Sessions"
              value={String(config.maxConcurrentSessions ?? 3)}
              onChange={(v) =>
                updateField("maxConcurrentSessions", parseInt(v) || 3)
              }
              type="number"
            />
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card className="border-violet-dim bg-deep-space">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-text-primary">
                Telegram
              </CardTitle>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </div>
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
            <Separator className="bg-violet-dim" />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-text-secondary">
                Allowed Users
              </span>
              <span className="font-mono text-sm text-text-body">
                {config.allowedUsers.join(", ")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card className="border-violet-dim bg-deep-space">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-text-primary">
                Memory
              </CardTitle>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ConfigField
              id="vaultPath"
              label="Vault Path"
              value={config.vaultPath ?? ""}
              onChange={(v) => updateField("vaultPath", v || undefined)}
              mono
            />
            <Separator className="bg-violet-dim" />
            <ConfigField
              id="workingDir"
              label="Working Directory"
              value={config.workingDir}
              onChange={(v) => updateField("workingDir", v)}
              mono
            />
          </CardContent>
        </Card>

        {/* Voice */}
        <Card className="border-violet-dim bg-deep-space">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-text-primary">
                Voice
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
            <div className="flex items-center justify-between py-2">
              <label htmlFor="voiceProvider" className="text-sm text-text-secondary">
                Provider
              </label>
              <select
                id="voiceProvider"
                value={config.voiceProvider ?? "none"}
                onChange={(e) =>
                  updateField(
                    "voiceProvider",
                    e.target.value as "openai" | "google" | "none"
                  )
                }
                className="rounded-md border border-violet-dim bg-night-panel px-3 py-1.5 text-sm text-text-body focus:outline-none focus:ring-2 focus:ring-violet"
              >
                <option value="none">None</option>
                <option value="openai">OpenAI Whisper</option>
                <option value="google">Google Speech</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="border-violet-dim bg-deep-space">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-text-primary">System</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Version</span>
                <span className="font-mono text-text-body">0.1.0</span>
              </div>
              <Separator className="bg-violet-dim" />
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Runtime</span>
                <span className="font-mono text-text-body">Bun</span>
              </div>
              <Separator className="bg-violet-dim" />
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
