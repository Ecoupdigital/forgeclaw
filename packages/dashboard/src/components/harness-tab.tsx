"use client";

import { useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HarnessEditor } from "./harness-editor";
import { mockHarnessFiles } from "@/lib/mock-data";

export function HarnessTab() {
  const handleSave = useCallback(async (name: string, content: string) => {
    // Simulate saving
    await new Promise((r) => setTimeout(r, 800));
    console.log(`Saved ${name}:`, content.length, "chars");
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-text-primary">
            Harness Files
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            System prompt files that define ForgeClaw personality and context.
            Changes are applied immediately.
          </p>
        </div>

        {mockHarnessFiles.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-text-secondary">
              No harness files found
            </p>
            <p className="mt-1 text-xs text-text-secondary/60">
              Create files in ~/.forgeclaw/harness/
            </p>
          </div>
        )}

        {mockHarnessFiles.map((file) => (
          <HarnessEditor key={file.name} file={file} onSave={handleSave} />
        ))}
      </div>
    </ScrollArea>
  );
}
