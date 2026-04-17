"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TopicInfo, SessionInfo } from "@/lib/types";

interface SessionSidebarProps {
  topics: TopicInfo[];
  sessions: SessionInfo[];
  selectedTopicId: number | null;
  onSelectTopic: (topicId: number) => void;
}

export function SessionSidebar({
  topics,
  sessions,
  selectedTopicId,
  onSelectTopic,
}: SessionSidebarProps) {
  const activeSessionIds = new Set(
    sessions.filter((s) => s.claudeSessionId).map((s) => s.topicId)
  );

  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([]);
  const [topicAgents, setTopicAgents] = useState<Record<number, number | null>>({});

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        if (data.agents) {
          setAgents(data.agents.map((a: { id: number; name: string }) => ({ id: a.id, name: a.name })));
        }
      })
      .catch(() => {});
  }, []);

  // Initialize topicAgents from props
  useEffect(() => {
    const map: Record<number, number | null> = {};
    for (const t of topics) {
      map[t.id] = t.agentId ?? null;
    }
    setTopicAgents(map);
  }, [topics]);

  const handleAgentChange = useCallback(async (topicId: number, agentId: number | null) => {
    setTopicAgents((prev) => ({ ...prev, [topicId]: agentId }));
    try {
      await fetch(`/api/topics/${topicId}/agent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
    } catch (err) {
      console.error("Failed to update topic agent:", err);
    }
  }, []);

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r border-white/[0.06] bg-deep-space">
      <div className="flex h-10 items-center px-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
          // tópicos
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-1.5">
          {topics.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-text-disabled">
              nenhum tópico ainda
            </div>
          )}
          {topics.map((topic) => {
            const isActive = activeSessionIds.has(topic.id);
            const isSelected = selectedTopicId === topic.id;

            return (
              <div
                key={topic.id}
                className={`group rounded-md transition-all duration-150 ${
                  isSelected
                    ? "bg-violet/10 border border-violet-dim"
                    : "border border-transparent hover:bg-white/[0.03]"
                }`}
              >
                <button
                  onClick={() => onSelectTopic(topic.id)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet ${
                    isSelected
                      ? "text-text-primary"
                      : "text-text-body hover:text-text-primary"
                  }`}
                  aria-current={isSelected ? "true" : undefined}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                      isActive
                        ? "bg-emerald-500 shadow-[0_0_4px_rgba(74,222,128,0.4)]"
                        : "bg-text-disabled"
                    }`}
                  />
                  <span className="truncate text-xs">
                    {topic.name ?? `topic #${topic.id}`}
                  </span>
                </button>
                {agents.length > 0 && (
                  <div className="px-3 pb-1.5">
                    <select
                      value={topicAgents[topic.id] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        handleAgentChange(topic.id, val);
                      }}
                      className="h-5 w-full rounded border border-white/[0.06] bg-night-panel/60 px-1 text-[10px] text-text-secondary"
                      aria-label="Agente vinculado"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Sem agente</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
