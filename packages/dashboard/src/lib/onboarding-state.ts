/**
 * Onboarding state helpers.
 *
 * Sentinel file `~/.forgeclaw/.onboarded` marks the dashboard as past first-run.
 * The proxy (src/proxy.ts) consults isOnboarded() synchronously on every request
 * so the read MUST stay cheap (single existsSync call).
 *
 * markOnboarded() writes atomically (tmp + renameSync) so the sentinel is never
 * observed in a half-written state even if the process crashes mid-write.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const FORGECLAW_DIR = join(homedir(), ".forgeclaw");
export const HARNESS_DIR = join(FORGECLAW_DIR, "harness");
export const SENTINEL_FILENAME = ".onboarded";
export const SENTINEL_PATH = join(FORGECLAW_DIR, SENTINEL_FILENAME);

export interface OnboardedMeta {
  /** ISO string when markOnboarded ran. */
  at: string;
  /** Epoch ms equivalent. */
  atEpoch: number;
  /** Archetype selected during install (informational). */
  archetype?: string;
  /** Optional summary from the interviewer. */
  summary?: string;
  /** 'installer' = template only, 'interview' = interview diff applied, 'skipped' = user skipped interview. */
  source: "installer" | "interview" | "skipped";
}

/**
 * Synchronous existence check. Safe to call on every request.
 * Returns false on any read error (treat as "not onboarded yet").
 */
export function isOnboarded(): boolean {
  try {
    return existsSync(SENTINEL_PATH);
  } catch {
    return false;
  }
}

/**
 * Read sentinel JSON payload. Returns null when sentinel missing or unparseable.
 */
export function readOnboardedMeta(): OnboardedMeta | null {
  try {
    if (!existsSync(SENTINEL_PATH)) return null;
    const raw = readFileSync(SENTINEL_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.at !== "string" || typeof o.source !== "string") return null;
    const source = o.source as OnboardedMeta["source"];
    if (source !== "installer" && source !== "interview" && source !== "skipped") {
      return null;
    }
    return {
      at: o.at,
      atEpoch: typeof o.atEpoch === "number" ? o.atEpoch : Date.parse(o.at),
      archetype: typeof o.archetype === "string" ? o.archetype : undefined,
      summary: typeof o.summary === "string" ? o.summary : undefined,
      source,
    };
  } catch {
    return null;
  }
}

/**
 * Atomically write the sentinel. Creates FORGECLAW_DIR if missing.
 * Safe to call repeatedly (overwrites).
 */
export function markOnboarded(meta: Omit<OnboardedMeta, "at" | "atEpoch">): OnboardedMeta {
  const now = Date.now();
  const full: OnboardedMeta = {
    at: new Date(now).toISOString(),
    atEpoch: now,
    ...meta,
  };
  try {
    mkdirSync(FORGECLAW_DIR, { recursive: true });
  } catch {
    // mkdir can throw EEXIST — ignore
  }
  const tmp = SENTINEL_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(full, null, 2) + "\n", "utf-8");
  renameSync(tmp, SENTINEL_PATH);
  return full;
}

/**
 * Remove the sentinel. Used by `forgeclaw refine` (fase 28) to re-enable
 * onboarding. Safe when sentinel absent.
 */
export function clearOnboarded(): void {
  try {
    if (existsSync(SENTINEL_PATH)) {
      unlinkSync(SENTINEL_PATH);
    }
  } catch {
    // swallow — callers only need best-effort
  }
}

/**
 * Checks that the harness directory exists. Used by /api/onboarding/health.
 */
export function harnessDirExists(): boolean {
  try {
    return existsSync(HARNESS_DIR);
  } catch {
    return false;
  }
}
