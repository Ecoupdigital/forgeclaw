/**
 * Sentinel file writer for refine completion.
 *
 * Contract (matches packages/cli/src/utils/refine-dashboard.ts):
 *   Path: ~/.forgeclaw/.refining-done
 *   Shape: { status: 'applied'|'cancelled'|'error', backupId?, error?, timestamp }
 *
 * The CLI polls for this file and removes it after reading. We write
 * atomically (tmp + rename) so the CLI never observes a half-written sentinel.
 */

import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { FORGECLAW_DIR } from "./onboarding-state";

export const REFINE_SENTINEL_PATH = join(FORGECLAW_DIR, ".refining-done");

export type RefineSentinelStatus = "applied" | "cancelled" | "error";

export interface RefineSentinelPayload {
  status: RefineSentinelStatus;
  backupId?: string;
  error?: string;
  timestamp: string;
}

/**
 * Atomically write the refine sentinel file.
 *
 * @param payload Completion payload; timestamp defaults to now if omitted.
 * @returns Absolute path of the sentinel (useful for response bodies).
 */
export function writeRefineSentinel(
  payload: Omit<RefineSentinelPayload, "timestamp"> &
    Partial<Pick<RefineSentinelPayload, "timestamp">>,
): string {
  const full: RefineSentinelPayload = {
    status: payload.status,
    backupId: payload.backupId,
    error: payload.error,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
  const dir = dirname(REFINE_SENTINEL_PATH);
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // EEXIST — ignore
  }
  const tmp = REFINE_SENTINEL_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(full, null, 2) + "\n", "utf-8");
  renameSync(tmp, REFINE_SENTINEL_PATH);
  return REFINE_SENTINEL_PATH;
}
