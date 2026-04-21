/**
 * Utilities for delegating `forgeclaw refine` to the running dashboard.
 *
 * The CLI uses these helpers to:
 *  1. Detect whether the dashboard is listening on localhost:4040
 *     (`isDashboardRunning`)
 *  2. Open the browser at `/refine?mode=...` with an auto-login token
 *     (`openDashboardRefine`)
 *  3. Block the CLI process until the dashboard writes a sentinel file with
 *     the completion status (`waitForCompletion`)
 *  4. Read the dashboard auth token from ~/.forgeclaw/forgeclaw.config.json
 *     (`readDashboardToken`)
 *
 * Sentinel contract:
 *   Path:    ~/.forgeclaw/.refining-done
 *   Content: JSON { status: 'applied'|'cancelled'|'error', backupId?, error?, timestamp }
 *   Writer:  dashboard API routes (POST /api/refine/apply, /rollback, /session/cancel)
 *   Reader:  waitForCompletion (removes the file after reading)
 */

import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Archetype } from './refine-archetype'
import type { RefineSection } from '../commands/refine'

const FORGECLAW_DIR = join(homedir(), '.forgeclaw')
const SENTINEL_PATH = join(FORGECLAW_DIR, '.refining-done')
const CONFIG_PATH = join(FORGECLAW_DIR, 'forgeclaw.config.json')

/** Port the dashboard listens on. Must match packages/dashboard/package.json scripts. */
const DASHBOARD_PORT = 4040
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`

/** Max time to wait for the user to finish the dashboard flow (30 min). */
const DEFAULT_COMPLETION_TIMEOUT_MS = 30 * 60 * 1000
/** Poll interval for sentinel detection. */
const POLL_INTERVAL_MS = 2000
/** Timeout for health probe. */
const HEALTH_PROBE_TIMEOUT_MS = 1500

export type RefineMode = 'default' | 'archetype' | 'section' | 'reset'

export interface DashboardRefineParams {
  mode: RefineMode
  archetype?: Archetype
  section?: RefineSection
  /**
   * dashboardToken read from forgeclaw.config.json. Passed via ?token=...
   * query so the dashboard can set the auth cookie and skip the login page.
   */
  token: string
}

export interface CompletionResult {
  status: 'applied' | 'cancelled' | 'error'
  backupId?: string
  error?: string
  timestamp: string
}

/**
 * Probe the dashboard health endpoint with a short timeout.
 *
 * Tries `/api/onboarding/health` (created in Fase 27-01 — public, no auth) and
 * falls back to `GET /` if the health endpoint is unavailable. Any non-200
 * response or network error returns false.
 */
export async function isDashboardRunning(): Promise<boolean> {
  // Primary probe: onboarding health endpoint (public, no auth)
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/onboarding/health`, {
      signal: AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS),
    })
    if (res.ok) return true
  } catch {
    // fall through to generic probe
  }
  // Fallback: root document. Status < 500 = dashboard process is up.
  try {
    const res = await fetch(DASHBOARD_URL, {
      signal: AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS),
    })
    return res.status < 500
  } catch {
    return false
  }
}

/**
 * Build the /refine URL and best-effort open it in the user's browser.
 *
 * - Clears any stale sentinel before opening (so waitForCompletion starts
 *   clean).
 * - Uses platform-specific launchers without adding deps.
 * - Browser launch is fire-and-forget — headless environments just ignore it,
 *   and the caller prints the URL so the user can copy it manually.
 */
export async function openDashboardRefine(
  params: DashboardRefineParams,
): Promise<string> {
  const url = buildRefineUrl(params)

  // Clear any stale sentinel from a previous run.
  try {
    if (existsSync(SENTINEL_PATH)) unlinkSync(SENTINEL_PATH)
  } catch {
    // swallow — best-effort cleanup
  }

  // Best-effort browser launch
  try {
    const platform = process.platform
    if (platform === 'linux') {
      Bun.spawn(['xdg-open', url], { stdout: 'ignore', stderr: 'ignore' })
    } else if (platform === 'darwin') {
      Bun.spawn(['open', url], { stdout: 'ignore', stderr: 'ignore' })
    } else if (platform === 'win32') {
      Bun.spawn(['cmd', '/c', 'start', url], { stdout: 'ignore', stderr: 'ignore' })
    }
    // unknown platform: skip silently
  } catch {
    // spawn failure (command not in PATH etc) — caller prints URL manually
  }

  return url
}

function buildRefineUrl(params: DashboardRefineParams): string {
  const qs = new URLSearchParams()
  qs.set('mode', params.mode)
  if (params.archetype) qs.set('archetype', params.archetype)
  if (params.section) qs.set('section', params.section)
  qs.set('token', params.token)
  return `${DASHBOARD_URL}/refine?${qs.toString()}`
}

/**
 * Poll the sentinel file until it appears (or timeout). When found, parse
 * the JSON payload, remove the sentinel, and return the result.
 *
 * Timeout returns `{ status: 'error', error: 'Timeout...' }` so callers can
 * handle it the same way as a dashboard-reported error.
 */
export async function waitForCompletion(
  timeoutMs: number = DEFAULT_COMPLETION_TIMEOUT_MS,
): Promise<CompletionResult> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (existsSync(SENTINEL_PATH)) {
      let payload: unknown
      try {
        const raw = readFileSync(SENTINEL_PATH, 'utf-8')
        payload = JSON.parse(raw)
      } catch (err) {
        // Remove malformed sentinel and report error — otherwise we'd spin
        // forever re-reading the same bad JSON.
        try {
          unlinkSync(SENTINEL_PATH)
        } catch {
          // ignore
        }
        return {
          status: 'error',
          error: `Failed to parse sentinel: ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        }
      }
      try {
        unlinkSync(SENTINEL_PATH)
      } catch {
        // ignore — sentinel cleanup is best-effort
      }
      return normalizeCompletionResult(payload)
    }
    await sleep(POLL_INTERVAL_MS)
  }
  return {
    status: 'error',
    error: `Timeout waiting for dashboard completion after ${Math.round(timeoutMs / 1000)}s`,
    timestamp: new Date().toISOString(),
  }
}

function normalizeCompletionResult(raw: unknown): CompletionResult {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const statusRaw = typeof o.status === 'string' ? o.status : 'error'
  const status: CompletionResult['status'] =
    statusRaw === 'applied' || statusRaw === 'cancelled' || statusRaw === 'error'
      ? (statusRaw as CompletionResult['status'])
      : 'error'
  return {
    status,
    backupId: typeof o.backupId === 'string' ? o.backupId : undefined,
    error: typeof o.error === 'string' ? o.error : undefined,
    timestamp:
      typeof o.timestamp === 'string' ? o.timestamp : new Date().toISOString(),
  }
}

/**
 * Read `dashboardToken` from ~/.forgeclaw/forgeclaw.config.json. Returns null
 * when config is missing, unreadable, malformed, or has no token.
 *
 * The token is used as a query parameter for auto-login on the /refine page
 * (dashboard sets the fc-token cookie on first request).
 */
export function readDashboardToken(): string | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (typeof parsed.dashboardToken === 'string' && parsed.dashboardToken.length > 0) {
      return parsed.dashboardToken
    }
    return null
  } catch {
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
