/**
 * POST /api/refine/apply
 *   Apply the diff from an active refine session:
 *     1. createBackup() of current harness
 *     2. filter diff for section mode
 *     3. applyDiff(HARNESS_DIR, diff)
 *     4. compileHarness() to regenerate CLAUDE.md
 *     5. Write refine sentinel so CLI unblocks
 *     6. Destroy session
 *
 * Body: { sessionId: string, reason?: string }
 */

import { requireApiAuth } from "@/lib/auth";
import { runRefineApply } from "@/lib/refine-sessions";
import { writeRefineSentinel, REFINE_SENTINEL_PATH } from "@/lib/refine-sentinel";
import type {
  RefineApiError,
  RefineApplyBody,
  RefineApplyResponse,
} from "@/lib/refine-types";

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  let body: RefineApplyBody;
  try {
    body = (await request.json()) as RefineApplyBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON body", code: "INVALID_INPUT" } satisfies RefineApiError,
      { status: 400 },
    );
  }

  if (typeof body.sessionId !== "string" || body.sessionId.length === 0) {
    return Response.json(
      {
        error: "Body field 'sessionId' must be a non-empty string",
        code: "INVALID_INPUT",
      } satisfies RefineApiError,
      { status: 400 },
    );
  }

  const reason = typeof body.reason === "string" ? body.reason : undefined;

  let outcome;
  try {
    outcome = await runRefineApply(body.sessionId, reason);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[refine/apply] failed:", message);
    // Sentinel so the CLI doesn't hang.
    try {
      writeRefineSentinel({ status: "error", error: message });
    } catch {
      // swallow: sentinel write failures are non-fatal for the HTTP response
    }
    return Response.json(
      {
        error: `apply failed: ${message}`,
        code: "HARNESS_APPLY_FAILED",
      } satisfies RefineApiError,
      { status: 500 },
    );
  }

  if (!outcome.ok) {
    // Write an error sentinel so CLI can report + exit 1.
    try {
      writeRefineSentinel({
        status: "error",
        error: outcome.reason ?? "apply failed",
        backupId: outcome.backupId || undefined,
      });
    } catch {
      // ignore
    }
    return Response.json(
      {
        error: outcome.reason ?? "apply failed",
        code: outcome.backupId ? "HARNESS_APPLY_FAILED" : "BACKUP_FAILED",
        details: outcome.result,
      } satisfies RefineApiError,
      { status: 500 },
    );
  }

  // Success: write sentinel so CLI poller unblocks with applied.
  try {
    writeRefineSentinel({
      status: "applied",
      backupId: outcome.backupId,
    });
  } catch (err) {
    console.warn(
      `[refine/apply] sentinel write failed: ${(err as Error).message}`,
    );
  }

  return Response.json({
    ok: true,
    backupId: outcome.backupId,
    appliedFiles: outcome.result?.appliedFiles ?? [],
    skippedFiles: outcome.result?.skippedFiles ?? [],
    sentinelPath: REFINE_SENTINEL_PATH,
  } satisfies RefineApplyResponse);
}
