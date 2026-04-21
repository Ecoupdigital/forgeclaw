import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DiffHighlight } from "@/components/onboarding/DiffHighlight";

describe("DiffHighlight", () => {
  it("renders all lines as unchanged when content is identical", () => {
    const { container } = render(
      <DiffHighlight currentContent={"foo\nbar"} previewContent={"foo\nbar"} />,
    );
    const lines = container.querySelectorAll("span.block");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // No + or - signs visible (only "  " prefix for unchanged)
    const body = container.textContent ?? "";
    expect(body.includes("+ ")).toBe(false);
    expect(body.includes("- ")).toBe(false);
  });

  it("renders added lines with + prefix", () => {
    const { container } = render(
      <DiffHighlight currentContent={"foo"} previewContent={"foo\nbar"} />,
    );
    const body = container.textContent ?? "";
    expect(body.includes("+ ")).toBe(true);
    expect(body.includes("bar")).toBe(true);
  });

  it("renders removed lines with - prefix", () => {
    const { container } = render(
      <DiffHighlight currentContent={"foo\nbar"} previewContent={"foo"} />,
    );
    const body = container.textContent ?? "";
    expect(body.includes("- ")).toBe(true);
    expect(body.includes("bar")).toBe(true);
  });

  it("truncates when exceeding maxLines", () => {
    const many = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n");
    const { container } = render(
      <DiffHighlight currentContent={""} previewContent={many} maxLines={50} />,
    );
    const body = container.textContent ?? "";
    expect(body.includes("more lines truncated")).toBe(true);
  });
});
