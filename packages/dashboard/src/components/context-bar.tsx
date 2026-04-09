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
      ? "bg-red-500"
      : contextUsage > 60
      ? "bg-amber-500"
      : "bg-violet";

  return (
    <div className="flex h-9 items-center gap-4 border-b border-violet-dim bg-deep-space px-4">
      <span className="text-sm font-medium text-text-primary truncate max-w-xs">
        {topicName}
      </span>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">Context:</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-text-body">
            {contextUsage}%
          </span>
          <div
            className="h-1.5 w-24 overflow-hidden rounded-full bg-night-panel"
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
        </div>
      </div>

      {sessionDuration !== null && (
        <span className="text-xs text-text-secondary">
          Session: {formatDuration(sessionDuration)}
        </span>
      )}
    </div>
  );
}
