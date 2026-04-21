import {
  HARNESS_DIR,
  SENTINEL_PATH,
  isOnboarded,
  harnessDirExists,
} from "@/lib/onboarding-state";

/**
 * Public health endpoint for the onboarding subsystem.
 *
 * Public (no auth) by design: the CLI installer (fase 25-03) polls this
 * before the browser is opened, so no cookie exists yet. The response shape
 * contains no secrets.
 */
export async function GET() {
  let interviewerReady = false;
  let interviewerError: string | undefined;

  try {
    // Dynamic import keeps the edge-runtime path lean in case this route
    // ever gets promoted to edge. For now it runs in Node (default).
    const { loadInterviewerBase } = await import("@forgeclaw/core");
    const prompt = loadInterviewerBase();
    interviewerReady = typeof prompt === "string" && prompt.length > 0;
  } catch (err) {
    interviewerError = (err as Error).message;
  }

  return Response.json({
    ok: true,
    onboarded: isOnboarded(),
    harnessDirExists: harnessDirExists(),
    interviewerReady,
    interviewerError,
    sentinelPath: SENTINEL_PATH,
    harnessDir: HARNESS_DIR,
    serverTime: Date.now(),
  });
}
