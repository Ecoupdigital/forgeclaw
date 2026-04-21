import { requireApiAuth } from "@/lib/auth";
import { getStore } from "@/lib/onboarding-sessions";
import { markOnboarded, SENTINEL_PATH, isOnboarded } from "@/lib/onboarding-state";
import type { OnboardingSkipResponse } from "@/lib/onboarding-types";

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const entry = store.getActive();
  const archetype = entry?.archetype ?? "generic";

  // If there IS an active session we abort it cleanly; otherwise just mark.
  if (entry) {
    try { entry.itv.abort("Skipped by user"); } catch { /* ignore */ }
  }

  if (!isOnboarded()) {
    markOnboarded({
      source: "skipped",
      archetype,
      summary: "User skipped the interview; template applied as-is.",
    });
  }
  store.destroy();

  return Response.json({
    ok: true,
    sentinelPath: SENTINEL_PATH,
    redirectTo: "/",
  } satisfies OnboardingSkipResponse);
}
