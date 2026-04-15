"use client";

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

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r border-white/[0.06] bg-deep-space">
      <div className="flex h-10 items-center px-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
          // topics
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-1.5">
          {topics.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-text-disabled">
              no topics yet
            </div>
          )}
          {topics.map((topic) => {
            const isActive = activeSessionIds.has(topic.id);
            const isSelected = selectedTopicId === topic.id;

            return (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                className={`group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet ${
                  isSelected
                    ? "bg-violet/10 text-text-primary border border-violet-dim"
                    : "text-text-body border border-transparent hover:bg-white/[0.03] hover:text-text-primary"
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
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
