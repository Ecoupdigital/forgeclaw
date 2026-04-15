"use client";

import { Badge } from "@/components/ui/badge";
import type { Message } from "@/lib/types";

interface ChatMessageProps {
  message: Message;
  streaming?: boolean;
  tools?: string[];
}

const TOOL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bRead\b/, label: "Read" },
  { pattern: /\bEdit\b/, label: "Edit" },
  { pattern: /\bBash\b/, label: "Bash" },
  { pattern: /\bGlob\b/, label: "Glob" },
  { pattern: /\bGrep\b/, label: "Grep" },
  { pattern: /\bWrite\b/, label: "Write" },
];

function detectTools(content: string): string[] {
  return TOOL_PATTERNS.filter((t) => t.pattern.test(content)).map(
    (t) => t.label
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.split("\n");
      const lang = lines[0].replace("```", "").trim();
      const code = lines.slice(1, -1).join("\n");

      return (
        <pre
          key={i}
          className="my-2 overflow-x-auto rounded-md bg-void/60 border border-white/[0.06] p-3 font-mono text-xs leading-relaxed text-text-body"
        >
          {lang && (
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-text-disabled">
              // {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i}>
        {inlineParts.map((ip, j) => {
          if (ip.startsWith("`") && ip.endsWith("`")) {
            return (
              <code
                key={j}
                className="rounded bg-violet/10 px-1 py-0.5 font-mono text-xs text-violet"
              >
                {ip.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{ip}</span>;
        })}
      </span>
    );
  });
}

export function ChatMessage({ message, streaming = false, tools: streamTools }: ChatMessageProps) {
  const isUser = message.role === "user";
  const tools = streamTools && streamTools.length > 0
    ? streamTools
    : !isUser
    ? detectTools(message.content)
    : [];

  if (isUser) {
    return (
      <div className="group flex justify-end px-4 py-2">
        <div className="max-w-[70%]">
          <div className="rounded-2xl rounded-br-md bg-violet/15 border border-violet/20 px-4 py-2.5">
            <div className="text-sm leading-relaxed text-text-body whitespace-pre-wrap">
              {renderContent(message.content)}
            </div>
          </div>
          <div className="mt-1 flex justify-end px-1">
            <span className="font-mono text-[10px] text-text-disabled">
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group px-4 py-3">
      <div className="max-w-[85%]">
        {/* Header */}
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/15">
            <span className="font-mono text-[10px] font-semibold text-emerald-400">C</span>
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            {formatTime(message.createdAt)}
          </span>
          {tools.length > 0 && (
            <div className="flex gap-1">
              {tools.map((tool) => (
                <Badge
                  key={tool}
                  variant="outline"
                  className="h-4 border-white/[0.06] bg-white/[0.03] px-1.5 text-[10px] text-text-secondary"
                >
                  {tool}
                </Badge>
              ))}
            </div>
          )}
          {streaming && (
            <span className="font-mono text-[10px] text-emerald-400 animate-pulse">
              ▸ streaming
            </span>
          )}
        </div>
        {/* Body */}
        <div className="text-sm leading-relaxed text-text-body whitespace-pre-wrap">
          {renderContent(message.content)}
          {streaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-violet animate-pulse rounded-sm" />
          )}
        </div>
      </div>
    </div>
  );
}
