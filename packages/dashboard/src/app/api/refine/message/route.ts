/**
 * POST /api/refine/message
 *   Send a user answer to the interviewer for an active refine session.
 *
 * Body: { sessionId: string, text: string }
 *
 * Mirrors /api/onboarding/message with a sessionId requirement (refine
 * supports multiple concurrent sessions, unlike onboarding which is
 * single-user first-run).
 */

import { requireApiAuth } from "@/lib/auth";
import {
  getRefineStore,
  runRefineAnswer,
} from "@/lib/refine-sessions";
import type { RefineApiError } from "@/lib/refine-types";

interface MessageBody {
  sessionId?: unknown;
  text?: unknown;
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  let body: MessageBody;
  try {
    body = (await request.json()) as MessageBody;
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

  if (typeof body.text !== "string" || body.text.trim().length === 0) {
    return Response.json(
      {
        error: "Body field 'text' must be a non-empty string",
        code: "INVALID_INPUT",
      } satisfies RefineApiError,
      { status: 400 },
    );
  }

  const text = body.text.trim();
  if (text.length > 4000) {
    return Response.json(
      {
        error: "text exceeds 4000 chars",
        code: "INVALID_INPUT",
      } satisfies RefineApiError,
      { status: 400 },
    );
  }

  const sessionId = body.sessionId;
  const store = getRefineStore();
  const entry = store.get(sessionId);
  if (!entry) {
    return Response.json(
      {
        error: `Session not found or expired: ${sessionId}`,
        code: "NO_SESSION",
      } satisfies RefineApiError,
      { status: 404 },
    );
  }

  const state = entry.itv.getState();
  if (state.status === "done") {
    return Response.json(
      {
        error: "Interview already done — open the preview and approve/cancel",
        code: "NOT_DONE",
      } satisfies RefineApiError,
      { status: 409 },
    );
  }
  if (state.status !== "asking") {
    return Response.json(
      {
        error: `Cannot answer when status=${state.status}`,
        code: "INVALID_INPUT",
      } satisfies RefineApiError,
      { status: 409 },
    );
  }

  try {
    const snapshot = await runRefineAnswer(sessionId, text);
    return Response.json(snapshot);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[refine/message] failed:", message);
    return Response.json(
      {
        error: `Interviewer turn failed: ${message}`,
        code: "INTERVIEWER_FAILED",
      } satisfies RefineApiError,
      { status: 500 },
    );
  }
}
