"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-violet-dim bg-deep-space">
      <div className="flex h-10 items-center px-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Topics
        </h2>
      </div>
      <Separator className="bg-violet-dim" />
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-1.5">
          {topics.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-text-secondary">
              No topics yet
            </div>
          )}
          {topics.map((topic) => {
            const isActive = activeSessionIds.has(topic.id);
            const isSelected = selectedTopicId === topic.id;

            return (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-deep-space ${
                  isSelected
                    ? "bg-violet/15 text-text-primary"
                    : "text-text-body hover:bg-night-panel hover:text-text-primary"
                }`}
                aria-current={isSelected ? "true" : undefined}
              >
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                    isActive ? "bg-emerald-500" : "bg-text-secondary/40"
                  }`}
                  aria-label={isActive ? "Active session" : "Inactive"}
                />
                <span className="truncate">
                  {topic.name ?? `Topic #${topic.id}`}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
