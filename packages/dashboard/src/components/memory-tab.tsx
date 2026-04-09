"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  mockMemoryContent,
  mockDailyLogs,
  mockConfig,
} from "@/lib/mock-data";

export function MemoryTab() {
  const [memoryContent, setMemoryContent] = useState(mockMemoryContent);
  const [editingMemory, setEditingMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [savedMemory, setSavedMemory] = useState(false);

  const memoryLines = memoryContent.split("\n").length;
  const memoryEntries = memoryContent
    .split("\n")
    .filter((l) => l.trim().startsWith("-")).length;

  const handleSaveMemory = useCallback(async () => {
    setSavingMemory(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSavingMemory(false);
    setEditingMemory(false);
    setSavedMemory(true);
    setTimeout(() => setSavedMemory(false), 2000);
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* MEMORY.md Section */}
        <Card className="border-violet-dim bg-deep-space">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base text-text-primary">
                  MEMORY.md
                </CardTitle>
                <div className="flex gap-1.5">
                  <Badge
                    variant="outline"
                    className="h-5 border-violet-dim bg-violet/10 px-2 text-[10px] text-text-secondary"
                  >
                    {memoryLines} lines
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-5 border-violet-dim bg-violet/10 px-2 text-[10px] text-text-secondary"
                  >
                    {memoryEntries} entries
                  </Badge>
                  {savedMemory && (
                    <Badge className="h-5 bg-emerald-500/20 px-2 text-[10px] text-emerald-400">
                      Saved
                    </Badge>
                  )}
                </div>
              </div>
              {editingMemory ? (
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setMemoryContent(mockMemoryContent);
                      setEditingMemory(false);
                    }}
                    disabled={savingMemory}
                    className="border-violet-dim text-text-secondary hover:text-text-body"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleSaveMemory}
                    disabled={savingMemory}
                    className="bg-violet text-white hover:bg-violet/90"
                  >
                    {savingMemory ? (
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
                  onClick={() => setEditingMemory(true)}
                  className="border-violet-dim text-violet hover:bg-violet/10"
                >
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {editingMemory ? (
              <Textarea
                value={memoryContent}
                onChange={(e) => setMemoryContent(e.target.value)}
                disabled={savingMemory}
                className="min-h-[300px] resize-y rounded-md border-violet-dim bg-night-panel font-mono text-xs leading-relaxed text-text-body focus-visible:ring-violet"
                aria-label="Edit MEMORY.md"
              />
            ) : (
              <pre className="max-h-80 overflow-auto rounded-md bg-night-panel p-4 font-mono text-xs leading-relaxed text-text-body whitespace-pre-wrap">
                {memoryContent}
              </pre>
            )}
          </CardContent>
        </Card>

        {/* Daily Logs Section */}
        <Card className="border-violet-dim bg-deep-space">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base text-text-primary">
              Daily Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {mockDailyLogs.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-secondary">
                No daily logs yet
              </p>
            ) : (
              <div className="space-y-1">
                {mockDailyLogs.map((log) => (
                  <div
                    key={log.date}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-night-panel"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-text-primary">
                        {log.date}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-5 border-violet-dim bg-violet/10 px-2 text-[10px] text-text-secondary"
                      >
                        {log.entries} entries
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-text-secondary hover:text-text-body"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vault Section */}
        <Card className="border-violet-dim bg-deep-space">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base text-text-primary">
              Vault
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      mockConfig.vaultPath
                        ? "bg-emerald-500"
                        : "bg-text-secondary/40"
                    }`}
                  />
                  <span className="text-text-body">
                    {mockConfig.vaultPath ? "Connected" : "Not configured"}
                  </span>
                </div>
              </div>
              {mockConfig.vaultPath && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Path</span>
                  <span className="font-mono text-xs text-text-body">
                    {mockConfig.vaultPath}
                  </span>
                </div>
              )}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!mockConfig.vaultPath}
                  className="border-violet-dim text-violet hover:bg-violet/10 disabled:opacity-40"
                >
                  Explore Vault
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
