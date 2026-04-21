import { requireApiAuth } from "@/lib/auth";
import { getStore } from "@/lib/onboarding-sessions";
import type { OnboardingApiError } from "@/lib/onboarding-types";

/**
 * POST /api/onboarding/preview
 *
 * Recomputes the preview of the current finalDiff (or the last-emitted asking
 * diff if the interviewer keeps incremental preview in future versions).
 *
 * For now it simply re-emits a snapshot — identical to GET /state but POST to
 * allow future body-driven variants (e.g. user-edited overrides).
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const snapshot = store.toSnapshot();
  if (!snapshot) {
    return Response.json(
      { error: "No active session", code: "NO_SESSION" } satisfies OnboardingApiError,
      { status: 404 },
    );
  }
  return Response.json(snapshot);
}
