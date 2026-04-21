/**
 * POST /api/refine/session/cancel
 *   Cancels an active refine session without touching disk. Writes a
 *   'cancelled' sentinel so the CLI poller exits cleanly.
 *
 * Body: { sessionId: string }
 */

import { requireApiAuth } from "@/lib/auth";
import { runRefineCancel } from "@/lib/refine-sessions";
import { writeRefineSentinel, REFINE_SENTINEL_PATH } from "@/lib/refine-sentinel";
import type {
  RefineApiError,
  RefineCancelBody,
  RefineCancelResponse,
} from "@/lib/refine-types";

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  let body: RefineCancelBody;
  try {
    body = (await request.json()) as RefineCancelBody;
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

  const cancelled = runRefineCancel(body.sessionId);

  // Always write the sentinel even when the session was already gone — the
  // CLI is blocked on the sentinel and only cares about the final status.
  try {
    writeRefineSentinel({ status: "cancelled" });
  } catch (err) {
    console.warn(
      `[refine/cancel] sentinel write failed: ${(err as Error).message}`,
    );
  }

  if (!cancelled) {
    // Session already gone; still return 200 (idempotent) — the sentinel is
    // what matters for the CLI. Signal the state via `alreadyGone` flag.
    return Response.json({
      ok: true,
      sentinelPath: REFINE_SENTINEL_PATH,
    } satisfies RefineCancelResponse);
  }

  return Response.json({
    ok: true,
    sentinelPath: REFINE_SENTINEL_PATH,
  } satisfies RefineCancelResponse);
}
