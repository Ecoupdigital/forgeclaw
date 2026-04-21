import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- Isolated HOME strategy ---
// Node/Bun `os.homedir()` reads from the system passwd entry, NOT
// process.env.HOME. `vi.mock('node:os')` does NOT reach transitive imports
// under the dashboard vitest setup (jsdom + @ alias + project config), and
// `vi.spyOn` on ESM bindings is not configurable. So we use `vi.doMock` to
// replace the specific module that owns FORGECLAW_DIR (`./onboarding-state`)
// with a tmp-home version. onboarding-persistence imports FORGECLAW_DIR from
// that module, so this reliably isolates every test run.

let tmpHome: string;

const FAKE_SNAPSHOT = {
  sessionId: "abc",
  archetype: "solo-builder",
  status: "asking" as const,
  messages: [],
  currentQuestion: "oi?",
  currentRationale: null,
  harnessFiles: [],
  diffSummary: null,
  budget: {
    turnsUsed: 1,
    maxTurns: 30,
    inputTokensUsed: 0,
    maxInputTokens: 80000,
    outputTokensUsed: 0,
    maxOutputTokens: 20000,
    elapsedMs: 10,
    timeoutMs: 900000,
    withinLimits: true,
  },
  startedAt: Date.now(),
  updatedAt: Date.now(),
};

beforeEach(() => {
  tmpHome = mkdtempSync(join(tmpdir(), "fc-onb-pers-"));
  vi.resetModules();
  // Redirect the constants owned by onboarding-state so that any transitive
  // import (including onboarding-persistence's `import { FORGECLAW_DIR }`)
  // points at the test tmpHome instead of ~/.forgeclaw.
  vi.doMock("@/lib/onboarding-state", () => ({
    FORGECLAW_DIR: join(tmpHome, ".forgeclaw"),
    HARNESS_DIR: join(tmpHome, ".forgeclaw", "harness"),
    SENTINEL_FILENAME: ".onboarded",
    SENTINEL_PATH: join(tmpHome, ".forgeclaw", ".onboarded"),
    isOnboarded: () => false,
    markOnboarded: () => ({ at: "", atEpoch: 0, source: "installer" }),
    readOnboardedMeta: () => null,
    clearOnboarded: () => {},
    harnessDirExists: () => false,
  }));
});

afterEach(() => {
  vi.doUnmock("@/lib/onboarding-state");
  try {
    rmSync(tmpHome, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("onboarding-persistence (isolated HOME)", () => {
  it("loadSnapshot returns null when file absent", async () => {
    const mod = await import("../src/lib/onboarding-persistence");
    expect(mod.ACTIVE_SNAPSHOT_PATH.startsWith(tmpHome)).toBe(true);
    expect(mod.loadSnapshot()).toBeNull();
  });

  it("saveSnapshot + loadSnapshot roundtrip", async () => {
    const mod = await import("../src/lib/onboarding-persistence");
    mod.saveSnapshot(FAKE_SNAPSHOT);
    const loaded = mod.loadSnapshot();
    expect(loaded?.version).toBe(1);
    expect(loaded?.snapshot.sessionId).toBe("abc");
    expect(loaded?.snapshot.archetype).toBe("solo-builder");
    expect(typeof loaded?.persistedAt).toBe("number");
  });

  it("clearSnapshot removes file safely (idempotent)", async () => {
    const mod = await import("../src/lib/onboarding-persistence");
    mod.clearSnapshot(); // no-op when missing
    mod.saveSnapshot(FAKE_SNAPSHOT);
    expect(mod.loadSnapshot()).not.toBeNull();
    mod.clearSnapshot();
    expect(mod.loadSnapshot()).toBeNull();
  });

  it("saveSnapshot is atomic (no residual .tmp file)", async () => {
    const mod = await import("../src/lib/onboarding-persistence");
    mod.saveSnapshot(FAKE_SNAPSHOT);
    expect(existsSync(mod.ACTIVE_SNAPSHOT_PATH + ".tmp")).toBe(false);
    expect(existsSync(mod.ACTIVE_SNAPSHOT_PATH)).toBe(true);
  });

  it("loadSnapshot returns null for malformed JSON", async () => {
    const mod = await import("../src/lib/onboarding-persistence");
    mkdirSync(mod.ONBOARDING_DIR, { recursive: true });
    writeFileSync(mod.ACTIVE_SNAPSHOT_PATH, "{not valid");
    expect(mod.loadSnapshot()).toBeNull();
  });

  it("loadSnapshot returns null for wrong version", async () => {
    const mod = await import("../src/lib/onboarding-persistence");
    mod.saveSnapshot(FAKE_SNAPSHOT);
    const raw = readFileSync(mod.ACTIVE_SNAPSHOT_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.version = 99;
    writeFileSync(mod.ACTIVE_SNAPSHOT_PATH, JSON.stringify(parsed));
    expect(mod.loadSnapshot()).toBeNull();
  });

  it("saveSnapshot creates ONBOARDING_DIR when missing", async () => {
    const mod = await import("../src/lib/onboarding-persistence");
    expect(existsSync(mod.ONBOARDING_DIR)).toBe(false);
    mod.saveSnapshot(FAKE_SNAPSHOT);
    expect(existsSync(mod.ONBOARDING_DIR)).toBe(true);
  });
});
