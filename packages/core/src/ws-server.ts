import type { ServerWebSocket } from 'bun';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ClaudeRunner } from './claude-runner';
import { sessionManager } from './session-manager';
import { stateStore } from './state-store';
import { eventBus } from './event-bus';
import { cronEngine } from './cron-engine';
import { ContextBuilder } from './context-builder';
import { harnessLoader } from './harness-loader';
import { getConfig } from './config';
import { runnerRegistry } from './runners';
import type { AgentCliRunner } from './runners';
import type { StreamEvent, SessionInfo, RuntimeName, AgentConfig } from './types';

const HARNESS_CLAUDE_MD = join(homedir(), '.forgeclaw', 'harness', 'CLAUDE.md');

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

// Remote message: a message that originated in a DIFFERENT channel (e.g. the
// Telegram bot) and is being mirrored to this dashboard client for live view.
// Sent when the eventBus emits message:incoming/outgoing with origin != dashboard.
interface WsRemoteMessageResponse {
  type: 'remote_message';
  sessionKey: string;
  role: 'user' | 'assistant';
  content: string;
  origin: 'telegram' | 'dashboard';
  createdAt: number;
}

type WsServerMessage =
  | WsStreamResponse
  | WsSessionsResponse
  | WsErrorResponse
  | WsStatusResponse
  | WsRemoteMessageResponse;

// --- State ---

type WsSocket = ServerWebSocket<{ id: string }>;

const subscriptions = new Map<WsSocket, Set<string>>();
const activeRunners = new Map<string, AgentCliRunner>();

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
  const userCreatedAt = Date.now();
  stateStore.createMessage({
    topicId: topicId ?? chatId,
    role: 'user',
    content: message,
    createdAt: userCreatedAt,
  });

  // Mirror to Telegram side via eventBus. `origin: 'dashboard'` makes the
  // Telegram-side listener accept it (forwards to bot.api.sendMessage with
  // a prefix) and makes the ws-server-side listener ignore it (the sender
  // dashboard already sees its own messages via normal streaming).
  eventBus.emit('message:incoming', {
    sessionKey,
    chatId,
    topicId,
    role: 'user',
    content: message,
    origin: 'dashboard',
    createdAt: userCreatedAt,
  });

  // Notify processing started
  broadcastToSubscribers(sessionKey, { type: 'status', sessionKey, processing: true });

  // Resolve runtime from the topic override (same as text handler)
  const topicRow =
    topicId !== null
      ? stateStore.getTopicByChatAndThread(chatId, topicId)
      : stateStore.getTopicByChatAndThread(chatId, null);
  // Load agent linked to this topic (if any)
  let agentConfig: AgentConfig | null = null;
  if (topicRow?.agentId) {
    agentConfig = stateStore.getAgent(topicRow.agentId);
    if (agentConfig) {
      console.log(`[ws-server] topic ${sessionKey} linked to agent '${agentConfig.name}'`);
    }
  }

  const cfgForRuntime = await getConfig();
  // Agent runtime > topic runtime > config default
  const requestedRuntime = (agentConfig?.defaultRuntime ?? topicRow?.runtime ?? cfgForRuntime.defaultRuntime) as RuntimeName | undefined;
  const allowFallback = topicRow?.runtimeFallback ?? false;
  const runner = runnerRegistry.get(requestedRuntime, { allowFallback });
  console.log(`[ws-server] using runtime '${runner.name}' for ${sessionKey}`);
  activeRunners.set(sessionKey, runner);

  try {
    // Build enriched prompt with memory prefetch + stat line + project state.
    // Same path the Telegram text handler uses, so the dashboard chat gets
    // the same contextual grounding.
    let enrichedPrompt = message;
    try {
      const config = await getConfig();
      const builder = new ContextBuilder(config, harnessLoader);
      enrichedPrompt = await builder.build(message, chatId, topicId ?? 0, undefined, agentConfig);
    } catch (err) {
      console.warn('[ws-server] ContextBuilder failed, using raw message:', err);
    }

    const runOptions = {
      sessionId: session.claudeSessionId ?? undefined,
      cwd: session.projectDir ?? undefined,
      ...(existsSync(HARNESS_CLAUDE_MD) ? { appendSystemPromptFile: HARNESS_CLAUDE_MD } : {}),
    };

    let accumulatedText = '';

    for await (const event of runner.run(enrichedPrompt, runOptions)) {
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

        const usage = event.data.usage as {
          input_tokens: number;
          output_tokens: number;
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        } | undefined;
        const contextLimit = event.data.contextLimit as number | undefined;
        if (usage && contextLimit && contextLimit > 0) {
          const contextPercent = Math.round(((usage.input_tokens + usage.output_tokens) / contextLimit) * 100);
          await sessionManager.updateContextUsage(chatId, topicId, contextPercent);
        }

        // Emit stream:done for token-recorder (Mission Control)
        eventBus.emit('stream:done', {
          sessionKey,
          topicId,
          usage: usage ?? undefined,
          model: cfgForRuntime.claudeModel ?? null,
          source: 'dashboard',
        });

        // Save assistant message
        const assistantContent = accumulatedText || ((event.data.result as string) ?? '');
        const assistantCreatedAt = Date.now();
        stateStore.createMessage({
          topicId: topicId ?? chatId,
          role: 'assistant',
          content: assistantContent,
          createdAt: assistantCreatedAt,
        });

        // Mirror the final assistant message to Telegram via eventBus.
        eventBus.emit('message:outgoing', {
          sessionKey,
          chatId,
          topicId,
          role: 'assistant',
          content: assistantContent,
          origin: 'dashboard',
          createdAt: assistantCreatedAt,
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

// --- Auth ---

/**
 * Constant-time string comparison to prevent timing attacks on token validation.
 * Uses XOR accumulation so execution time is independent of where strings differ.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validate the dashboard token from a WS upgrade request.
 * Token can come from:
 *   - query parameter: ws://host:4041/?token=xxx
 *   - Authorization header: Bearer xxx
 * Returns true if valid or if no dashboardToken is configured (auth disabled).
 */
async function validateWsToken(req: Request): Promise<boolean> {
  const config = await getConfig();
  const expected = config.dashboardToken;

  // No token configured = auth disabled (backward compat)
  if (!expected) return true;

  // Try query parameter first
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken && timingSafeCompare(queryToken, expected)) return true;

  // Try Authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && timingSafeCompare(parts[1], expected)) {
      return true;
    }
  }

  return false;
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
        // IPC from dashboard -- validate token
        const ipcAuthValid = await validateWsToken(req);
        if (!ipcAuthValid) {
          return new Response('Unauthorized', { status: 401 });
        }
        cronEngine.reload().catch((err) => {
          console.error('[ws-server] cron reload failed:', err);
        });
        return Response.json({ ok: true, action: 'reload' });
      }

      // IPC: dashboard → bot. Trigger a single job by id immediately.
      // Replaces the 501 stub in /api/crons PUT action=run_now — the dashboard
      // can now actually fire a cron without waiting for its schedule.
      //
      // **Fire-and-forget semantics.** A real cron execution can take 30s-2min
      // (Claude run), much longer than the dashboard's 2s IPC timeout. We
      // resolve the job existence SYNCHRONOUSLY (so we can return 404 cleanly),
      // then kick off executeJob in the background and respond 202 Accepted
      // immediately. The result will show up in cron_logs and lastRun/lastStatus
      // via normal engine flow.
      if (url.pathname === '/cron/run-now' && req.method === 'POST') {
        // IPC from dashboard -- validate token
        const ipcAuthValid = await validateWsToken(req);
        if (!ipcAuthValid) {
          return new Response('Unauthorized', { status: 401 });
        }
        try {
          const body = (await req.json()) as { id?: unknown };
          const id = Number(body?.id);
          if (!Number.isInteger(id) || id <= 0) {
            return Response.json(
              { ok: false, error: 'Missing or invalid id' },
              { status: 400 }
            );
          }
          const job = stateStore.getCronJob(id);
          if (!job) {
            return Response.json(
              { ok: false, error: 'Cron job not found' },
              { status: 404 }
            );
          }
          // Fire the execution in the background. Do NOT await.
          cronEngine.executeJob(job).catch((err) => {
            console.error(`[ws-server] run-now execution failed for job ${id}:`, err);
          });
          return Response.json(
            { ok: true, action: 'run-now', id, status: 'started' },
            { status: 202 }
          );
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

      // Validate dashboard token before WebSocket upgrade
      const wsAuthValid = await validateWsToken(req);
      if (!wsAuthValid) {
        return new Response('Unauthorized', { status: 401 });
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

  // Mirror inbound (user) and outbound (assistant) chat messages from OTHER
  // channels (currently only Telegram) to dashboard subscribers. Events with
  // origin === 'dashboard' are skipped because the sender dashboard already
  // sees its own messages via normal streaming (handleSend) and broadcasting
  // them again would duplicate. The composite sessionKey must match the
  // subscriber's subscription; broadcastToSubscribers already does that
  // filtering.
  const mirrorToDashboard = (data: Record<string, unknown>) => {
    const origin = data.origin as 'telegram' | 'dashboard' | undefined;
    if (origin === 'dashboard' || origin === undefined) return;

    const sessionKey = data.sessionKey as string | undefined;
    const role = data.role as 'user' | 'assistant' | undefined;
    const content = data.content as string | undefined;
    const createdAt = data.createdAt as number | undefined;

    if (!sessionKey || !role || content === undefined || createdAt === undefined) {
      return;
    }

    broadcastToSubscribers(sessionKey, {
      type: 'remote_message',
      sessionKey,
      role,
      content,
      origin,
      createdAt,
    });
  };

  eventBus.on('message:incoming', mirrorToDashboard);
  eventBus.on('message:outgoing', mirrorToDashboard);

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
