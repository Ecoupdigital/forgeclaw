import { readOnboardedMeta } from "@/lib/onboarding-state";

/**
 * Onboarding landing page.
 *
 * This is a server component. The interactive client component lives at
 * `@/components/onboarding/OnboardingApp` (created in 27-03).
 *
 * For 27-01 we render a minimal placeholder so:
 *  - the route exists and the proxy gate has something to redirect to;
 *  - visiting http://localhost:4040/onboarding returns 200 (CLI 25-03 health check).
 */
export default function OnboardingPage() {
  // readOnboardedMeta is only truthy if .onboarded exists — layout already
  // redirects to / in that case. This extra check is defensive for SSR
  // fallbacks where layout redirect might not have resolved yet.
  const meta = readOnboardedMeta();
  if (meta) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-text-secondary">
          Already onboarded at {meta.at}. Redirecting…
        </p>
      </div>
    );
  }

  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-mono text-3xl text-violet/40">FC</div>
      <h1 className="text-2xl font-bold text-text-primary">
        Welcome to ForgeClaw
      </h1>
      <p className="max-w-md text-sm text-text-secondary">
        Setting up your harness. The conversational onboarding UI is coming
        online. If you are here from the installer, hang tight — this page
        will upgrade itself as the interview starts.
      </p>
      <p className="font-mono text-xs text-text-disabled">
        onboarding route: ready · interviewer: pending (27-02)
      </p>
    </main>
  );
}
