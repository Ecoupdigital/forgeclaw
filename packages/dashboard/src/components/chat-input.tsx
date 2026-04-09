"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  loading?: boolean;
  onAbort?: () => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  loading = false,
  onAbort,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;
    onSend(trimmed);
    setValue("");
    textareaRef.current?.focus();
  }, [value, disabled, loading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="border-t border-violet-dim bg-deep-space p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex items-end gap-2"
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "WebSocket disconnected..." : "Type a message..."}
          disabled={disabled || loading}
          className="min-h-[40px] max-h-32 resize-none rounded-md border-violet-dim bg-night-panel text-sm text-text-body placeholder:text-text-secondary focus-visible:ring-violet"
          rows={1}
          aria-label="Message input"
        />
        {loading && onAbort ? (
          <Button
            type="button"
            onClick={onAbort}
            className="h-10 shrink-0 bg-red-600 text-white hover:bg-red-700"
            aria-label="Stop generation"
          >
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!value.trim() || disabled || loading}
            className="h-10 shrink-0 bg-violet text-white hover:bg-violet/90 disabled:opacity-40"
            aria-label="Send message"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending
              </span>
            ) : (
              "Send"
            )}
          </Button>
        )}
      </form>
    </div>
  );
}
