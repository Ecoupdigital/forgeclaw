/**
 * RefineSessionStore — singleton in-memory holder for active refine interviews.
 *
 * Parallels OnboardingSessionStore but scoped to the `forgeclaw refine` flow.
 * Key differences:
 *  - Multi-session tolerated (user could open two browser tabs), indexed by
 *    sessionId. We cap at 5 simultaneously active and garbage-collect
 *    sessions older than 30min.
 *  - Mode + optional section are first-class fields so the UI can filter the
 *    final diff (section mode) before applying.
 *  - Baseline for apply(): create a backup, apply the diff, recompile
 *    CLAUDE.md, write the refine sentinel for the CLI poller.
 */

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Interviewer,
  previewDiff,
  applyDiff,
  compileHarness,
  createBackup,
  HARNESS_FILES_ALL,
  type InterviewState,
  type HarnessDiff,
  type FileDiff,
  type ArchetypeSlug,
  type HarnessFile,
  type MergeResult,
} from "@forgeclaw/core";
import { HARNESS_DIR } from "./onboarding-state";
import { writeRefineSentinel } from "./refine-sentinel";
import type {
  RefineSessionSnapshot,
  RefineMessageDTO,
  RefineHarnessFileDTO,
  RefineDiffSummary,
  RefineBudgetDTO,
  RefineStatus,
  RefineMode,
  RefineArchetype,
  RefineSection,
} from "./refine-types";

const MAX_ACTIVE = 5;
const MAX_AGE_MS = 30 * 60 * 1000; // 30min

interface RefineSessionEntry {
  sessionId: string;
  itv: Interviewer;
  archetype: RefineArchetype;
  mode: RefineMode;
  section: RefineSection | null;
  currentQuestion: string | null;
  currentRationale: string | null;
  createdAt: number;
  lastTouched: number;
}

const VALID_ARCHETYPES: readonly RefineArchetype[] = [
  "solo-builder",
  "content-creator",
  "agency-freela",
  "ecom-manager",
  "generic",
];

const VALID_SECTIONS: readonly RefineSection[] = [
  "SOUL",
  "USER",
  "AGENTS",
  "TOOLS",
  "MEMORY",
  "STYLE",
  "HEARTBEAT",
];

class RefineSessionStoreImpl {
  private sessions = new Map<string, RefineSessionEntry>();

  size(): number {
    return this.sessions.size;
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  get(sessionId: string): RefineSessionEntry | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    entry.lastTouched = Date.now();
    return entry;
  }

  /** Create a new session. Returns null if the active cap is reached. */
  createSession(params: {
    archetype: RefineArchetype;
    mode: RefineMode;
    section: RefineSection | null;
  }): RefineSessionEntry | null {
    this.pruneStale();
    if (this.sessions.size >= MAX_ACTIVE) return null;

    const sessionId = randomBytes(16).toString("hex");
    const itv = new Interviewer({
      archetype: params.archetype as ArchetypeSlug,
      harnessDir: HARNESS_DIR,
    });
    const now = Date.now();
    const entry: RefineSessionEntry = {
      sessionId,
      itv,
      archetype: params.archetype,
      mode: params.mode,
      section: params.section,
      currentQuestion: null,
      currentRationale: null,
      createdAt: now,
      lastTouched: now,
    };
    this.sessions.set(sessionId, entry);
    return entry;
  }

  destroy(sessionId: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;
    try {
      entry.itv.abort("Session destroyed");
    } catch {
      // ignore
    }
    this.sessions.delete(sessionId);
  }

  setCurrentQuestion(
    sessionId: string,
    question: string | null,
    rationale: string | null,
  ): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;
    entry.currentQuestion = question;
    entry.currentRationale = rationale;
    entry.lastTouched = Date.now();
  }

  toSnapshot(sessionId: string): RefineSessionSnapshot | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    const state = entry.itv.getState();
    return buildSnapshot(entry, state);
  }

  /**
   * Remove sessions untouched for more than MAX_AGE_MS. Called opportunistically
   * by createSession — cheap enough to run on every create.
   */
  private pruneStale(): void {
    const now = Date.now();
    for (const [id, entry] of this.sessions) {
      if (now - entry.lastTouched > MAX_AGE_MS) {
        try {
          entry.itv.abort("Session expired (stale)");
        } catch {
          // ignore
        }
        this.sessions.delete(id);
      }
    }
  }
}

// Module-level symbol guards against HMR duplication in dev.
const GLOBAL_KEY = Symbol.for("forgeclaw.refine.store");
type GlobalWithStore = typeof globalThis & {
  [GLOBAL_KEY]?: RefineSessionStoreImpl;
};
const g = globalThis as GlobalWithStore;
if (!g[GLOBAL_KEY]) {
  g[GLOBAL_KEY] = new RefineSessionStoreImpl();
}
const STORE = g[GLOBAL_KEY];

export function getRefineStore(): RefineSessionStoreImpl {
  return STORE;
}

// --- Snapshot builder (mirrors onboarding-sessions.ts buildSnapshot) ---

function buildSnapshot(
  entry: RefineSessionEntry,
  state: InterviewState,
): RefineSessionSnapshot {
  const messages: RefineMessageDTO[] = state.turns.map((t) => ({
    index: t.index,
    role: t.role,
    text: t.role === "interviewer" ? stripJsonBlock(t.text) : t.text,
    at: t.at,
  }));

  const filteredDiff = filterDiffForSection(state.finalDiff, entry.section);
  const harnessFiles = readHarnessFiles(filteredDiff);
  const diffSummary = buildDiffSummary(filteredDiff);

  const budget: RefineBudgetDTO = {
    turnsUsed: state.budget.turnsUsed,
    maxTurns: 30,
    inputTokensUsed: state.budget.inputTokensUsed,
    maxInputTokens: 80_000,
    outputTokensUsed: state.budget.outputTokensUsed,
    maxOutputTokens: 20_000,
    elapsedMs: state.budget.elapsedMs,
    timeoutMs: 15 * 60 * 1000,
    withinLimits: state.budget.withinLimits,
    cutoffReason: state.budget.cutoffReason,
  };

  return {
    sessionId: entry.sessionId,
    archetype: entry.archetype,
    mode: entry.mode,
    section: entry.section,
    status: state.status as RefineStatus,
    messages,
    currentQuestion: entry.currentQuestion,
    currentRationale: entry.currentRationale,
    harnessFiles,
    diffSummary,
    budget,
    errorMessage: state.errorMessage,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
  };
}

function stripJsonBlock(text: string): string {
  const stripped = text.replace(/```json[\s\S]*?```/, "").trim();
  return stripped.length > 0 ? stripped : text.trim();
}

/**
 * When mode === 'section', strip every FileDiff that is not the target file
 * before we hand the diff to previewDiff/applyDiff. This mirrors how the CLI
 * refine-section mode filters the diff in commands/refine.ts.
 */
function filterDiffForSection(
  diff: HarnessDiff | null,
  section: RefineSection | null,
): HarnessDiff | null {
  if (!diff) return null;
  if (!section) return diff;
  const targetFile = `${section}.md` as HarnessFile;
  const kept = diff.diffs.filter((fd: FileDiff) => fd.file === targetFile);
  return { summary: diff.summary, diffs: kept };
}

function readHarnessFiles(
  diff: HarnessDiff | null,
): RefineHarnessFileDTO[] {
  const files: RefineHarnessFileDTO[] = [];
  for (const name of HARNESS_FILES_ALL) {
    const path = join(HARNESS_DIR, name);
    let currentContent = "";
    if (existsSync(path)) {
      try {
        currentContent = readFileSync(path, "utf-8");
      } catch {
        currentContent = "";
      }
    }
    let previewContent = currentContent;
    let changed = false;
    if (diff && diff.diffs.length > 0) {
      try {
        const result = previewDiff(HARNESS_DIR, diff);
        const candidate = result.finalContents[name];
        if (typeof candidate === "string") {
          previewContent = candidate;
          changed = candidate !== currentContent;
        }
      } catch {
        // preview failure for this file -> current
      }
    }
    files.push({ name, currentContent, previewContent, changed });
  }
  return files;
}

function buildDiffSummary(diff: HarnessDiff | null): RefineDiffSummary | null {
  if (!diff) return null;
  if (diff.diffs.length === 0) return null;
  const filesTouched = diff.diffs.map((d) => d.file);
  const opsCount = diff.diffs.reduce((acc, d) => acc + d.ops.length, 0);
  return { summary: diff.summary, filesTouched, opsCount };
}

// --- High-level handlers used by API routes ---

export async function runRefineStart(params: {
  archetype: RefineArchetype;
  mode: RefineMode;
  section: RefineSection | null;
}): Promise<RefineSessionSnapshot> {
  const store = getRefineStore();
  const entry = store.createSession(params);
  if (!entry) {
    throw new Error(
      `Too many active refine sessions (max ${MAX_ACTIVE}). Close unused tabs and retry.`,
    );
  }
  const resp = await entry.itv.start();
  if (resp.status === "asking") {
    store.setCurrentQuestion(entry.sessionId, resp.nextQuestion, resp.rationale ?? null);
  }
  const snapshot = store.toSnapshot(entry.sessionId);
  if (!snapshot) throw new Error("Snapshot unavailable after start");
  return snapshot;
}

export async function runRefineAnswer(
  sessionId: string,
  text: string,
): Promise<RefineSessionSnapshot> {
  const store = getRefineStore();
  const entry = store.get(sessionId);
  if (!entry) throw new Error("No active session for sessionId");
  const resp = await entry.itv.answer(text);
  if (resp.status === "asking") {
    store.setCurrentQuestion(sessionId, resp.nextQuestion, resp.rationale ?? null);
  } else {
    store.setCurrentQuestion(sessionId, null, null);
  }
  const snapshot = store.toSnapshot(sessionId);
  if (!snapshot) throw new Error("Snapshot unavailable after answer");
  return snapshot;
}

export interface RefineApplyOutcome {
  ok: boolean;
  backupId: string;
  result: MergeResult | null;
  reason?: string;
}

/**
 * Apply the active diff for a session:
 *  1. Create backup (throws if harness dir missing)
 *  2. Filter diff to section (when section mode)
 *  3. applyDiff(HARNESS_DIR, diff) — writes to disk
 *  4. compileHarness() — regenerate CLAUDE.md
 *  5. Destroy session
 *
 * Writes the refine sentinel (`~/.forgeclaw/.refining-done`) regardless of
 * outcome so the CLI poller can unblock. Backup is created EVEN when the
 * diff is empty — mirrors CLI behavior and guarantees user can always
 * rollback to the pre-refine state.
 */
export async function runRefineApply(
  sessionId: string,
  reason?: string,
): Promise<RefineApplyOutcome> {
  const store = getRefineStore();
  const entry = store.get(sessionId);
  if (!entry) {
    return {
      ok: false,
      backupId: "",
      result: null,
      reason: "No active session",
    };
  }
  const state = entry.itv.getState();
  if (state.status !== "done" || !state.finalDiff) {
    return {
      ok: false,
      backupId: "",
      result: null,
      reason: `Interview not done (status=${state.status})`,
    };
  }

  // Create backup FIRST. Rollback to pre-refine is always available.
  let backupId: string;
  try {
    const backup = createBackup(
      reason ?? `dashboard-refine-${entry.mode}`,
    );
    backupId = backup.id;
  } catch (err) {
    return {
      ok: false,
      backupId: "",
      result: null,
      reason: `Backup failed: ${(err as Error).message}`,
    };
  }

  const diff = filterDiffForSection(state.finalDiff, entry.section);
  if (!diff) {
    return {
      ok: false,
      backupId,
      result: null,
      reason: "No diff to apply after section filter",
    };
  }

  let mergeResult: MergeResult;
  try {
    mergeResult = applyDiff(HARNESS_DIR, diff);
  } catch (err) {
    return {
      ok: false,
      backupId,
      result: null,
      reason: `applyDiff failed: ${(err as Error).message}`,
    };
  }

  if (!mergeResult.ok) {
    return {
      ok: false,
      backupId,
      result: mergeResult,
      reason: "applyDiff reported failure",
    };
  }

  // Best-effort recompile; don't fail the whole flow if CLAUDE.md is missing.
  try {
    compileHarness();
  } catch (err) {
    console.warn(
      `[refine/apply] compileHarness failed: ${(err as Error).message}`,
    );
  }

  // Clean up session on success.
  store.destroy(sessionId);

  return {
    ok: true,
    backupId,
    result: mergeResult,
  };
}

export function runRefineCancel(sessionId: string): boolean {
  const store = getRefineStore();
  const entry = store.get(sessionId);
  if (!entry) return false;
  try {
    entry.itv.abort("Cancelled by user");
  } catch {
    // ignore
  }
  store.destroy(sessionId);
  return true;
}
