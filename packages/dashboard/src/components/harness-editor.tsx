"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { HarnessFile } from "@/lib/types";

interface HarnessEditorProps {
  file: HarnessFile;
  onSave: (name: string, content: string) => Promise<void>;
}

export function HarnessEditor({ file, onSave }: HarnessEditorProps) {
  const [content, setContent] = useState(file.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = content !== file.content;

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(file.name, content);
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handling would show a toast in production
    } finally {
      setIsSaving(false);
    }
  }, [file.name, content, onSave]);

  const handleCancel = useCallback(() => {
    setContent(file.content);
    setIsEditing(false);
  }, [file.content]);

  const lineCount = content.split("\n").length;

  return (
    <Card className="border-violet-dim bg-deep-space transition-colors hover:border-violet-glow">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="font-mono text-sm text-text-primary">
              {file.name}
            </CardTitle>
            <Badge
              variant="outline"
              className="h-4 border-violet-dim bg-violet/10 px-1.5 text-[10px] text-text-secondary"
            >
              {lineCount} linhas
            </Badge>
            {saved && (
              <Badge className="h-4 bg-emerald-500/20 px-1.5 text-[10px] text-emerald-400">
                Salvo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="border-violet-dim text-text-secondary hover:text-text-body hover:bg-night-panel"
                >
                  Cancelar
                </Button>
                <Button
                  size="xs"
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="bg-violet text-white hover:bg-violet/90 disabled:opacity-40"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Salvando
                    </span>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsEditing(true)}
                className="border-violet-dim text-violet hover:bg-violet/10"
              >
                Editar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSaving}
            className="min-h-[200px] resize-y rounded-md border-violet-dim bg-night-panel font-mono text-xs leading-relaxed text-text-body placeholder:text-text-secondary focus-visible:ring-violet"
            aria-label={`Edit ${file.name}`}
          />
        ) : (
          <pre className="max-h-48 overflow-auto rounded-md bg-night-panel p-3 font-mono text-xs leading-relaxed text-text-body">
            {content}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
