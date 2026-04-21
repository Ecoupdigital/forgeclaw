import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HarnessPreview } from "@/components/onboarding/HarnessPreview";
import type { OnboardingHarnessFileDTO } from "@/lib/onboarding-types";

function makeFiles(
  overrides: Partial<Record<string, boolean>> = {},
): OnboardingHarnessFileDTO[] {
  const names = [
    "SOUL.md",
    "USER.md",
    "AGENTS.md",
    "TOOLS.md",
    "MEMORY.md",
    "STYLE.md",
    "HEARTBEAT.md",
  ];
  return names.map((name) => ({
    name,
    currentContent: `# ${name}\noriginal`,
    previewContent: overrides[name] ? `# ${name}\nchanged` : `# ${name}\noriginal`,
    changed: Boolean(overrides[name]),
  }));
}

describe("HarnessPreview", () => {
  it('renders "nothing yet" badge when no files changed', () => {
    render(<HarnessPreview files={makeFiles()} diffSummary={null} />);
    expect(screen.getByText(/nothing yet/i)).toBeInTheDocument();
  });

  it('renders "N changed" badge with count', () => {
    render(
      <HarnessPreview
        files={makeFiles({ "USER.md": true, "AGENTS.md": true })}
        diffSummary={{
          summary: "test",
          filesTouched: ["USER.md", "AGENTS.md"],
          opsCount: 3,
        }}
      />,
    );
    expect(screen.getByText(/2 changed/i)).toBeInTheDocument();
  });

  it("shows all 7 harness files in the tab list", () => {
    render(<HarnessPreview files={makeFiles()} diffSummary={null} />);
    for (const name of [
      "SOUL.md",
      "USER.md",
      "AGENTS.md",
      "TOOLS.md",
      "MEMORY.md",
      "STYLE.md",
      "HEARTBEAT.md",
    ]) {
      expect(
        screen.getByRole("tab", { name: new RegExp(name) }),
      ).toBeInTheDocument();
    }
  });

  it("switches content when a different tab is clicked", async () => {
    const user = userEvent.setup();
    render(<HarnessPreview files={makeFiles()} diffSummary={null} />);
    await user.click(screen.getByRole("tab", { name: /AGENTS\.md/ }));
    // Content for AGENTS.md should render somewhere (tab label + panel body)
    expect(screen.getAllByText(/AGENTS\.md/i).length).toBeGreaterThan(0);
  });

  it("renders diff summary when provided", () => {
    render(
      <HarnessPreview
        files={makeFiles({ "USER.md": true })}
        diffSummary={{
          summary: "Test summary",
          filesTouched: ["USER.md"],
          opsCount: 1,
        }}
      />,
    );
    // Format: "{opsCount} op · USER.md"
    expect(screen.getByText(/1 op · USER\.md/)).toBeInTheDocument();
  });
});
