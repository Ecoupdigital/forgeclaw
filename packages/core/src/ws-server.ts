import type { ServerWebSocket } from 'bun';
import { ClaudeRunner } from './claude-runner';
import { sessionManager } from './session-manager';
import { stateStore } from './state-store';
import { eventBus } from './event-bus';
import { cronEngine } from './cron-engine';
import type { StreamEvent, SessionInfo } from './types';

const WS_PORT = 4041;

// --- Protocol types ---

interface WsSendMessage {
  type: 'send';
  sessionKey: string;
  message: string;
}

interface WsSubscribeMessage {
  type: 'subscribe';
  sessionKey: string;
}

interface WsUnsubscribeMessage {
  type: 'unsubscribe';
  sessionKey: string;
}

interface WsAbortMessage {
  type: 'abort';
  sessionKey: string;
}

interface WsListSessionsMessage {
  type: 'list_sessions';
}

type WsClientMessage =
  | WsSendMessage
  | WsSubscribeMessage
  | WsUnsubscribeMessage
  | WsAbortMessage
  | WsListSessionsMessage;

interface WsStreamResponse {
  type: 'stream';
  sessionKey: string;
  event: StreamEvent;
}

interface WsSessionsResponse {
  type: 'sessions';
  sessions: SessionInfo[];
}

interface WsErrorResponse {
  type: 'error';
  message: string;
}

interface WsStatusResponse {
  type: 'status';
  sessionKey: string;
  processing: boolean;
}

type WsServerMessage = WsStreamResponse | WsSessionsResponse | WsErrorResponse | WsStatusResponse;

// --- State ---

type WsSocket = ServerWebSocket<{ id: string }>;

const subscriptions = new Map<WsSocket, Set<string>>();
const activeRunners = new Map<string, ClaudeRunner>();

// --- Helpers ---

function send(ws: WsSocket, msg: WsServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // client disconnected
  }
}

function broadcastToSubscribers(sessionKey: string, msg: WsServerMessage): void {
  for (const [ws, subs] of subscriptions) {
    if (subs.has(sessionKey)) {
      send(ws, msg);
    }
  }
}

export function broadcastToSession(sessionKey: string, data: WsServerMessage): void {
  broadcastToSubscribers(sessionKey, data);
}

function parseSessionKey(key: string): { chatId: number; topicId: number | null } {
  const parts = key.split(':');
  const chatId = parseInt(parts[0], 10);
  const topicId = parts.length > 1 ? parseInt(parts[1], 10) : null;
  // topicId 0 means no topic
  return { chatId, topicId: topicId === 0 ? null : topicId };
}

// --- Message handlers ---

async function handleSend(ws: WsSocket, msg: WsSendMessage): Promise<void> {
  const { sessionKey, message } = msg;

  if (!sessionKey || !message) {
    send(ws, { type: 'error', message: 'Missing sessionKey or message' });
    return;
  }

  // Ensure this client is subscribed
  const subs = subscriptions.get(ws);
  if (subs) subs.add(sessionKey);

  // Check if already processing
  if (activeRunners.has(sessionKey)) {
    send(ws, { type: 'error', message: `Session ${sessionKey} is already processing` });
    return;
  }

  const { chatId, topicId } = parseSessionKey(sessionKey);

  // Get or create session
  const session = await sessionManager.getOrCreateSession(chatId, topicId);

  // Save user message
  stateStore.createMessage({
    topicId: topicId ?? chatId,
    role: 'user',
    content: message,
    createdAt: Date.now(),
  });

  // Notify processing started
  broadcastToSubscribers(sessionKey, { type: 'status', sessionKey, processing: true });

  const runner = new ClaudeRunner();
  activeRunners.set(sessionKey, runner);

  try {
    const runOptions = {
      sessionId: session.claudeSessionId ?? undefined,
      cwd: session.projectDir ?? undefined,
    };

    let accumulatedText = '';

    for await (const event of runner.run(message, runOptions)) {
      // Broadcast each stream event to subscribers
      broadcastToSubscribers(sessionKey, { type: 'stream', sessionKey, event });

      if (event.type === 'text') {
        accumulatedText += (event.data.text as string) ?? '';
      }

      if (event.type === 'done') {
        const resultSessionId = event.data.sessionId as string | undefined;
        if (resultSessionId) {
          await sessionManager.updateClaudeSessionId(chatId, topicId, resultSessionId);
        }

        const usage = event.data.usage as { input_tokens: number; output_tokens: number } | undefined;
        const contextLimit = event.data.contextLimit as number | undefined;
        if (usage && contextLimit && contextLimit > 0) {
          const contextPercent = Math.round(((usage.input_tokens + usage.output_tokens) / contextLimit) * 100);
          await sessionManager.updateContextUsage(chatId, topicId, contextPercent);
        }

        // Save assistant message
        stateStore.createMessage({
          topicId: topicId ?? chatId,
          role: 'assistant',
          content: accumulatedText || ((event.data.result as string) ?? ''),
          createdAt: Date.now(),
        });
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ws-server] Error processing message for ${sessionKey}:`, err);
    broadcastToSubscribers(sessionKey, { type: 'error', message: errorMsg });
  } finally {
    activeRunners.delete(sessionKey);
    broadcastToSubscribers(sessionKey, { type: 'status', sessionKey, processing: false });
  }
}

function handleSubscribe(ws: WsSocket, msg: WsSubscribeMessage): void {
  const subs = subscriptions.get(ws);
  if (subs) {
    subs.add(msg.sessionKey);
  }
}

function handleUnsubscribe(ws: WsSocket, msg: WsUnsubscribeMessage): void {
  const subs = subscriptions.get(ws);
  if (subs) {
    subs.delete(msg.sessionKey);
  }
}

function handleAbort(ws: WsSocket, msg: WsAbortMessage): void {
  const runner = activeRunners.get(msg.sessionKey);
  if (runner?.isRunning) {
    runner.abort();
    broadcastToSubscribers(msg.sessionKey, {
      type: 'status',
      sessionKey: msg.sessionKey,
      processing: false,
    });
  } else {
    send(ws, { type: 'error', message: `No active runner for session ${msg.sessionKey}` });
  }
}

function handleListSessions(ws: WsSocket): void {
  const sessions = sessionManager.listSessions();
  send(ws, { type: 'sessions', sessions });
}

// --- Server ---

let server: ReturnType<typeof Bun.serve> | null = null;

export function startWSServer(): void {
  if (server) {
    console.warn('[ws-server] Already running');
    return;
  }

  server = Bun.serve({
    port: WS_PORT,
    hostname: '127.0.0.1',

    async fetch(req, server) {
      const url = new URL(req.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response('ok', { status: 200 });
      }

      // IPC: dashboard → bot. Reload cron engine after CRUD on db-origin jobs.
      // The dashboard (separate process) writes to SQLite via core.createCronJob,
      // but the CronEngine (running in THIS process) only re-reads on boot or
      // HEARTBEAT.md fs.watch. This endpoint bridges that gap.
      //
      // Fire-and-forget semantics: the dashboard doesn't wait for reload to finish,
      // it just signals. Reload is async and reports progress via console logs.
      if (url.pathname === '/cron/reload' && req.method === 'POST') {
        cronEngine.reload().catch((err) => {
          console.error('[ws-server] cron reload failed:', err);
        });
        return Response.json({ ok: true, action: 'reload' });
      }

      // IPC: dashboard → bot. Trigger a single job by id immediately.
      // Replaces the 501 stub in /api/crons PUT action=run_now — the dashboard
      // can now actually fire a cron without waiting for its schedule.
      if (url.pathname === '/cron/run-now' && req.method === 'POST') {
        try {
          const body = (await req.json()) as { id?: unknown };
          const id = Number(body?.id);
          if (!Number.isInteger(id) || id <= 0) {
            return Response.json(
              { ok: false, error: 'Missing or invalid id' },
              { status: 400 }
            );
          }
          const found = await cronEngine.runJobById(id);
          if (!found) {
            return Response.json(
              { ok: false, error: 'Cron job not found' },
              { status: 404 }
            );
          }
          return Response.json({ ok: true, action: 'run-now', id });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            },
            { status: 400 }
          );
        }
      }

      const upgraded = server.upgrade(req, {
        data: { id: crypto.randomUUID() },
      });

      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 426 });
      }

      // Bun returns undefined on successful upgrade
      return undefined as unknown as Response;
    },

    websocket: {
      open(ws: WsSocket) {
        subscriptions.set(ws, new Set());
        console.log(`[ws-server] Client connected (${subscriptions.size} total)`);
      },

      async message(ws: WsSocket, raw: string | Buffer) {
        let msg: WsClientMessage;
        try {
          msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString()) as WsClientMessage;
        } catch {
          send(ws, { type: 'error', message: 'Invalid JSON' });
          return;
        }

        switch (msg.type) {
          case 'send':
            // Fire and forget — don't block the WS message loop
            handleSend(ws, msg).catch((err) => {
              console.error('[ws-server] handleSend error:', err);
              send(ws, { type: 'error', message: 'Internal error' });
            });
            break;

          case 'subscribe':
            handleSubscribe(ws, msg);
            break;

          case 'unsubscribe':
            handleUnsubscribe(ws, msg);
            break;

          case 'abort':
            handleAbort(ws, msg);
            break;

          case 'list_sessions':
            handleListSessions(ws);
            break;

          default:
            send(ws, { type: 'error', message: `Unknown message type: ${(msg as any).type}` });
        }
      },

      close(ws: WsSocket) {
        subscriptions.delete(ws);
        console.log(`[ws-server] Client disconnected (${subscriptions.size} remaining)`);
      },
    },
  });

  // Listen for cron results and broadcast to all connected clients
  eventBus.on('cron:result', async (data) => {
    const payload: WsServerMessage = {
      type: 'stream',
      sessionKey: 'cron',
      event: {
        type: 'text',
        data: {
          text: `[Cron: ${data.jobName}] ${data.output}`,
          status: data.status,
        },
      },
    };

    for (const [ws] of subscriptions) {
      send(ws, payload);
    }
  });

  console.log(`[ws-server] WebSocket server started on ws://127.0.0.1:${WS_PORT}`);
}

export function stopWSServer(): void {
  if (server) {
    server.stop();
    server = null;
    subscriptions.clear();
    console.log('[ws-server] WebSocket server stopped');
  }
}
