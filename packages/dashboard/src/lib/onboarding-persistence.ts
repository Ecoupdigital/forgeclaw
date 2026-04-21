/**
 * Persistence of onboarding snapshots to disk.
 *
 * Purpose: survive Next.js server restarts (dev HMR, process crashes).
 * Location: ~/.forgeclaw/onboarding/active.json
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { FORGECLAW_DIR } from "./onboarding-state";
import type { OnboardingSessionSnapshot } from "./onboarding-types";

export const ONBOARDING_DIR = join(FORGECLAW_DIR, "onboarding");
export const ACTIVE_SNAPSHOT_PATH = join(ONBOARDING_DIR, "active.json");

export interface PersistedSnapshot {
  snapshot: OnboardingSessionSnapshot;
  /** Epoch ms of persist call. */
  persistedAt: number;
  /** Schema version — bump on breaking changes. */
  version: 1;
}

export function saveSnapshot(snapshot: OnboardingSessionSnapshot): void {
  try {
    mkdirSync(ONBOARDING_DIR, { recursive: true });
  } catch {
    // EEXIST — ignore
  }
  const persisted: PersistedSnapshot = {
    snapshot,
    persistedAt: Date.now(),
    version: 1,
  };
  const tmp = ACTIVE_SNAPSHOT_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(persisted, null, 2) + "\n", "utf-8");
  renameSync(tmp, ACTIVE_SNAPSHOT_PATH);
}

export function loadSnapshot(): PersistedSnapshot | null {
  try {
    if (!existsSync(ACTIVE_SNAPSHOT_PATH)) return null;
    const raw = readFileSync(ACTIVE_SNAPSHOT_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (p.version !== 1) return null;
    if (!p.snapshot || typeof p.snapshot !== "object") return null;
    return p as unknown as PersistedSnapshot;
  } catch (err) {
    console.warn("[onboarding/persistence] loadSnapshot failed:", (err as Error).message);
    return null;
  }
}

export function clearSnapshot(): void {
  try {
    if (existsSync(ACTIVE_SNAPSHOT_PATH)) {
      unlinkSync(ACTIVE_SNAPSHOT_PATH);
    }
  } catch {
    // best-effort
  }
}
