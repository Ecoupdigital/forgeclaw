"use client";

interface ContextBarProps {
  topicName: string;
  contextUsage: number;
  sessionDuration: number | null;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function ContextBar({
  topicName,
  contextUsage,
  sessionDuration,
}: ContextBarProps) {
  const barWidth = Math.min(Math.max(contextUsage, 0), 100);
  const barColor =
    contextUsage > 80
      ? "bg-[#F87171]"
      : contextUsage > 60
      ? "bg-[#F6C86C]"
      : "bg-violet";

  const statusChar = contextUsage > 80 ? "!" : contextUsage > 0 ? "▸" : "○";

  return (
    <div className="flex h-9 items-center gap-4 px-4">
      <span className="font-mono text-xs text-text-body truncate max-w-xs">
        {topicName.toLowerCase()}
      </span>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-text-disabled">{statusChar}</span>
        <div className="flex items-center gap-1.5">
          <div
            className="h-1 w-20 overflow-hidden rounded-full bg-white/[0.06]"
            role="progressbar"
            aria-valuenow={contextUsage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Context usage: ${contextUsage}%`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            {contextUsage}%
          </span>
        </div>
      </div>

      {sessionDuration !== null && (
        <span className="font-mono text-[10px] text-text-disabled">
          {formatDuration(sessionDuration)}
        </span>
      )}
    </div>
  );
}
