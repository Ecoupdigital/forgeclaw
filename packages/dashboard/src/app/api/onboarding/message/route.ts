import { requireApiAuth } from "@/lib/auth";
import { getStore, runAnswer } from "@/lib/onboarding-sessions";
import type { OnboardingApiError } from "@/lib/onboarding-types";

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  let text: string;
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text !== "string" || body.text.trim().length === 0) {
      return Response.json(
        {
          error: "Body field 'text' must be a non-empty string",
          code: "INVALID_INPUT",
        } satisfies OnboardingApiError,
        { status: 400 },
      );
    }
    text = body.text.trim();
    if (text.length > 4000) {
      return Response.json(
        {
          error: "text exceeds 4000 chars",
          code: "INVALID_INPUT",
        } satisfies OnboardingApiError,
        { status: 400 },
      );
    }
  } catch {
    return Response.json(
      {
        error: "Invalid JSON body",
        code: "INVALID_INPUT",
      } satisfies OnboardingApiError,
      { status: 400 },
    );
  }

  const store = getStore();
  const entry = store.getActive();
  if (!entry) {
    return Response.json(
      { error: "No active session", code: "NO_SESSION" } satisfies OnboardingApiError,
      { status: 404 },
    );
  }

  const state = entry.itv.getState();
  if (state.status === "done") {
    return Response.json(
      { error: "Interview already done", code: "ALREADY_DONE" } satisfies OnboardingApiError,
      { status: 409 },
    );
  }
  if (state.status !== "asking") {
    return Response.json(
      {
        error: `Cannot answer when status=${state.status}`,
        code: "INVALID_INPUT",
      } satisfies OnboardingApiError,
      { status: 409 },
    );
  }

  try {
    const snapshot = await runAnswer(text);
    return Response.json(snapshot);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[onboarding/message] failure:", message);
    return Response.json(
      {
        error: `Interviewer turn failed: ${message}`,
        code: "INTERVIEWER_FAILED",
      } satisfies OnboardingApiError,
      { status: 500 },
    );
  }
}
