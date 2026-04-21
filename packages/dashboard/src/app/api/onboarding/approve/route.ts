import { requireApiAuth } from "@/lib/auth";
import { getStore } from "@/lib/onboarding-sessions";
import { markOnboarded, SENTINEL_PATH } from "@/lib/onboarding-state";
import type {
  OnboardingApiError,
  OnboardingApproveResponse,
} from "@/lib/onboarding-types";

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const entry = store.getActive();
  if (!entry) {
    return Response.json(
      { error: "No active session", code: "NO_SESSION" } satisfies OnboardingApiError,
      { status: 404 },
    );
  }

  const state = entry.itv.getState();
  if (state.status !== "done") {
    return Response.json(
      {
        error: `Cannot approve: interview status=${state.status}`,
        code: "NOT_DONE",
      } satisfies OnboardingApiError,
      { status: 409 },
    );
  }

  const result = store.applyFinalDiff();
  if (!result.ok || !result.result) {
    return Response.json(
      {
        error: `Failed to apply diff: ${result.reason ?? "unknown"}`,
        code: "HARNESS_APPLY_FAILED",
        details: result.result ?? null,
      } satisfies OnboardingApiError,
      { status: 500 },
    );
  }

  const summary = state.finalDiff?.summary ?? "Interview done";
  markOnboarded({
    source: "interview",
    archetype: entry.archetype,
    summary,
  });
  store.destroy();

  return Response.json({
    ok: true,
    appliedFiles: result.result.appliedFiles,
    skippedFiles: result.result.skippedFiles,
    sentinelPath: SENTINEL_PATH,
    redirectTo: "/",
  } satisfies OnboardingApproveResponse);
}
