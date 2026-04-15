/**
 * Janitor runner — compresses daily → weekly, distills weekly → MEMORY.md
 * with the 4 checks + reverse test, runs validation + security sweep.
 *
 * Design: does the structural work (listing, archiving, backup) in JS so
 * we don't trust the LLM with destructive file ops. The LLM is only used
 * for two text-transformation tasks:
 *  1. Compression of a week of dailies into a weekly summary (prompt
 *     guarantees zero-hallucination extraction)
 *  2. Evaluation of weekly bullets against the 4 checks, producing new
 *     MEMORY.md candidate entries
 *
 * Distillation writes to the memory_entries table (kind='behavior'), NOT
 * to a raw markdown file — so audit trail + security scanner apply.
 */

import { readFile, writeFile, mkdir, readdir, rename, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateStore } from '../state-store';
import { ClaudeRunner } from '../claude-runner';
import { getConfig } from '../config';
import { BuiltinMemoryStore } from './builtin-store';
import { scanMemoryContent } from './security-scanner';
import type { MemoryEntryKind } from '../types';

const DEFAULT_DAILY_DIR =
  process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';
const JANITOR_MODEL = process.env.FORGECLAW_JANITOR_MODEL ?? 'claude-haiku-4-5-20251001';

interface JanitorReport {
  filesArchived: number;
  weeklyGenerated: string[];
  candidatesEvaluated: number;
  entriesAdded: number;
  entriesAutoApproved: number;
  entriesPendingReview: number;
  entriesRejected: Array<{ content: string; reason: string }>;
  pendingExpired: number;
  validation: {
    outdated: number;
    duplicate: number;
    orphaned: number;
    conflicting: number;
  };
  securityAlert: string | null;
}

function brtNow(): Date {
  return new Date(Date.now() - 3 * 60 * 60 * 1000);
}

function ageDays(filename: string): number {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  if (!m) return 0;
  const file = new Date(m[1] + 'T00:00:00Z').getTime();
  return Math.floor((Date.now() - file) / 86_400_000);
}

function mondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = dow === 0 ? 6 : dow - 1; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

async function loadPrompt(name: 'writer' | 'janitor'): Promise<string> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const candidates = [
      join(__dirname, 'prompts', `${name}.md`),
      join(process.cwd(), `packages/core/src/memory/prompts/${name}.md`),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return await readFile(p, 'utf-8');
    }
  } catch {
    // fall through
  }
  return `fallback ${name} prompt — see memory/prompts/${name}.md`;
}

// ---------------- Phase 1: compression daily → weekly ----------------

async function compressDailiesToWeekly(
  dailyDir: string,
  report: JanitorReport,
): Promise<void> {
  if (!existsSync(dailyDir)) return;
  const weeklyDir = join(dailyDir, 'weekly');
  const archiveRoot = join(dailyDir, 'archive');
  await mkdir(weeklyDir, { recursive: true });

  const files = (await readdir(dailyDir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
  // Group by Monday-of-week
  const byWeek = new Map<string, string[]>();
  for (const file of files) {
    if (ageDays(file) <= 7) continue;
    const dateStr = file.replace(/\.md$/, '');
    const monday = mondayOfWeek(dateStr);
    const list = byWeek.get(monday) ?? [];
    list.push(file);
    byWeek.set(monday, list);
  }
  if (byWeek.size === 0) return;

  for (const [monday, weekFiles] of byWeek) {
    const weeklyPath = join(weeklyDir, `${monday}.md`);
    const sections: string[] = [];
    sections.push(`# semana ${monday}`, '');

    for (const file of weekFiles.sort()) {
      const dateStr = file.replace(/\.md$/, '');
      const content = await readFile(join(dailyDir, file), 'utf-8');
      // Extract only the bullet lines (starting with "- [")
      const bullets = content
        .split('\n')
        .filter((l) => l.trim().startsWith('- ['))
        .map((l) => l.trim() + ` (src: ${dateStr})`);

      if (bullets.length === 0) continue;

      // Check idempotency: skip if this date section already exists
      if (existsSync(weeklyPath)) {
        const existing = await readFile(weeklyPath, 'utf-8');
        if (existing.includes(`### ${dateStr}`)) continue;
      }

      sections.push(`### ${dateStr}`, '', ...bullets, '');
    }

    if (sections.length > 2) {
      // Append or create
      if (existsSync(weeklyPath)) {
        const existing = await readFile(weeklyPath, 'utf-8');
        await writeFile(weeklyPath, existing + '\n' + sections.slice(2).join('\n'), 'utf-8');
      } else {
        await writeFile(weeklyPath, sections.join('\n'), 'utf-8');
      }
      report.weeklyGenerated.push(`${monday}.md`);
    }

    // Archive the dailies
    for (const file of weekFiles) {
      const year = file.slice(0, 4);
      const yearDir = join(archiveRoot, year);
      await mkdir(yearDir, { recursive: true });
      await rename(join(dailyDir, file), join(yearDir, file));
      report.filesArchived++;
    }
  }
}

// ---------------- Phase 2: distillation (daily + weekly) ----------------

interface DistillCandidate {
  content: string;
  kind: MemoryEntryKind;
  confidence: number; // 0-100
}

/**
 * Parse the Haiku output into structured candidates. Expected format per line:
 *   APPROVED :: <kind> :: <confidence> :: <content>
 *   REJECTED :: <reason> :: <original>
 * Unknown formats are ignored.
 */
function parseCandidates(response: string): { approved: DistillCandidate[]; rejected: Array<{ content: string; reason: string }> } {
  const approved: DistillCandidate[] = [];
  const rejected: Array<{ content: string; reason: string }> = [];

  for (const rawLine of response.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('APPROVED')) {
      const parts = line.replace(/^APPROVED\s*::\s*/, '').split('::').map((p) => p.trim());
      // Minimum: kind :: confidence :: content
      if (parts.length < 3) continue;
      const kind = parts[0].toLowerCase();
      const confRaw = parts[1];
      const content = parts.slice(2).join(' :: ').trim();
      if (!content) continue;

      const validKinds: MemoryEntryKind[] = ['behavior', 'user_profile', 'fact', 'decision', 'preference'];
      const parsedKind = (validKinds.includes(kind as MemoryEntryKind) ? kind : 'fact') as MemoryEntryKind;
      const confidence = Math.max(0, Math.min(100, Number.parseInt(confRaw, 10) || 0));

      approved.push({ content, kind: parsedKind, confidence });
    } else if (line.startsWith('REJECTED')) {
      const parts = line.replace(/^REJECTED\s*::\s*/, '').split('::').map((p) => p.trim());
      rejected.push({
        content: parts[1] ?? '(unknown)',
        reason: parts[0] ?? 'llm-rejected',
      });
    }
  }

  return { approved, rejected };
}

/**
 * Commit a distilled candidate to memory, honoring the user's review mode.
 *   - auto:   reviewed=true always (no queue)
 *   - hybrid: reviewed=true if confidence >= threshold, else pending
 *   - review: reviewed=false always (everything queued)
 */
function commitCandidate(
  store: BuiltinMemoryStore,
  candidate: DistillCandidate,
  opts: {
    mode: 'auto' | 'hybrid' | 'review';
    threshold: number;
    source: 'janitor-daily' | 'janitor-weekly';
    reason: string;
  },
  report: JanitorReport,
): void {
  // Security scan first
  const violation = scanMemoryContent(candidate.content);
  if (violation) {
    report.entriesRejected.push({ content: candidate.content, reason: `security: ${violation.kind}` });
    return;
  }

  // Decide reviewed status based on mode + confidence
  let reviewed: boolean;
  if (opts.mode === 'auto') reviewed = true;
  else if (opts.mode === 'review') reviewed = false;
  else reviewed = candidate.confidence >= opts.threshold; // hybrid

  const res = store.add(candidate.kind, candidate.content, {
    actor: 'janitor',
    sourceType: opts.source,
    reason: opts.reason,
    reviewed,
    confidence: candidate.confidence,
  });

  if (res.ok && res.entry) {
    report.entriesAdded++;
    if (reviewed) report.entriesAutoApproved++;
    else report.entriesPendingReview++;
  } else {
    report.entriesRejected.push({ content: candidate.content, reason: res.reason ?? 'unknown' });
  }
}

/**
 * Phase 2a: distill today's (and yesterday's) daily log into candidate
 * memory entries with conservative criteria. Runs cheap Haiku call.
 */
async function distillDailyToMemory(
  dailyDir: string,
  store: BuiltinMemoryStore,
  report: JanitorReport,
  mode: 'auto' | 'hybrid' | 'review',
  threshold: number,
): Promise<void> {
  // Process today + yesterday (the daily the user just lived through)
  const now = brtNow();
  const dates: string[] = [];
  for (let i = 0; i < 2; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const janitorPrompt = await loadPrompt('janitor');
  const runner = new ClaudeRunner();

  for (const dateStr of dates) {
    const filePath = join(dailyDir, `${dateStr}.md`);
    if (!existsSync(filePath)) continue;

    const raw = await readFile(filePath, 'utf-8');
    if (raw.trim().length < 50) continue;

    // Daily-distill prompt — conservative: only fact/decision/preference,
    // only self-contained, require high confidence to auto-approve.
    const userInput = [
      '# daily log:',
      '',
      raw,
      '',
      '# instrução',
      '',
      'Analise o daily log acima e extraia APENAS os fatos que merecem virar memória de longo prazo. Aplica os 4 checks + reverse test rigorosamente.',
      '',
      'Responde UMA linha por candidato, formato EXATO:',
      '',
      'APPROVED :: <kind> :: <confidence> :: <conteúdo>',
      '',
      'Onde:',
      '  kind = fact | decision | preference | user_profile',
      '  confidence = 0-100 (quão certo tu tá que isso deve virar memória de longo prazo)',
      '  conteúdo = 1-2 frases curtas, lowercase, self-contained (entende sem contexto temporal)',
      '',
      'Regras estritas:',
      '- NUNCA use "hoje", "ontem", "essa semana" — deve ser self-contained',
      '- SKIPA eventos one-shot (reuniões, tasks do dia, estados temporários)',
      '- SKIPA conteúdo já capturado no MEMORY.md',
      '- Confidence >= 85 só se é INEQUIVOCO que isso deveria estar na memória',
      '- Confidence 60-84 = provável mas precisa revisão humana',
      '- Confidence < 60 = NÃO emita (use REJECTED)',
      '',
      'Pra cada linha rejeitada:',
      'REJECTED :: <motivo curto> :: <bullet original>',
      '',
      'Sem outras saídas. Sem markdown. Sem explicações.',
    ].join('\n');

    let response = '';
    try {
      for await (const ev of runner.run(userInput, {
        systemPrompt: janitorPrompt,
        model: JANITOR_MODEL,
      })) {
        if (ev.type === 'text' && typeof ev.data.text === 'string') response += ev.data.text;
        else if (ev.type === 'done' && typeof ev.data.result === 'string') response += ev.data.result;
      }
    } catch (err) {
      console.warn(`[janitor] daily distill failed for ${dateStr}:`, err);
      continue;
    }

    const { approved, rejected } = parseCandidates(response);
    report.candidatesEvaluated += approved.length + rejected.length;
    report.entriesRejected.push(...rejected);

    // Cap at 10 entries per day to prevent flooding
    const capped = approved.slice(0, 10);
    for (const c of capped) {
      commitCandidate(store, c, {
        mode,
        threshold,
        source: 'janitor-daily',
        reason: `daily distill from ${dateStr}.md`,
      }, report);
    }
  }
}

/**
 * Phase 2b: distill weekly summaries into memory with rigorous criteria.
 * Only runs on dailies >7 days old that have been compressed into weekly.
 * Auto-approves high confidence because patterns survived 7 days of use.
 */
async function distillWeeklyToMemory(
  dailyDir: string,
  store: BuiltinMemoryStore,
  report: JanitorReport,
  mode: 'auto' | 'hybrid' | 'review',
  threshold: number,
): Promise<void> {
  const weeklyDir = join(dailyDir, 'weekly');
  if (!existsSync(weeklyDir)) return;

  const weeklies = (await readdir(weeklyDir)).filter((f) => f.endsWith('.md'));
  if (weeklies.length === 0) return;

  weeklies.sort().reverse();
  const recent = weeklies.slice(0, 2);

  const janitorPrompt = await loadPrompt('janitor');
  const runner = new ClaudeRunner();

  for (const file of recent) {
    const raw = await readFile(join(weeklyDir, file), 'utf-8');

    const userInput = [
      '# weekly summary:',
      '',
      raw,
      '',
      '# instrução',
      '',
      'Aplica os 4 checks + reverse test rigorosamente. Esta é destilação de LONGO PRAZO — só aceita fatos que sobreviveram uma semana de uso.',
      '',
      'Responde UMA linha por candidato, formato EXATO:',
      '',
      'APPROVED :: <kind> :: <confidence> :: <conteúdo>',
      '',
      'Kind: behavior (regra comportamental) | fact | decision | preference | user_profile',
      'Confidence 0-100. Nesta fase, confidence baixa = NÃO emita.',
      '',
      'Pra cada rejeitado:',
      'REJECTED :: <motivo> :: <bullet original>',
      '',
      'Sem outras saídas.',
    ].join('\n');

    let response = '';
    try {
      for await (const ev of runner.run(userInput, {
        systemPrompt: janitorPrompt,
        model: JANITOR_MODEL,
      })) {
        if (ev.type === 'text' && typeof ev.data.text === 'string') response += ev.data.text;
        else if (ev.type === 'done' && typeof ev.data.result === 'string') response += ev.data.result;
      }
    } catch (err) {
      console.warn(`[janitor] weekly distill failed for ${file}:`, err);
      continue;
    }

    const { approved, rejected } = parseCandidates(response);
    report.candidatesEvaluated += approved.length + rejected.length;
    report.entriesRejected.push(...rejected);

    for (const c of approved) {
      commitCandidate(store, c, {
        mode,
        threshold,
        source: 'janitor-weekly',
        reason: `weekly distill from ${file}`,
      }, report);
    }
  }
}

// ---------------- Phase 3: validation sweep ----------------

function validationSweep(store: BuiltinMemoryStore, report: JanitorReport): void {
  const entries = store.listLive('behavior');
  const seen = new Map<string, number>();

  for (const e of entries) {
    const norm = e.content.toLowerCase().replace(/\s+/g, ' ').trim();
    const prev = seen.get(norm);
    if (prev !== undefined) {
      report.validation.duplicate++;
    } else {
      seen.set(norm, e.id);
    }

    // Orphaned: single proper noun with <40 chars and no surrounding context
    if (e.content.length < 40 && /^[A-Z][a-zà-ÿ]+/.test(e.content)) {
      report.validation.orphaned++;
    }

    // Outdated: heuristic — content mentions a version or date that looks stale
    if (/v?\d+\.\d+\.\d+|\b(20(19|20|21|22|23|24))\b/.test(e.content)) {
      report.validation.outdated++;
    }
  }

  // Conflicting detection is hard without the LLM — defer to future turn.
}

// ---------------- Phase 4: security sweep ----------------

function securitySweep(store: BuiltinMemoryStore, report: JanitorReport): void {
  const all = [...store.listLive('behavior'), ...store.listLive('user_profile')];
  for (const e of all) {
    const v = scanMemoryContent(e.content);
    if (v) {
      report.securityAlert = `entry #${e.id}: ${v.kind}`;
      return;
    }
  }
}

// ---------------- Backup + rollback ----------------

async function backupHarness(harnessDir = join(process.env.HOME ?? '/root', '.forgeclaw', 'harness')): Promise<string | null> {
  try {
    const ts = brtNow().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = join(harnessDir, '.backups');
    await mkdir(backupDir, { recursive: true });
    const memPath = join(harnessDir, 'MEMORY.md');
    const userPath = join(harnessDir, 'USER.md');
    if (existsSync(memPath)) await copyFile(memPath, join(backupDir, `MEMORY-${ts}.md`));
    if (existsSync(userPath)) await copyFile(userPath, join(backupDir, `USER-${ts}.md`));
    return ts;
  } catch (err) {
    console.warn('[janitor] backup failed:', err);
    return null;
  }
}

// ---------------- Public entry ----------------

export async function runJanitor(
  opts: { dailyDir?: string; store?: BuiltinMemoryStore } = {},
): Promise<JanitorReport> {
  const dailyDir = opts.dailyDir ?? DEFAULT_DAILY_DIR;
  const store = opts.store ?? new BuiltinMemoryStore();
  store.loadSnapshot(); // ensure latest state

  // Load review mode from config (default: hybrid)
  let mode: 'auto' | 'hybrid' | 'review' = 'hybrid';
  let threshold = 85;
  try {
    const config = await getConfig();
    if (config.memoryReviewMode) mode = config.memoryReviewMode;
    if (typeof config.memoryAutoApproveThreshold === 'number') {
      threshold = config.memoryAutoApproveThreshold;
    }
  } catch {
    // fall through with defaults
  }

  const report: JanitorReport = {
    filesArchived: 0,
    weeklyGenerated: [],
    candidatesEvaluated: 0,
    entriesAdded: 0,
    entriesAutoApproved: 0,
    entriesPendingReview: 0,
    entriesRejected: [],
    pendingExpired: 0,
    validation: { outdated: 0, duplicate: 0, orphaned: 0, conflicting: 0 },
    securityAlert: null,
  };

  console.log(`[janitor] starting run — mode=${mode} threshold=${threshold}`);
  const backupTs = await backupHarness();
  if (backupTs) console.log(`[janitor] backup created: ${backupTs}`);

  try {
    // Auto-expire pending-review entries older than 7 days
    report.pendingExpired = stateStore.expirePendingReviews(7);
    if (report.pendingExpired > 0) {
      console.log(`[janitor] auto-expired ${report.pendingExpired} pending entries`);
    }

    await compressDailiesToWeekly(dailyDir, report);
    console.log(`[janitor] phase 1 done — archived=${report.filesArchived}, weeklies=${report.weeklyGenerated.length}`);

    // Phase 2a: daily distill (new) — captures fresh conversations
    await distillDailyToMemory(dailyDir, store, report, mode, threshold);
    console.log(`[janitor] phase 2a done — daily distill`);

    // Phase 2b: weekly distill (existing) — rigorous long-term curation
    await distillWeeklyToMemory(dailyDir, store, report, mode, threshold);
    console.log(
      `[janitor] phase 2b done — total added=${report.entriesAdded} (auto=${report.entriesAutoApproved}, pending=${report.entriesPendingReview}), rejected=${report.entriesRejected.length}`,
    );

    validationSweep(store, report);
    console.log(`[janitor] phase 3 done — ${JSON.stringify(report.validation)}`);

    securitySweep(store, report);
    if (report.securityAlert) {
      console.error(`[janitor] SECURITY ALERT: ${report.securityAlert}`);
    }
  } catch (err) {
    console.error('[janitor] run failed:', err);
    throw err;
  }

  // Reload snapshot + mirror so next session sees the new state
  store.loadSnapshot();
  console.log(`[janitor] complete: ${JSON.stringify(report)}`);
  return report;
}
