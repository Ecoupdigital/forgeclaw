"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import type {
  OnboardingMessageDTO,
  OnboardingStatus,
} from "@/lib/onboarding-types";

interface InterviewerChatProps {
  messages: OnboardingMessageDTO[];
  status: OnboardingStatus;
  currentQuestion: string | null;
  currentRationale: string | null;
  inFlight: boolean;
  onSend: (text: string) => Promise<void> | void;
  /** Error banner text. */
  error?: string | null;
  onRetry?: () => void;
}

export function InterviewerChat({
  messages,
  status,
  currentQuestion,
  currentRationale,
  inFlight,
  onSend,
  error,
  onRetry,
}: InterviewerChatProps) {
  const [draft, setDraft] = useState("");
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = status === "asking" && !inFlight && draft.trim().length > 0;
  const disabledInput = status === "done" || status === "aborted" || status === "error";

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, currentQuestion, status]);

  // Focus textarea when it becomes usable
  useEffect(() => {
    if (status === "asking" && !inFlight) {
      textareaRef.current?.focus();
    }
  }, [status, inFlight]);

  const submit = async () => {
    if (!canSend) return;
    const text = draft.trim();
    setDraft("");
    await onSend(text);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <section
      aria-label="Interviewer chat"
      className="flex h-full flex-col overflow-hidden border-r border-white/[0.06]"
    >
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-deep-space/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">Entrevistador</span>
          <StatusPill status={status} />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between border-b border-red-500/20 bg-red-500/10 px-4 py-2"
        >
          <span className="text-xs text-red-300">{error}</span>
          {onRetry && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRetry}
              className="h-6 px-2 text-xs text-red-300 hover:bg-red-500/20"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 px-4 py-4">
          {messages.length === 0 && status !== "thinking" && (
            <div className="py-8 text-center text-xs text-text-secondary">
              A entrevista vai comecar em instantes...
            </div>
          )}
          {messages.map((m) => (
            <Bubble key={m.index} role={m.role} text={m.text} />
          ))}
          {status === "thinking" && (
            <Bubble role="interviewer" text="" thinking />
          )}
          {status === "asking" && currentQuestion && (
            <Bubble
              role="interviewer"
              text={currentQuestion}
              rationale={currentRationale}
              accent
            />
          )}
          <div ref={scrollEndRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-white/[0.06] bg-deep-space/80 p-3 backdrop-blur-sm"
      >
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabledInput || inFlight}
          placeholder={
            disabledInput
              ? "Entrevista finalizada."
              : "Digite sua resposta. Enter envia, Shift+Enter quebra linha."
          }
          rows={2}
          className="min-h-[48px] flex-1 resize-none border-white/[0.08] bg-night-panel/60 text-sm focus-visible:border-violet/40 focus-visible:ring-violet/20"
          aria-label="Response to interviewer"
        />
        <Button
          type="submit"
          disabled={!canSend}
          className="h-[48px] gap-2 bg-accent text-white hover:bg-accent/90"
        >
          {inFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="text-xs font-medium">Enviar</span>
        </Button>
      </form>
    </section>
  );
}

function Bubble({
  role,
  text,
  rationale,
  thinking,
  accent,
}: {
  role: "interviewer" | "user";
  text: string;
  rationale?: string | null;
  thinking?: boolean;
  accent?: boolean;
}) {
  const isInterviewer = role === "interviewer";
  const base = "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed";
  const cls = isInterviewer
    ? accent
      ? `${base} self-start border border-violet/40 bg-violet/10 text-text-primary`
      : `${base} self-start bg-night-panel/60 text-text-secondary`
    : `${base} self-end bg-accent/20 text-text-primary`;

  return (
    <div className={cls} aria-label={`${role} message`}>
      {thinking ? (
        <span className="inline-flex items-center gap-2 text-text-disabled">
          <Loader2 className="h-3 w-3 animate-spin" />
          Pensando...
        </span>
      ) : (
        <>
          <p className="whitespace-pre-wrap">{text}</p>
          {rationale && (
            <p className="mt-1 text-[11px] italic text-text-disabled">
              {rationale}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: OnboardingStatus }) {
  const labelMap: Record<OnboardingStatus, { label: string; cls: string }> = {
    pending: { label: "pronto", cls: "bg-white/[0.06] text-text-secondary" },
    asking: { label: "aguardando", cls: "bg-emerald-500/20 text-emerald-300" },
    thinking: { label: "pensando", cls: "bg-violet/20 text-violet animate-pulse" },
    done: { label: "finalizado", cls: "bg-accent/20 text-accent" },
    aborted: { label: "abortado", cls: "bg-red-500/20 text-red-300" },
    error: { label: "erro", cls: "bg-red-500/20 text-red-300" },
  };
  const { label, cls } = labelMap[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${cls}`}>
      {label}
    </span>
  );
}
