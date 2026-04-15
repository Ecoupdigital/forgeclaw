/**
 * Writer runner — extracts structured bullets from recent sessions and
 * appends them to the shared daily log in the vault.
 *
 * Idempotent: tracks processed session IDs in `.writer-state.json` and
 * also does a `sessionKey[:8]`-in-file check per openclaw-memory's pattern.
 *
 * Uses the cheap model (Haiku 4.5 default) via the existing ClaudeRunner
 * so we never burn Sonnet on mechanical extraction.
 */

import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateStore } from '../state-store';
import { ClaudeRunner } from '../claude-runner';
import type { Message, TopicInfo } from '../types';
import { scanMemoryContent } from './security-scanner';

const DEFAULT_DAILY_DIR =
  process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';
const STATE_FILE = '.writer-state.json';

// Use cheap model for extraction — configurable via env var.
const WRITER_MODEL = process.env.FORGECLAW_WRITER_MODEL ?? 'claude-haiku-4-5-20251001';

interface WriterState {
  lastRunAt: number;
  processedSessionKeys: string[];
}

function brtDateString(d: Date = new Date()): string {
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function brtTimeString(d: Date = new Date()): string {
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(11, 16);
}

async function loadPrompt(): Promise<string> {
  // Resolve prompt file relative to this module (works in bundled and dev)
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const candidates = [
      join(__dirname, 'prompts', 'writer.md'),
      join(__dirname, '..', 'src', 'memory', 'prompts', 'writer.md'),
      join(process.cwd(), 'packages/core/src/memory/prompts/writer.md'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return await readFile(p, 'utf-8');
    }
  } catch {
    // fall through to embedded prompt
  }
  // Embedded fallback — short version so the runner still works if the
  // .md file is missing from the bundle.
  return `Tu és o writer do ForgeClaw. Extrai 5-15 bullets do histórico da sessão,
formato: - [HH:MM] 【tag】 conteúdo (topic: nome). Tags: decisão, descoberta,
preferência, tarefa, pessoa, bug, deploy. Zero hallucination. Só o que tá literal.
Responde só os bullets, nada mais.`;
}

async function loadState(dailyDir: string): Promise<WriterState> {
  const path = join(dailyDir, STATE_FILE);
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as WriterState;
    return {
      lastRunAt: parsed.lastRunAt ?? 0,
      processedSessionKeys: Array.isArray(parsed.processedSessionKeys)
        ? parsed.processedSessionKeys
        : [],
    };
  } catch {
    return { lastRunAt: 0, processedSessionKeys: [] };
  }
}

async function saveState(dailyDir: string, state: WriterState): Promise<void> {
  await mkdir(dailyDir, { recursive: true });
  await writeFile(join(dailyDir, STATE_FILE), JSON.stringify(state, null, 2), 'utf-8');
}

interface SessionCandidate {
  key: string; // sessionId
  topicId: number;
  topicName: string;
  projectDir: string | null;
  messages: Message[];
  startedAt: number;
}

/**
 * Gather active sessions since the last writer run. Only main user-facing
 * sessions — we skip cron-triggered, janitor, and writer sessions.
 */
function gatherCandidates(state: WriterState): SessionCandidate[] {
  const sessions = stateStore.listSessions();
  const candidates: SessionCandidate[] = [];
  const seenKeys = new Set(state.processedSessionKeys);

  for (const s of sessions) {
    if (seenKeys.has(s.id)) continue;

    const topic = s.topicId ? stateStore.getTopic(s.topicId) : null;
    const topicName = topic?.name ?? `topic#${s.topicId ?? 'null'}`;
    // Skip internal/automation sessions
    const lower = topicName.toLowerCase();
    if (lower.includes('janitor') || lower.includes('writer') || lower.includes('memory-')) {
      continue;
    }

    // messages.topic_id stores the Telegram thread_id, or the chat_id for
    // direct conversations (no thread). sessions.topic_id mirrors the
    // thread_id OR 0 for direct chats — for direct chats we need to look
    // up messages by the topic's chat_id instead.
    let msgTopicKey = s.topicId ?? 0;
    if (msgTopicKey === 0 && topic?.chatId) {
      msgTopicKey = topic.chatId;
    }
    const messages = stateStore.getMessages(msgTopicKey, 200);
    // Only write if there's real content (>= 2 messages)
    if (messages.length < 2) continue;

    candidates.push({
      key: s.id,
      topicId: s.topicId ?? 0,
      topicName,
      projectDir: s.projectDir,
      messages: messages.reverse(), // messages are DESC from getMessages; we want chronological
      startedAt: s.createdAt,
    });
  }

  return candidates;
}

/**
 * Format a session's messages into the JSON blob the writer prompt expects.
 */
function formatSessionForPrompt(c: SessionCandidate): string {
  const payload = {
    session: {
      key: c.key.slice(0, 12),
      topic: c.topicName,
      startedAt: c.startedAt,
    },
    messages: c.messages.slice(-60).map((m) => ({
      role: m.role,
      content: m.content.slice(0, 2000),
      createdAt: m.createdAt,
      time: brtTimeString(new Date(m.createdAt)),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Run the writer once — extract new bullets and append to today's daily log.
 * Returns number of bullets written.
 */
export async function runWriter(opts: { dailyDir?: string; maxSessions?: number } = {}): Promise<number> {
  const dailyDir = opts.dailyDir ?? DEFAULT_DAILY_DIR;
  const maxSessions = opts.maxSessions ?? 20;

  await mkdir(dailyDir, { recursive: true });

  const state = await loadState(dailyDir);
  const candidates = gatherCandidates(state);
  if (candidates.length === 0) {
    state.lastRunAt = Date.now();
    await saveState(dailyDir, state);
    return 0;
  }

  const prompt = await loadPrompt();
  const runner = new ClaudeRunner();
  let written = 0;

  for (const c of candidates.slice(0, maxSessions)) {
    const today = brtDateString(new Date(c.startedAt));
    const dailyPath = join(dailyDir, `${today}.md`);

    // Idempotent: short hash in file = skip
    const shortKey = c.key.slice(0, 8);
    if (existsSync(dailyPath)) {
      const existing = await readFile(dailyPath, 'utf-8');
      if (existing.includes(`sid:${shortKey}`)) {
        state.processedSessionKeys.push(c.key);
        continue;
      }
    }

    const userPayload = formatSessionForPrompt(c);
    const extractedLines: string[] = [];

    try {
      for await (const event of runner.run(userPayload, {
        systemPrompt: prompt,
        model: WRITER_MODEL,
      })) {
        if (event.type === 'text' && typeof event.data.text === 'string') {
          extractedLines.push(event.data.text);
        } else if (event.type === 'done' && typeof event.data.result === 'string') {
          extractedLines.push(event.data.result);
        }
      }
    } catch (err) {
      console.warn(`[writer] runner failed for session ${shortKey}:`, err);
      continue;
    }

    const raw = extractedLines.join('').trim();
    if (!raw || raw === '(nada relevante)' || raw.toLowerCase().startsWith('(nada')) {
      state.processedSessionKeys.push(c.key);
      continue;
    }

    // Security scan the extraction itself — prevents injected content from
    // a Telegram message surviving into the daily log.
    const violation = scanMemoryContent(raw);
    if (violation) {
      console.warn(`[writer] security scanner blocked session ${shortKey}: ${violation.kind}`);
      state.processedSessionKeys.push(c.key);
      continue;
    }

    // Filter to lines starting with "- [" (the expected bullet format)
    const bullets = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- ['))
      .slice(0, 15);
    if (bullets.length === 0) {
      state.processedSessionKeys.push(c.key);
      continue;
    }

    const block = [`<!-- sid:${shortKey} topic:${c.topicName} -->`, ...bullets, ''].join('\n');
    await appendFile(dailyPath, block + '\n', 'utf-8');

    written += bullets.length;
    state.processedSessionKeys.push(c.key);
  }

  // Keep state file bounded
  if (state.processedSessionKeys.length > 500) {
    state.processedSessionKeys = state.processedSessionKeys.slice(-300);
  }
  state.lastRunAt = Date.now();
  await saveState(dailyDir, state);

  console.log(`[writer] wrote ${written} bullets from ${Math.min(candidates.length, maxSessions)} session(s)`);
  return written;
}
