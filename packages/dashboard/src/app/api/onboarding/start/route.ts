import { requireApiAuth } from "@/lib/auth";
import { isOnboarded } from "@/lib/onboarding-state";
import { runStart } from "@/lib/onboarding-sessions";
import type { OnboardingApiError } from "@/lib/onboarding-types";

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  if (isOnboarded()) {
    return Response.json(
      {
        error: "Onboarding already complete",
        code: "ALREADY_DONE",
      } satisfies OnboardingApiError,
      { status: 409 },
    );
  }

  try {
    const snapshot = await runStart();
    return Response.json(snapshot);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[onboarding/start] failure:", message);
    return Response.json(
      {
        error: `Failed to start interviewer: ${message}`,
        code: "INTERVIEWER_FAILED",
      } satisfies OnboardingApiError,
      { status: 500 },
    );
  }
}
