import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsBar } from "@/components/onboarding/ActionsBar";

function noop() {
  /* no-op */
}

describe("ActionsBar", () => {
  it("disables Approve when status is not done", () => {
    render(
      <ActionsBar
        status="asking"
        inFlight={false}
        onApprove={noop}
        onSkip={noop}
        onPause={noop}
      />,
    );
    const approve = screen.getByRole("button", { name: /Aprovar/i });
    expect(approve).toBeDisabled();
  });

  it("enables Approve when status is done", () => {
    render(
      <ActionsBar
        status="done"
        inFlight={false}
        onApprove={noop}
        onSkip={noop}
        onPause={noop}
      />,
    );
    const approve = screen.getByRole("button", { name: /Aprovar/i });
    expect(approve).toBeEnabled();
  });

  it("disables all actions while inFlight", () => {
    render(
      <ActionsBar
        status="done"
        inFlight={true}
        onApprove={noop}
        onSkip={noop}
        onPause={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Pausar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Pular/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Aprovar/i })).toBeDisabled();
  });

  it("invokes onPause without confirmation dialog", async () => {
    const onPause = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionsBar
        status="asking"
        inFlight={false}
        onApprove={noop}
        onSkip={noop}
        onPause={onPause}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Pausar/i }));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it("shows confirmation dialog when Pular is clicked", async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionsBar
        status="asking"
        inFlight={false}
        onApprove={noop}
        onSkip={onSkip}
        onPause={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Pular/i }));
    // Dialog title appears
    expect(
      await screen.findByText(/Pular a entrevista\?/i),
    ).toBeInTheDocument();
    // onSkip not yet called (needs confirm click)
    expect(onSkip).not.toHaveBeenCalled();
    // Click confirm button inside dialog (the last "Pular" button wins —
    // trigger button has aria-label "Pular entrevista...", dialog button
    // has accessible name "Pular")
    const pularButtons = await screen.findAllByRole("button", {
      name: /^Pular$/i,
    });
    expect(pularButtons.length).toBeGreaterThanOrEqual(1);
    await user.click(pularButtons[pularButtons.length - 1]);
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("calls onApprove after confirming the Aprovar dialog", async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionsBar
        status="done"
        inFlight={false}
        onApprove={onApprove}
        onSkip={noop}
        onPause={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Aprovar/i }));
    expect(await screen.findByText(/Aprovar e aplicar\?/i)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /Aplicar/i }));
    expect(onApprove).toHaveBeenCalledOnce();
  });
});
