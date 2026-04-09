"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionSidebar } from "./session-sidebar";
import { ContextBar } from "./context-bar";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { KanbanBoard } from "./kanban-board";
import { useWebSocket, useChatSession } from "@/lib/ws-client";
import type { StreamingMessage } from "@/lib/ws-client";
import {
  mockTopics,
  mockSessions,
  mockMessages,
  mockPlans,
} from "@/lib/mock-data";
import type { Message } from "@/lib/types";

type ViewMode = "chat" | "kanban";

export function SessionsTab() {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(
    mockTopics[0]?.id ?? null
  );
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ws = useWebSocket();

  const selectedTopic = useMemo(
    () => mockTopics.find((t) => t.id === selectedTopicId) ?? null,
    [selectedTopicId]
  );

  const selectedSession = useMemo(
    () =>
      mockSessions.find((s) => s.topicId === selectedTopicId) ?? null,
    [selectedTopicId]
  );

  // Build sessionKey from topic
  const sessionKey = useMemo(() => {
    if (!selectedTopic) return null;
    return `${selectedTopic.chatId}:${selectedTopic.id}`;
  }, [selectedTopic]);

  const chat = useChatSession(sessionKey, ws);

  // Load stored messages from mock data initially
  const storedMessages = useMemo(
    () =>
      selectedTopicId
        ? mockMessages
            .filter((m) => m.topicId === selectedTopicId)
            .sort((a, b) => a.createdAt - b.createdAt)
        : [],
    [selectedTopicId]
  );

  // Reset local messages when topic changes
  useEffect(() => {
    setLocalMessages([]);
    chat.clearStreaming();
  }, [selectedTopicId]);

  // When streaming message completes, add it to local messages
  useEffect(() => {
    if (chat.streamingMessage?.done && chat.streamingMessage.content) {
      const msg: Message = {
        id: Date.now(),
        topicId: selectedTopicId ?? 0,
        role: "assistant",
        content: chat.streamingMessage.content,
        createdAt: chat.streamingMessage.createdAt,
      };
      setLocalMessages((prev) => [...prev, msg]);
      chat.clearStreaming();
    }
  }, [chat.streamingMessage?.done]);

  // All messages = stored + local
  const allMessages = useMemo(
    () => [...storedMessages, ...localMessages],
    [storedMessages, localMessages]
  );

  // Auto-scroll on new messages / streaming
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length, chat.streamingMessage?.content]);

  const handleSend = (message: string) => {
    // Add user message locally
    const userMsg: Message = {
      id: Date.now(),
      topicId: selectedTopicId ?? 0,
      role: "user",
      content: message,
      createdAt: Date.now(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);

    // Send via WebSocket
    chat.send(message);
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
            {/* Topic header with view toggle + WS status */}
            <div className="flex items-center justify-between border-b border-violet-dim bg-deep-space px-4">
              <div className="flex items-center gap-3">
                <ContextBar
                  topicName={selectedTopic.name ?? `Topic #${selectedTopic.id}`}
                  contextUsage={selectedSession?.contextUsage ?? 0}
                  sessionDuration={
                    selectedSession
                      ? Date.now() - selectedSession.createdAt
                      : null
                  }
                />
                {/* Connection indicator */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      chat.connected
                        ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]"
                        : "bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.5)]"
                    }`}
                  />
                  <span className="text-[10px] text-text-secondary font-mono">
                    {chat.connected ? "WS" : "OFF"}
                  </span>
                </div>
              </div>
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
                    {allMessages.length === 0 && !chat.streamingMessage && (
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
                    {allMessages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} />
                    ))}
                    {/* Streaming message (in-progress) */}
                    {chat.streamingMessage && !chat.streamingMessage.done && (
                      <ChatMessage
                        message={{
                          id: -1,
                          topicId: selectedTopicId ?? 0,
                          role: "assistant",
                          content: chat.streamingMessage.content || (chat.streamingMessage.thinking ? "Thinking..." : ""),
                          createdAt: chat.streamingMessage.createdAt,
                        }}
                        streaming={true}
                        tools={chat.streamingMessage.tools}
                      />
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
                <ChatInput
                  onSend={handleSend}
                  loading={chat.streaming}
                  disabled={!chat.connected}
                  onAbort={chat.abort}
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
