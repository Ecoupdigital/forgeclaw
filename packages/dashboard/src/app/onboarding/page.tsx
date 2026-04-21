import { readOnboardedMeta } from "@/lib/onboarding-state";
import { OnboardingApp } from "@/components/onboarding/OnboardingApp";

export default function OnboardingPage() {
  // Defensive check (layout ja redireciona se sentinel existe)
  const meta = readOnboardedMeta();
  if (meta) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-text-secondary">
          Already onboarded at {meta.at}. Redirecting...
        </p>
      </div>
    );
  }

  return <OnboardingApp />;
}
