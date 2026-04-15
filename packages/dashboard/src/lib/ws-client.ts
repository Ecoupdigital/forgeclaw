"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SessionInfo, Message } from "./types";

// --- Protocol types (mirror server) ---

interface StreamEvent {
  type: "thinking" | "text" | "tool_use" | "tool_result" | "done";
  data: Record<string, unknown>;
}

interface WsStreamMessage {
  type: "stream";
  sessionKey: string;
  event: StreamEvent;
}

interface WsSessionsMessage {
  type: "sessions";
  sessions: SessionInfo[];
}

interface WsErrorMessage {
  type: "error";
  message: string;
}

interface WsStatusMessage {
  type: "status";
  sessionKey: string;
  processing: boolean;
}

interface WsRemoteMessage {
  type: "remote_message";
  sessionKey: string;
  role: "user" | "assistant";
  content: string;
  origin: "telegram" | "dashboard";
  createdAt: number;
}

type WsServerMessage =
  | WsStreamMessage
  | WsSessionsMessage
  | WsErrorMessage
  | WsStatusMessage
  | WsRemoteMessage;

// --- Accumulated message from stream events ---

export interface StreamingMessage {
  role: "assistant";
  content: string;
  tools: string[];
  thinking: boolean;
  done: boolean;
  createdAt: number;
}

// --- useWebSocket hook ---

const WS_BASE_URL = "ws://localhost:4041";
const MAX_RECONNECT_DELAY = 30000;

/**
 * Fetch the WS auth token from the server.
 * The cookie is httpOnly so we cannot read it client-side; this endpoint
 * validates the cookie server-side and returns the raw token for WS use.
 */
async function getWsToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/ws-token");
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string | null };
    return data.token ?? null;
  } catch {
    return null;
  }
}

interface WebSocketState {
  send: (msg: Record<string, unknown>) => void;
  subscribe: (sessionKey: string) => void;
  unsubscribe: (sessionKey: string) => void;
  abort: (sessionKey: string) => void;
  listSessions: () => void;
  connected: boolean;
  sessions: SessionInfo[];
  streamingMessages: Map<string, StreamingMessage>;
  // Messages that originated in OTHER channels (Telegram) and got mirrored
  // here live via eventBus → ws-server broadcast. Keyed by sessionKey.
  // Each entry is an append-only list of the mirrored messages.
  remoteMessages: Map<string, Message[]>;
  clearRemoteMessages: (sessionKey: string) => void;
  processingKeys: Set<string>;
  lastError: string | null;
}

export function useWebSocket(): WebSocketState {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [streamingMessages, setStreamingMessages] = useState<
    Map<string, StreamingMessage>
  >(new Map());
  const [remoteMessages, setRemoteMessages] = useState<
    Map<string, Message[]>
  >(new Map());
  const [processingKeys, setProcessingKeys] = useState<Set<string>>(
    new Set()
  );
  const [lastError, setLastError] = useState<string | null>(null);

  // Monotonic fake id for remote messages. Real DB ids are not exposed via
  // the broadcast (they're async and the event is fired before the tx commit
  // propagates). Negative range so it never collides with DB-assigned ids.
  const remoteIdRef = useRef(-1);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Fetch token then open WS with it as query param
    getWsToken()
      .then((token) => {
        if (!mountedRef.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const wsUrl = new URL(WS_BASE_URL);
        if (token) {
          wsUrl.searchParams.set("token", token);
        }

        return wsUrl.toString();
      })
      .then((url) => {
        if (!url || !mountedRef.current) return;
        connectWithUrl(url);
      })
      .catch(() => {
        // Token fetch failed -- try without token (will fail if auth enabled)
        if (mountedRef.current) connectWithUrl(WS_BASE_URL);
      });
  }, []);

  const connectWithUrl = useCallback((url: string) => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setLastError(null);
        reconnectDelay.current = 1000;
        console.log("[ws-client] Connected");
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(
          delay * 2,
          MAX_RECONNECT_DELAY
        );
        console.log(`[ws-client] Disconnected, reconnecting in ${delay}ms`);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after this
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        let msg: WsServerMessage;
        try {
          msg = JSON.parse(event.data) as WsServerMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case "stream":
            handleStream(msg);
            break;

          case "sessions":
            setSessions(msg.sessions);
            break;

          case "error":
            setLastError(msg.message);
            break;

          case "status":
            setProcessingKeys((prev) => {
              const next = new Set(prev);
              if (msg.processing) {
                next.add(msg.sessionKey);
              } else {
                next.delete(msg.sessionKey);
              }
              return next;
            });
            break;

          case "remote_message": {
            setRemoteMessages((prev) => {
              const next = new Map(prev);
              const list = next.get(msg.sessionKey) ?? [];
              // Parse sessionKey "chatId:threadId" or "chatId" to derive topicId
              // for the Message type. Fallback to 0 for DMs.
              const parts = msg.sessionKey.split(":");
              const topicId =
                parts.length > 1 ? Number(parts[1]) || 0 : 0;
              const id = remoteIdRef.current--;
              const message: Message = {
                id,
                topicId,
                role: msg.role,
                content: msg.content,
                createdAt: msg.createdAt,
              };
              next.set(msg.sessionKey, [...list, message]);
              return next;
            });
            break;
          }
        }
      };

      wsRef.current = ws;
    } catch {
      // Will retry via reconnect
    }
  }, []);

  const handleStream = useCallback((msg: WsStreamMessage) => {
    const { sessionKey, event } = msg;

    setStreamingMessages((prev) => {
      const next = new Map(prev);
      const existing = next.get(sessionKey) ?? {
        role: "assistant" as const,
        content: "",
        tools: [],
        thinking: false,
        done: false,
        createdAt: Date.now(),
      };

      switch (event.type) {
        case "thinking":
          next.set(sessionKey, { ...existing, thinking: true });
          break;

        case "text":
          next.set(sessionKey, {
            ...existing,
            thinking: false,
            content: existing.content + ((event.data.text as string) ?? ""),
          });
          break;

        case "tool_use": {
          const toolName = (event.data.name as string) ?? "tool";
          const tools = existing.tools.includes(toolName)
            ? existing.tools
            : [...existing.tools, toolName];
          next.set(sessionKey, { ...existing, thinking: false, tools });
          break;
        }

        case "done":
          next.set(sessionKey, {
            ...existing,
            thinking: false,
            done: true,
          });
          break;

        default:
          break;
      }

      return next;
    });
  }, []);

  // Connect on mount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendRaw = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const subscribe = useCallback(
    (sessionKey: string) => {
      sendRaw({ type: "subscribe", sessionKey });
    },
    [sendRaw]
  );

  const unsubscribe = useCallback(
    (sessionKey: string) => {
      sendRaw({ type: "unsubscribe", sessionKey });
    },
    [sendRaw]
  );

  const abort = useCallback(
    (sessionKey: string) => {
      sendRaw({ type: "abort", sessionKey });
    },
    [sendRaw]
  );

  const listSessions = useCallback(() => {
    sendRaw({ type: "list_sessions" });
  }, [sendRaw]);

  const clearRemoteMessages = useCallback((sessionKey: string) => {
    setRemoteMessages((prev) => {
      if (!prev.has(sessionKey)) return prev;
      const next = new Map(prev);
      next.delete(sessionKey);
      return next;
    });
  }, []);

  return {
    send: sendRaw,
    subscribe,
    unsubscribe,
    abort,
    listSessions,
    connected,
    sessions,
    streamingMessages,
    remoteMessages,
    clearRemoteMessages,
    processingKeys,
    lastError,
  };
}

// --- useChatSession hook ---

interface ChatSessionState {
  send: (text: string) => void;
  abort: () => void;
  streamingMessage: StreamingMessage | null;
  streaming: boolean;
  connected: boolean;
  clearStreaming: () => void;
}

export function useChatSession(
  sessionKey: string | null,
  ws: WebSocketState
): ChatSessionState {
  // Subscribe/unsubscribe on sessionKey change
  useEffect(() => {
    if (!sessionKey || !ws.connected) return;
    ws.subscribe(sessionKey);
    return () => {
      ws.unsubscribe(sessionKey);
    };
  }, [sessionKey, ws.connected, ws.subscribe, ws.unsubscribe]);

  const send = useCallback(
    (text: string) => {
      if (!sessionKey) return;
      // Clear previous streaming message for this session
      ws.streamingMessages.delete(sessionKey);
      ws.send({ type: "send", sessionKey, message: text });
    },
    [sessionKey, ws.send, ws.streamingMessages]
  );

  const abort = useCallback(() => {
    if (!sessionKey) return;
    ws.abort(sessionKey);
  }, [sessionKey, ws.abort]);

  const streamingMessage = sessionKey
    ? ws.streamingMessages.get(sessionKey) ?? null
    : null;

  const streaming = sessionKey
    ? ws.processingKeys.has(sessionKey)
    : false;

  const clearStreaming = useCallback(() => {
    if (!sessionKey) return;
    ws.streamingMessages.delete(sessionKey);
  }, [sessionKey, ws.streamingMessages]);

  return {
    send,
    abort,
    streamingMessage,
    streaming,
    connected: ws.connected,
    clearStreaming,
  };
}
