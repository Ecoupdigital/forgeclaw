import { requireApiAuth } from "@/lib/auth";
import { getStore, runStart } from "@/lib/onboarding-sessions";
import type { OnboardingApiError } from "@/lib/onboarding-types";

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  // If already active, return its snapshot (idempotent)
  if (store.hasActive()) {
    const snap = store.toSnapshot();
    if (snap) return Response.json(snap);
  }

  try {
    // runStart reads archetype from config (or persisted snapshot as fallback —
    // see resolveArchetype in onboarding-sessions.ts) and starts a fresh
    // interviewer. History from persistence is read-only context for the user.
    const snapshot = await runStart();
    return Response.json(snapshot);
  } catch (err) {
    const message = (err as Error).message;
    return Response.json(
      {
        error: `Failed to resume: ${message}`,
        code: "INTERVIEWER_FAILED",
      } satisfies OnboardingApiError,
      { status: 500 },
    );
  }
}
