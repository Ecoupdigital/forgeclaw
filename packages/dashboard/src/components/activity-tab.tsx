"use client";

import { useState, useEffect, useCallback } from "react";
import type { Activity, ActivityEntityType } from "@/lib/types";

const ENTITY_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "session", label: "Sessoes" },
  { value: "cron", label: "Crons" },
  { value: "message", label: "Mensagens" },
  { value: "memory", label: "Memoria" },
  { value: "webhook", label: "Webhooks" },
];

const ACTIVITY_ICONS: Record<string, string> = {
  "session:created": ">>",
  "session:resumed": "->",
  "message:sent": "<<",
  "message:received": ">>",
  "cron:fired": "**",
  "cron:completed": "OK",
  "cron:failed": "!!",
  "memory:created": "++",
  "memory:updated": "~~",
  "webhook:delivered": "->",
  "webhook:failed": "!!",
};

const ACTIVITY_COLORS: Record<string, string> = {
  "session:created": "text-blue-400",
  "session:resumed": "text-blue-300",
  "message:sent": "text-text-body",
  "message:received": "text-emerald-400",
  "cron:fired": "text-amber-400",
  "cron:completed": "text-emerald-400",
  "cron:failed": "text-red-400",
  "memory:created": "text-violet",
  "memory:updated": "text-violet/70",
  "webhook:delivered": "text-emerald-400",
  "webhook:failed": "text-red-400",
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s atras`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}

export function ActivityTab() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (filter !== "all") params.set("entityType", filter);
      const res = await fetch(`/api/activities?${params}`);
      const data = await res.json();
      setActivities(data.activities ?? []);
    } catch (err) {
      console.error("[activity-tab] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchActivities();

    // Auto-refresh every 10s
    const interval = setInterval(fetchActivities, 10_000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with filters */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <h2 className="text-sm font-medium text-text-body">Feed de Atividades</h2>
        <div className="flex gap-1">
          {ENTITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                filter === f.value
                  ? "bg-violet/15 text-violet"
                  : "text-text-secondary hover:bg-white/[0.04] hover:text-text-body"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-text-secondary">
            Carregando atividades...
          </div>
        ) : activities.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-text-secondary">
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Icon */}
                <div
                  className={`mt-0.5 font-mono text-[10px] font-bold ${
                    ACTIVITY_COLORS[activity.type] ?? "text-text-secondary"
                  }`}
                >
                  {ACTIVITY_ICONS[activity.type] ?? ".."}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-body truncate">
                      {activity.description}
                    </span>
                    <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-secondary">
                      {activity.entityType}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-secondary">
                    <span className="font-mono">{activity.entityId}</span>
                    <span>por {activity.actor}</span>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="shrink-0 text-[10px] text-text-secondary">
                  {timeAgo(activity.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
