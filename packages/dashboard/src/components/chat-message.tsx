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
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.split("\n");
      const lang = lines[0].replace("```", "").trim();
      const code = lines.slice(1, -1).join("\n");

      return (
        <pre
          key={i}
          className="my-2 overflow-x-auto rounded-md bg-night-panel p-3 font-mono text-xs leading-relaxed text-text-body"
        >
          {lang && (
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-text-secondary">
              {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // Inline code
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i}>
        {inlineParts.map((ip, j) => {
          if (ip.startsWith("`") && ip.endsWith("`")) {
            return (
              <code
                key={j}
                className="rounded bg-night-panel px-1 py-0.5 font-mono text-xs text-violet"
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
  // Use streaming tools if provided, otherwise detect from content
  const tools = streamTools && streamTools.length > 0
    ? streamTools
    : !isUser
    ? detectTools(message.content)
    : [];

  return (
    <div
      className={`group flex gap-3 px-4 py-3 transition-colors hover:bg-night-panel/30 ${
        isUser ? "" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
          isUser
            ? "bg-violet/20 text-violet"
            : "bg-emerald-500/20 text-emerald-400"
        }`}
        aria-hidden="true"
      >
        {isUser ? "U" : "C"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">
            {isUser ? "You" : "Claude"}
          </span>
          <span className="text-[10px] text-text-secondary font-mono">
            {formatTime(message.createdAt)}
          </span>
          {tools.length > 0 && (
            <div className="flex gap-1">
              {tools.map((tool) => (
                <Badge
                  key={tool}
                  variant="outline"
                  className="h-4 border-violet-dim bg-violet/10 px-1.5 text-[10px] text-violet"
                >
                  {tool}
                </Badge>
              ))}
            </div>
          )}
          {streaming && (
            <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
              streaming
            </span>
          )}
        </div>
        <div className="text-sm leading-relaxed text-text-body whitespace-pre-wrap">
          {renderContent(message.content)}
          {/* Blinking cursor for streaming messages */}
          {streaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-emerald-400 animate-pulse rounded-sm" />
          )}
        </div>
      </div>
    </div>
  );
}
