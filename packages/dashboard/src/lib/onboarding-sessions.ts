/**
 * OnboardingSessionStore — singleton in-memory holder for the active
 * Interviewer. Lives in the Next.js server process.
 *
 * First-run flow is single-user / single-session, so we keep it simple: one
 * active session at a time, indexed by a random sessionId for correlation.
 */

import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  Interviewer,
  previewDiff,
  applyDiff,
  type InterviewState,
  type HarnessDiff,
  type ArchetypeSlug,
  type MergeResult,
  HARNESS_FILES_ALL,
} from "@forgeclaw/core";
import { HARNESS_DIR } from "./onboarding-state";
import type {
  OnboardingSessionSnapshot,
  OnboardingMessageDTO,
  OnboardingHarnessFileDTO,
  OnboardingDiffSummary,
  OnboardingBudgetDTO,
  OnboardingStatus,
} from "./onboarding-types";

interface SessionEntry {
  sessionId: string;
  itv: Interviewer;
  archetype: ArchetypeSlug;
  currentQuestion: string | null;
  currentRationale: string | null;
  createdAt: number;
}

class OnboardingSessionStoreImpl {
  private active: SessionEntry | null = null;

  hasActive(): boolean {
    return this.active !== null;
  }

  getActive(): SessionEntry | null {
    return this.active;
  }

  /**
   * Create a new session. If one already exists, return it (idempotent).
   */
  createSession(archetype: ArchetypeSlug): SessionEntry {
    if (this.active) return this.active;
    const sessionId = randomUUID();
    const itv = new Interviewer({
      archetype,
      harnessDir: HARNESS_DIR,
    });
    const entry: SessionEntry = {
      sessionId,
      itv,
      archetype,
      currentQuestion: null,
      currentRationale: null,
      createdAt: Date.now(),
    };
    this.active = entry;
    return entry;
  }

  /** Destroy the active session (used after approve/skip). */
  destroy(): void {
    if (this.active) {
      try { this.active.itv.abort("Session destroyed"); } catch { /* ignore */ }
    }
    this.active = null;
  }

  /** Update cached question (called after start/answer). */
  setCurrentQuestion(question: string | null, rationale: string | null): void {
    if (!this.active) return;
    this.active.currentQuestion = question;
    this.active.currentRationale = rationale;
  }

  /** Serialize active session to a DTO for the client. */
  toSnapshot(): OnboardingSessionSnapshot | null {
    if (!this.active) return null;
    const state = this.active.itv.getState();
    return buildSnapshot(this.active, state);
  }

  /** Apply the final diff to disk. Returns MergeResult from @forgeclaw/core. */
  applyFinalDiff(): { ok: boolean; result: MergeResult | null; reason?: string } {
    if (!this.active) return { ok: false, result: null, reason: "No active session" };
    const state = this.active.itv.getState();
    if (state.status !== "done" || !state.finalDiff) {
      return { ok: false, result: null, reason: `Interview not done (status=${state.status})` };
    }
    try {
      const result = applyDiff(HARNESS_DIR, state.finalDiff);
      return { ok: result.ok, result };
    } catch (err) {
      return { ok: false, result: null, reason: (err as Error).message };
    }
  }
}

// --- Singleton bootstrap ---

// Using a module-level symbol protects against HMR duplicating the singleton
// in dev. Production uses a plain module-scoped variable.
const GLOBAL_KEY = Symbol.for("forgeclaw.onboarding.store");
type GlobalWithStore = typeof globalThis & {
  [GLOBAL_KEY]?: OnboardingSessionStoreImpl;
};
const g = globalThis as GlobalWithStore;
if (!g[GLOBAL_KEY]) {
  g[GLOBAL_KEY] = new OnboardingSessionStoreImpl();
}
const STORE = g[GLOBAL_KEY];

export function getStore(): OnboardingSessionStoreImpl {
  return STORE;
}

// --- Snapshot builder ---

function buildSnapshot(
  entry: SessionEntry,
  state: InterviewState,
): OnboardingSessionSnapshot {
  const messages: OnboardingMessageDTO[] = state.turns.map((t) => ({
    index: t.index,
    role: t.role,
    // For interviewer turns, the raw text includes the JSON block — strip it
    // for UI clarity if the cached question is already available.
    text: t.role === "interviewer" ? stripJsonBlock(t.text) : t.text,
    at: t.at,
  }));

  const harnessFiles = readHarnessFiles(state.finalDiff);
  const diffSummary = buildDiffSummary(state.finalDiff);

  const budget: OnboardingBudgetDTO = {
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
    status: state.status as OnboardingStatus,
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

function readHarnessFiles(
  diff: HarnessDiff | null,
): OnboardingHarnessFileDTO[] {
  const files: OnboardingHarnessFileDTO[] = [];
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
    if (diff) {
      try {
        const result = previewDiff(HARNESS_DIR, diff);
        const candidate = result.finalContents[name];
        if (typeof candidate === "string") {
          previewContent = candidate;
          changed = candidate !== currentContent;
        }
      } catch {
        // If preview fails for this file, fall back to current
      }
    }
    files.push({ name, currentContent, previewContent, changed });
  }
  return files;
}

function buildDiffSummary(diff: HarnessDiff | null): OnboardingDiffSummary | null {
  if (!diff) return null;
  const filesTouched = diff.diffs.map((d) => d.file);
  const opsCount = diff.diffs.reduce((acc, d) => acc + d.ops.length, 0);
  return { summary: diff.summary, filesTouched, opsCount };
}

// --- Utilities used by API routes ---

export async function runStart(): Promise<OnboardingSessionSnapshot> {
  const store = getStore();
  const archetype = await resolveArchetype();
  const entry = store.createSession(archetype);

  const state = entry.itv.getState();
  if (state.turns.length === 0 && state.status === "pending") {
    const resp = await entry.itv.start();
    if (resp.status === "asking") {
      store.setCurrentQuestion(resp.nextQuestion, resp.rationale ?? null);
    } else if (resp.status === "aborted") {
      // Already aborted at start (e.g. prompt missing) — caller should detect
    }
  }
  const snapshot = store.toSnapshot();
  if (!snapshot) throw new Error("Snapshot unavailable after start");
  return snapshot;
}

export async function runAnswer(
  text: string,
): Promise<OnboardingSessionSnapshot> {
  const store = getStore();
  const entry = store.getActive();
  if (!entry) throw new Error("No active session");
  const resp = await entry.itv.answer(text);
  if (resp.status === "asking") {
    store.setCurrentQuestion(resp.nextQuestion, resp.rationale ?? null);
  } else {
    store.setCurrentQuestion(null, null);
  }
  const snapshot = store.toSnapshot();
  if (!snapshot) throw new Error("Snapshot unavailable after answer");
  return snapshot;
}

/**
 * Load archetype from forgeclaw.config.json. Fallback to 'generic' with warn.
 */
async function resolveArchetype(): Promise<ArchetypeSlug> {
  const CONFIG_PATH = join(HARNESS_DIR, "..", "forgeclaw.config.json");
  try {
    if (!existsSync(CONFIG_PATH)) {
      console.warn("[onboarding] config missing, using archetype=generic");
      return "generic";
    }
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const slug = parsed.archetype;
    if (
      slug === "solo-builder" ||
      slug === "content-creator" ||
      slug === "agency-freela" ||
      slug === "ecom-manager" ||
      slug === "generic"
    ) {
      return slug;
    }
    console.warn(
      `[onboarding] config.archetype missing or invalid (${String(slug)}), using generic`,
    );
    return "generic";
  } catch (err) {
    console.warn(
      `[onboarding] failed to read config archetype: ${(err as Error).message}`,
    );
    return "generic";
  }
}
