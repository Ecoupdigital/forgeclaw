"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionSidebar } from "./session-sidebar";
import { ContextBar } from "./context-bar";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { Search, X, Loader2, MessageSquare } from "lucide-react";
import { useWebSocket, useChatSession } from "@/lib/ws-client";
import type { Message } from "@/lib/types";

// --- Search result type (mirrors API response) ---

interface MessageSearchResult {
  messageId: number;
  topicId: number;
  topicName: string | null;
  role: string;
  content: string;
  createdAt: number;
  rank: number;
}

// --- Search hook with debounce ---

function useMessageSearch(debounceMs: number = 300) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }

    setSearching(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      // Abort previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/messages/search?q=${encodeURIComponent(trimmed)}&limit=30`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Search failed" }));
          setError(data.error ?? "Search failed");
          setResults([]);
        } else {
          const data = await res.json();
          setResults(data.results ?? []);
          setError(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Search request failed");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs]);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setSearching(false);
  }, []);

  return { query, setQuery, results, searching, error, clear };
}

// --- Helpers ---

function highlightSnippet(content: string, query: string, maxLen: number = 160): string {
  const lower = content.toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  // Find the first matching token position to center the snippet
  let bestIdx = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  let start = 0;
  if (bestIdx > maxLen / 3) {
    start = Math.max(0, bestIdx - Math.floor(maxLen / 3));
  }
  let snippet = content.slice(start, start + maxLen);
  if (start > 0) snippet = "..." + snippet;
  if (start + maxLen < content.length) snippet = snippet + "...";

  return snippet;
}

function formatSearchDate(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

type ViewMode = "chat";

export function SessionsTab() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [viewMode] = useState<ViewMode>("chat");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ws = useWebSocket();
  const search = useMessageSearch();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchActive = search.query.trim().length > 0;

  // Navigate to a topic from search results
  const handleSearchResultClick = useCallback(
    (topicId: number) => {
      const session = sessions.find((s) => s.topicId === topicId);
      if (session) {
        setSelectedSessionId(session.id);
      }
      search.clear();
    },
    [sessions, search],
  );

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
        <p className="text-sm text-text-secondary">Carregando sessões...</p>
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
        {/* Global message search bar */}
        <div className="relative border-b border-white/[0.06] bg-deep-space/80 backdrop-blur-sm px-4 py-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-disabled"
              aria-hidden="true"
            />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search all messages..."
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              className="h-8 pl-8 pr-8 bg-night-panel/60 border-white/[0.06] text-xs placeholder:text-text-disabled focus-visible:border-violet/40 focus-visible:ring-violet/20"
              aria-label="Search messages across all sessions"
            />
            {search.query && (
              <button
                onClick={search.clear}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-disabled hover:text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {isSearchActive && (
            <div className="absolute left-0 right-0 top-full z-50 mx-4 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-white/[0.06] bg-deep-space shadow-2xl shadow-black/40">
              {search.searching && (
                <div className="flex items-center gap-2 px-4 py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-violet" />
                  <span className="text-xs text-text-secondary">Searching...</span>
                </div>
              )}

              {search.error && !search.searching && (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-red-400">{search.error}</p>
                </div>
              )}

              {!search.searching && !search.error && search.results.length === 0 && search.query.trim().length >= 2 && (
                <div className="flex flex-col items-center gap-1 px-4 py-6 text-center">
                  <MessageSquare className="h-5 w-5 text-text-disabled" />
                  <p className="text-xs text-text-secondary">No messages found for &quot;{search.query.trim()}&quot;</p>
                </div>
              )}

              {!search.searching && search.results.length > 0 && (
                <div className="flex flex-col py-1">
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-text-disabled">
                      {search.results.length} result{search.results.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {search.results.map((result) => (
                    <button
                      key={result.messageId}
                      onClick={() => handleSearchResultClick(result.topicId)}
                      className="group flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                            result.role === "user" ? "bg-code-blue" : "bg-violet"
                          }`}
                        />
                        <span className="truncate text-xs font-medium text-text-primary">
                          {result.topicName ?? `Topic #${result.topicId}`}
                        </span>
                        <span className="ml-auto shrink-0 text-[10px] text-text-disabled font-mono">
                          {formatSearchDate(result.createdAt)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-text-secondary pl-3.5 leading-relaxed">
                        {highlightSnippet(result.content, search.query)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedSession ? (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-deep-space/80 backdrop-blur-sm px-4">
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
            </div>

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
