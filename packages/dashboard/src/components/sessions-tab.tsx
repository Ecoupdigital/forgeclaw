"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionSidebar } from "./session-sidebar";
import { ContextBar } from "./context-bar";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { KanbanBoard } from "./kanban-board";
import { useWebSocket, useChatSession } from "@/lib/ws-client";
import { mockPlans } from "@/lib/mock-data";
import type { Message } from "@/lib/types";

interface SessionData {
  id: string;
  topicId: number;
  projectDir: string | null;
  claudeSessionId: string | null;
  contextUsage: number;
  createdAt: number;
  updatedAt: number;
  // Enriched server-side via /api/sessions joining with the topics table.
  // Null if no matching row in `topics` (shouldn't happen after bug 688 fix
  // but defensive for historical data).
  topicName?: string | null;
  topicRowId?: number | null;
  chatId?: number | null;
  threadId?: number | null;
}

interface TopicData {
  id: number;
  threadId: number | null;
  chatId: number;
  name: string;
  projectDir: string | null;
  sessionId: string | null;
}

type ViewMode = "chat" | "kanban";

export function SessionsTab() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ws = useWebSocket();

  // Fetch sessions from API
  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        if (data.sessions) {
          setSessions(data.sessions);
          if (!selectedSessionId && data.sessions.length > 0) {
            setSelectedSessionId(data.sessions[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  // Fetch messages when session changes
  useEffect(() => {
    if (!selectedSessionId) return;
    const session = sessions.find((s) => s.id === selectedSessionId);
    if (!session) return;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/sessions?topicId=${session!.topicId}`);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    }
    fetchMessages();
    setLocalMessages([]);
  }, [selectedSessionId, sessions]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  );

  // Build sessionKey for WebSocket
  const sessionKey = selectedSessionId ?? null;

  const chat = useChatSession(sessionKey, ws);

  // Build sidebar items from sessions. Name resolution priority:
  //   1. topicName (from the topics table, enriched server-side)
  //   2. projectDir basename (legacy fallback for sessions linked to a project)
  //   3. generic "Session <id>" placeholder
  const sidebarTopics = useMemo(
    () =>
      sessions.map((s) => ({
        id: s.topicId,
        threadId: s.threadId ?? null,
        chatId: s.chatId ?? 0,
        name:
          s.topicName ??
          (s.projectDir
            ? s.projectDir.split("/").pop() ?? `Session ${s.id}`
            : `Session ${s.topicId}`),
        projectDir: s.projectDir,
        sessionId: s.id,
        createdAt: s.createdAt,
      })),
    [sessions]
  );

  const sidebarSessions = useMemo(
    () =>
      sessions.map((s) => ({
        ...s,
        id: s.id,
      })),
    [sessions]
  );

  // Stored messages sorted
  const storedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages]
  );

  // Remote messages mirrored live from Telegram via eventBus. Appended to the
  // transcript as they arrive. Cleared when the user switches sessions
  // (handled below via useEffect on selectedSessionId).
  const remoteForSession = useMemo(
    () =>
      sessionKey ? ws.remoteMessages.get(sessionKey) ?? [] : [],
    [sessionKey, ws.remoteMessages]
  );

  // When streaming message completes, add to local
  useEffect(() => {
    if (chat.streamingMessage?.done && chat.streamingMessage.content) {
      const msg: Message = {
        id: Date.now(),
        topicId: selectedSession?.topicId ?? 0,
        role: "assistant",
        content: chat.streamingMessage.content,
        createdAt: chat.streamingMessage.createdAt,
      };
      setLocalMessages((prev) => [...prev, msg]);
      chat.clearStreaming();
    }
  }, [chat.streamingMessage?.done]);

  const allMessages = useMemo(
    () => {
      // Merge stored (from DB), remote (live from Telegram via ws), and local
      // (typed here in this tab). Sort by createdAt to preserve chronological
      // order even when sources interleave. Duplicates are possible only
      // after a refetch — remote ids are negative so they don't collide with
      // stored positive DB ids, but the same content could appear twice
      // briefly. Dedupe by (role, content, createdAt) is overkill for now;
      // user can reload to collapse.
      const merged = [...storedMessages, ...remoteForSession, ...localMessages];
      return merged.sort((a, b) => a.createdAt - b.createdAt);
    },
    [storedMessages, remoteForSession, localMessages]
  );

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length, chat.streamingMessage?.content]);

  const handleSend = (message: string) => {
    const userMsg: Message = {
      id: Date.now(),
      topicId: selectedSession?.topicId ?? 0,
      role: "user",
      content: message,
      createdAt: Date.now(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);
    chat.send(message);
  };

  const handleSelectSession = useCallback((topicId: number) => {
    const session = sessions.find((s) => s.topicId === topicId);
    if (session) {
      setSelectedSessionId(session.id);
    }
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">Loading sessions...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <SessionSidebar
        topics={sidebarTopics}
        sessions={sidebarSessions}
        selectedTopicId={selectedSession?.topicId ?? null}
        onSelectTopic={handleSelectSession}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedSession ? (
          <>
            <div className="flex items-center justify-between border-b border-violet-dim bg-deep-space px-4">
              <div className="flex items-center gap-3">
                <ContextBar
                  topicName={
                    selectedSession.topicName ??
                    (selectedSession.projectDir
                      ? selectedSession.projectDir.split("/").pop() ?? "Session"
                      : `Session ${selectedSession.topicId}`)
                  }
                  contextUsage={selectedSession.contextUsage ?? 0}
                  sessionDuration={Date.now() - selectedSession.createdAt}
                />
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
                  size="sm"
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
                  size="sm"
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
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col">
                    {allMessages.length === 0 && !chat.streamingMessage && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 text-3xl text-text-secondary/30">/</div>
                        <p className="text-sm text-text-secondary">
                          No messages in this session
                        </p>
                        <p className="mt-1 text-xs text-text-secondary/60">
                          Send a message to start a conversation
                        </p>
                      </div>
                    )}
                    {allMessages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} />
                    ))}
                    {chat.streamingMessage && !chat.streamingMessage.done && (
                      <ChatMessage
                        message={{
                          id: -1,
                          topicId: selectedSession.topicId ?? 0,
                          role: "assistant",
                          content:
                            chat.streamingMessage.content ||
                            (chat.streamingMessage.thinking ? "Thinking..." : ""),
                          createdAt: chat.streamingMessage.createdAt,
                        }}
                        streaming={true}
                        tools={chat.streamingMessage.tools}
                      />
                    )}
                    <div ref={scrollRef} />
                  </div>
                </div>
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
                {sessions.length === 0
                  ? "No sessions yet. Send a message in Telegram to create one."
                  : "Select a session to view messages"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
