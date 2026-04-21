import { requireApiAuth } from "@/lib/auth";
import { getStore } from "@/lib/onboarding-sessions";
import type { OnboardingApiError } from "@/lib/onboarding-types";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const activeSnapshot = store.toSnapshot();
  if (activeSnapshot) {
    return Response.json(activeSnapshot);
  }
  const persisted = store.loadPersistedIfNoActive();
  if (persisted) {
    return Response.json(persisted);
  }
  return Response.json(
    { error: "No active session", code: "NO_SESSION" } satisfies OnboardingApiError,
    { status: 404 },
  );
}
