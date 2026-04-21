import { redirect } from "next/navigation";
import { isOnboarded } from "@/lib/onboarding-state";

export const metadata = {
  title: "ForgeClaw Onboarding",
  description: "First-run setup for your ForgeClaw harness",
};

/**
 * Onboarding layout (server component).
 *
 * Redirects to / when the sentinel exists — this is a belt-and-suspenders
 * guard in case proxy.ts is bypassed (e.g. during middleware evaluation race
 * or when Next.js caches stale responses).
 *
 * No DashboardShell here: the onboarding UI owns the full viewport.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isOnboarded()) {
    redirect("/");
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-void text-text-body">
      {children}
    </div>
  );
}
