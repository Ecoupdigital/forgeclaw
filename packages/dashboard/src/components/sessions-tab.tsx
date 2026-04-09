"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionSidebar } from "./session-sidebar";
import { ContextBar } from "./context-bar";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { KanbanBoard } from "./kanban-board";
import {
  mockTopics,
  mockSessions,
  mockMessages,
  mockPlans,
} from "@/lib/mock-data";

type ViewMode = "chat" | "kanban";

export function SessionsTab() {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(
    mockTopics[0]?.id ?? null
  );
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [sending, setSending] = useState(false);

  const selectedTopic = useMemo(
    () => mockTopics.find((t) => t.id === selectedTopicId) ?? null,
    [selectedTopicId]
  );

  const selectedSession = useMemo(
    () =>
      mockSessions.find((s) => s.topicId === selectedTopicId) ?? null,
    [selectedTopicId]
  );

  const messages = useMemo(
    () =>
      selectedTopicId
        ? mockMessages
            .filter((m) => m.topicId === selectedTopicId)
            .sort((a, b) => a.createdAt - b.createdAt)
        : [],
    [selectedTopicId]
  );

  const handleSend = (message: string) => {
    setSending(true);
    // Simulate sending
    setTimeout(() => setSending(false), 1500);
    console.log("Sending:", message);
  };

  return (
    <div className="flex h-full">
      <SessionSidebar
        topics={mockTopics}
        sessions={mockSessions}
        selectedTopicId={selectedTopicId}
        onSelectTopic={setSelectedTopicId}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedTopic ? (
          <>
            {/* Topic header with view toggle */}
            <div className="flex items-center justify-between border-b border-violet-dim bg-deep-space px-4">
              <ContextBar
                topicName={selectedTopic.name ?? `Topic #${selectedTopic.id}`}
                contextUsage={selectedSession?.contextUsage ?? 0}
                sessionDuration={
                  selectedSession
                    ? Date.now() - selectedSession.createdAt
                    : null
                }
              />
              <div className="flex items-center gap-1 pr-2">
                <Button
                  variant={viewMode === "chat" ? "default" : "ghost"}
                  size="xs"
                  onClick={() => setViewMode("chat")}
                  className={
                    viewMode === "chat"
                      ? "bg-violet text-white"
                      : "text-text-secondary hover:text-text-body"
                  }
                >
                  Chat
                </Button>
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="xs"
                  onClick={() => setViewMode("kanban")}
                  className={
                    viewMode === "kanban"
                      ? "bg-violet text-white"
                      : "text-text-secondary hover:text-text-body"
                  }
                >
                  Kanban
                </Button>
              </div>
            </div>

            {viewMode === "chat" ? (
              <>
                <ScrollArea className="flex-1">
                  <div className="flex flex-col">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 text-3xl text-text-secondary/30">
                          /
                        </div>
                        <p className="text-sm text-text-secondary">
                          No messages in this topic
                        </p>
                        <p className="mt-1 text-xs text-text-secondary/60">
                          Send a message to start a conversation
                        </p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} />
                    ))}
                  </div>
                </ScrollArea>
                <ChatInput
                  onSend={handleSend}
                  loading={sending}
                  disabled={!selectedSession}
                />
              </>
            ) : (
              <KanbanBoard plans={mockPlans} />
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-3 font-mono text-4xl text-violet/20">FC</div>
              <p className="text-sm text-text-secondary">
                Select a topic to view messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
