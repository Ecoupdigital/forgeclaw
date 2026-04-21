import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- Isolated HOME strategy ---
// Node/Bun `os.homedir()` reads from system passwd, NOT process.env.HOME.
// We vi.mock('node:os') to force homedir() to return a per-test tmpdir so we
// NEVER touch the real ~/.forgeclaw. FORGECLAW_DIR / SENTINEL_PATH are
// computed at module load, so we vi.resetModules() + re-mock per test.
//
// CRITICAL: `vi.mock` is auto-hoisted above top-level `let`/`const`, so any
// variable referenced inside the factory closure must be wrapped in
// `vi.hoisted()` — otherwise it reads `undefined` and the mock silently
// falls back to actual homedir (which in this sandbox is /root, where the
// real ~/.forgeclaw.onboarded may exist and pollute assertions).

const mocks = vi.hoisted(() => ({ tmpHome: "" }));

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    default: { ...actual, homedir: () => mocks.tmpHome },
    homedir: () => mocks.tmpHome,
  };
});

beforeEach(() => {
  mocks.tmpHome = mkdtempSync(join(tmpdir(), "fc-onb-state-"));
  vi.resetModules();
});

afterEach(() => {
  try {
    rmSync(mocks.tmpHome, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("onboarding-state (with isolated HOME)", () => {
  it("isOnboarded returns false when sentinel absent", async () => {
    const mod = await import("../src/lib/onboarding-state");
    expect(mod.FORGECLAW_DIR.startsWith(mocks.tmpHome)).toBe(true);
    expect(mod.isOnboarded()).toBe(false);
    expect(mod.readOnboardedMeta()).toBeNull();
  });

  it("markOnboarded + isOnboarded + readOnboardedMeta roundtrip", async () => {
    const mod = await import("../src/lib/onboarding-state");
    const meta = mod.markOnboarded({
      source: "interview",
      archetype: "solo-builder",
      summary: "test",
    });
    expect(mod.isOnboarded()).toBe(true);
    expect(existsSync(mod.SENTINEL_PATH)).toBe(true);
    const read = mod.readOnboardedMeta();
    expect(read?.source).toBe("interview");
    expect(read?.archetype).toBe("solo-builder");
    expect(read?.summary).toBe("test");
    expect(typeof read?.at).toBe("string");
    expect(typeof read?.atEpoch).toBe("number");
    expect(meta.at).toEqual(read?.at);
  });

  it("readOnboardedMeta returns null for malformed sentinel", async () => {
    const mod = await import("../src/lib/onboarding-state");
    mkdirSync(mod.FORGECLAW_DIR, { recursive: true });
    writeFileSync(mod.SENTINEL_PATH, "{not valid json");
    expect(mod.isOnboarded()).toBe(true); // file exists
    expect(mod.readOnboardedMeta()).toBeNull();
  });

  it("readOnboardedMeta returns null for unknown source value", async () => {
    const mod = await import("../src/lib/onboarding-state");
    mkdirSync(mod.FORGECLAW_DIR, { recursive: true });
    writeFileSync(
      mod.SENTINEL_PATH,
      JSON.stringify({ at: "2026-04-21T00:00:00Z", source: "hacker" }),
    );
    expect(mod.readOnboardedMeta()).toBeNull();
  });

  it("clearOnboarded removes sentinel safely when missing or present", async () => {
    const mod = await import("../src/lib/onboarding-state");
    mod.clearOnboarded(); // no-op when missing
    mod.markOnboarded({ source: "installer" });
    expect(mod.isOnboarded()).toBe(true);
    mod.clearOnboarded();
    expect(mod.isOnboarded()).toBe(false);
  });

  it("markOnboarded is atomic (no leftover .tmp)", async () => {
    const mod = await import("../src/lib/onboarding-state");
    mod.markOnboarded({ source: "skipped" });
    expect(existsSync(mod.SENTINEL_PATH + ".tmp")).toBe(false);
    expect(existsSync(mod.SENTINEL_PATH)).toBe(true);
  });

  it("markOnboarded creates FORGECLAW_DIR when missing", async () => {
    const mod = await import("../src/lib/onboarding-state");
    expect(existsSync(mod.FORGECLAW_DIR)).toBe(false);
    mod.markOnboarded({ source: "installer" });
    expect(existsSync(mod.FORGECLAW_DIR)).toBe(true);
  });

  it("markOnboarded overwrites existing sentinel (idempotent)", async () => {
    const mod = await import("../src/lib/onboarding-state");
    mod.markOnboarded({ source: "installer" });
    const first = mod.readOnboardedMeta();
    const laterMeta = mod.markOnboarded({
      source: "interview",
      archetype: "solo-builder",
    });
    expect(laterMeta.source).toBe("interview");
    const second = mod.readOnboardedMeta();
    expect(second?.source).toBe("interview");
    expect(second?.archetype).toBe("solo-builder");
    expect(first?.source).toBe("installer");
  });

  it("harnessDirExists returns false when dir missing, true when present", async () => {
    const mod = await import("../src/lib/onboarding-state");
    expect(mod.harnessDirExists()).toBe(false);
    mkdirSync(mod.HARNESS_DIR, { recursive: true });
    expect(mod.harnessDirExists()).toBe(true);
  });
});
