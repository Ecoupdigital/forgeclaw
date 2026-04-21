export const metadata = {
  title: "ForgeClaw Refine",
  description: "Re-run the harness interviewer without reinstalling",
};

/**
 * Refine layout owns the full viewport so the split-pane chat + preview
 * (reused from onboarding) has room to breathe. No DashboardShell here.
 */
export default function RefineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-void text-text-body">
      {children}
    </div>
  );
}
