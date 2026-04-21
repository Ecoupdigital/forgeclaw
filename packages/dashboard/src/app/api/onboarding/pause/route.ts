import { requireApiAuth } from "@/lib/auth";
import { getStore } from "@/lib/onboarding-sessions";
import { saveSnapshot } from "@/lib/onboarding-persistence";
import type { OnboardingApiError } from "@/lib/onboarding-types";

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const snapshot = store.toSnapshot();
  if (!snapshot) {
    return Response.json(
      { error: "No active session to pause", code: "NO_SESSION" } satisfies OnboardingApiError,
      { status: 404 },
    );
  }

  try {
    saveSnapshot(snapshot);
  } catch (err) {
    return Response.json(
      {
        error: `Failed to persist snapshot: ${(err as Error).message}`,
        code: "INTERNAL",
      } satisfies OnboardingApiError,
      { status: 500 },
    );
  }

  // Abort the in-memory interviewer (user plans to resume later).
  const entry = store.getActive();
  if (entry) {
    try { entry.itv.abort("Paused by user"); } catch { /* ignore */ }
  }

  return Response.json({ ok: true, paused: true, sessionId: snapshot.sessionId });
}
