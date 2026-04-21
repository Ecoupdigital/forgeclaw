import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Onboarding API route tests.
 *
 * Strategy: call the POST/GET handlers directly (no Next.js server),
 * mocking @forgeclaw/core to avoid spawning real Claude CLI, mocking
 * node:os.homedir to isolate HOME per test, and mocking @/lib/auth
 * to bypass cookie/Authorization checks.
 *
 * `vi.hoisted` is REQUIRED for the tmpHome closure: vitest hoists
 * vi.mock factories above top-level `let`, so a raw `let tmpHome` would
 * be `undefined` when the factory fires. Wrapping in vi.hoisted gives
 * the factory a stable reference whose properties we mutate per-test.
 */

const mocks = vi.hoisted(() => ({ tmpHome: "" }));

// --- HOME isolation ---
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    default: { ...actual, homedir: () => mocks.tmpHome },
    homedir: () => mocks.tmpHome,
  };
});

// --- Auth bypass ---
vi.mock("@/lib/auth", () => ({
  requireApiAuth: async () => ({ ok: true as const }),
  AUTH_COOKIE_NAME: "fc-token",
  AUTH_COOKIE_MAX_AGE: 60 * 60 * 24 * 30,
  validateToken: async () => true,
}));

// --- @forgeclaw/core mock ---
// Only the exports actually consumed by onboarding-sessions.ts. Types are
// erased at runtime so we just need runtime values.
vi.mock("@forgeclaw/core", () => {
  const HARNESS_FILES_ALL = [
    "SOUL.md",
    "USER.md",
    "AGENTS.md",
    "TOOLS.md",
    "MEMORY.md",
    "STYLE.md",
    "HEARTBEAT.md",
  ];

  type FakeTurn = {
    index: number;
    role: "interviewer" | "user";
    text: string;
    at: number;
  };

  class FakeInterviewer {
    archetype: string;
    private _status: "pending" | "asking" | "done" | "aborted" = "pending";
    private _turns: FakeTurn[] = [];
    private _startedAt = Date.now();
    private _updatedAt = Date.now();
    private _errorMessage: string | undefined;
    constructor(opts: { archetype: string; harnessDir: string }) {
      this.archetype = opts.archetype;
    }
    async start() {
      this._status = "asking";
      this._turns.push({
        index: 1,
        role: "interviewer",
        text: "Oi, qual seu nome?",
        at: Date.now(),
      });
      this._updatedAt = Date.now();
      return {
        status: "asking" as const,
        nextQuestion: "Oi, qual seu nome?",
        rationale: "preciso saber o nome pro USER.md",
      };
    }
    async answer(text: string) {
      this._turns.push({
        index: this._turns.length + 1,
        role: "user",
        text,
        at: Date.now(),
      });
      this._status = "done";
      this._turns.push({
        index: this._turns.length + 1,
        role: "interviewer",
        text: "Done",
        at: Date.now(),
      });
      this._updatedAt = Date.now();
      return {
        status: "done" as const,
        summary: "Test interview complete",
        harnessDiff: {
          summary: "Test",
          diffs: [
            {
              file: "USER.md",
              ops: [{ op: "set_placeholder", key: "userName", value: text }],
            },
          ],
        },
      };
    }
    abort(_reason?: string) {
      this._status = "aborted";
      this._errorMessage = _reason;
      this._updatedAt = Date.now();
    }
    getState() {
      return {
        archetype: this.archetype,
        turns: this._turns,
        status: this._status,
        finalDiff:
          this._status === "done"
            ? {
                summary: "Test",
                diffs: [
                  {
                    file: "USER.md",
                    ops: [
                      {
                        op: "set_placeholder",
                        key: "userName",
                        value: "X",
                      },
                    ],
                  },
                ],
              }
            : null,
        budget: {
          turnsUsed: this._turns.filter((t) => t.role === "user").length,
          inputTokensUsed: 0,
          outputTokensUsed: 0,
          elapsedMs: 0,
          withinLimits: true,
          cutoffReason: undefined,
        },
        startedAt: this._startedAt,
        updatedAt: this._updatedAt,
        errorMessage: this._errorMessage,
      };
    }
  }

  return {
    HARNESS_FILES_ALL,
    Interviewer: FakeInterviewer,
    previewDiff: (_harnessDir: string, diff: { diffs: Array<{ file: string }> }) => ({
      ok: true,
      appliedFiles: [] as string[],
      skippedFiles: [] as Array<{ file: string; reason: string }>,
      finalContents: Object.fromEntries(
        diff.diffs.map((d) => [d.file, `# ${d.file}\nwith-diff`]),
      ) as Record<string, string>,
    }),
    applyDiff: (_harnessDir: string, diff: { diffs: Array<{ file: string }> }) => ({
      ok: true,
      appliedFiles: diff.diffs.map((d) => d.file),
      skippedFiles: [] as Array<{ file: string; reason: string }>,
      finalContents: {} as Record<string, string>,
    }),
    loadInterviewerBase: () => "Fake prompt",
    DEFAULT_BUDGET: {
      maxTurns: 30,
      maxInputTokens: 80_000,
      maxOutputTokens: 20_000,
      timeoutMs: 15 * 60 * 1000,
    },
  };
});

// The session store lives on globalThis via Symbol.for — vi.resetModules()
// does NOT clear it. Clear it manually so each test starts with no active
// session.
const STORE_SYMBOL = Symbol.for("forgeclaw.onboarding.store");

function clearGlobalStore() {
  const g = globalThis as Record<symbol, unknown>;
  delete g[STORE_SYMBOL];
}

// Seed archetype config + a few harness files so resolveArchetype +
// readHarnessFiles find something.
function seedHome() {
  mkdirSync(join(mocks.tmpHome, ".forgeclaw", "harness"), { recursive: true });
  for (const name of [
    "SOUL.md",
    "USER.md",
    "AGENTS.md",
    "TOOLS.md",
    "MEMORY.md",
    "STYLE.md",
  ]) {
    writeFileSync(
      join(mocks.tmpHome, ".forgeclaw", "harness", name),
      `# ${name}\nbaseline\n`,
    );
  }
  writeFileSync(
    join(mocks.tmpHome, ".forgeclaw", "forgeclaw.config.json"),
    JSON.stringify({ archetype: "solo-builder" }),
  );
}

beforeEach(() => {
  mocks.tmpHome = mkdtempSync(join(tmpdir(), "fc-onb-api-"));
  vi.resetModules();
  clearGlobalStore();
  seedHome();
});

afterEach(() => {
  clearGlobalStore();
  try {
    rmSync(mocks.tmpHome, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("onboarding API routes", () => {
  it("POST /start returns snapshot with status=asking", async () => {
    const { POST } = await import("@/app/api/onboarding/start/route");
    const req = new Request("http://localhost/api/onboarding/start", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("asking");
    expect(body.archetype).toBe("solo-builder");
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBeGreaterThan(0);
  });

  it("POST /start returns 409 ALREADY_DONE when sentinel exists", async () => {
    const { markOnboarded } = await import("@/lib/onboarding-state");
    markOnboarded({ source: "installer" });
    const { POST } = await import("@/app/api/onboarding/start/route");
    const req = new Request("http://localhost/api/onboarding/start", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("ALREADY_DONE");
  });

  it("POST /message validates body and progresses the interview", async () => {
    const startMod = await import("@/app/api/onboarding/start/route");
    await startMod.POST(
      new Request("http://localhost/start", { method: "POST", body: "{}" }),
    );

    const msgMod = await import("@/app/api/onboarding/message/route");
    // Empty text -> 400
    const bad = await msgMod.POST(
      new Request("http://localhost/msg", {
        method: "POST",
        body: JSON.stringify({ text: "" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(bad.status).toBe(400);
    const badBody = await bad.json();
    expect(badBody.code).toBe("INVALID_INPUT");

    // Good text -> 200 with status=done (FakeInterviewer finishes in 1 turn)
    const good = await msgMod.POST(
      new Request("http://localhost/msg", {
        method: "POST",
        body: JSON.stringify({ text: "test-user" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(good.status).toBe(200);
    const body = await good.json();
    expect(body.status).toBe("done");
  });

  it("POST /approve applies diff + marks sentinel + returns redirectTo=/", async () => {
    const startMod = await import("@/app/api/onboarding/start/route");
    await startMod.POST(
      new Request("http://localhost/start", { method: "POST", body: "{}" }),
    );
    const msgMod = await import("@/app/api/onboarding/message/route");
    await msgMod.POST(
      new Request("http://localhost/msg", {
        method: "POST",
        body: JSON.stringify({ text: "test-user" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const approveMod = await import("@/app/api/onboarding/approve/route");
    const res = await approveMod.POST(
      new Request("http://localhost/approve", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.redirectTo).toBe("/");
    const { isOnboarded, readOnboardedMeta } = await import(
      "@/lib/onboarding-state"
    );
    expect(isOnboarded()).toBe(true);
    expect(readOnboardedMeta()?.source).toBe("interview");
  });

  it("POST /skip creates sentinel with source=skipped even without active session", async () => {
    const skipMod = await import("@/app/api/onboarding/skip/route");
    const res = await skipMod.POST(
      new Request("http://localhost/skip", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(200);
    const { readOnboardedMeta } = await import("@/lib/onboarding-state");
    const meta = readOnboardedMeta();
    expect(meta?.source).toBe("skipped");
  });

  it("GET /state returns 404 NO_SESSION when no active and no persisted", async () => {
    const stateMod = await import("@/app/api/onboarding/state/route");
    const res = await stateMod.GET(new Request("http://localhost/state"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("NO_SESSION");
  });

  it("GET /state returns snapshot when session is active", async () => {
    const startMod = await import("@/app/api/onboarding/start/route");
    await startMod.POST(
      new Request("http://localhost/start", { method: "POST", body: "{}" }),
    );
    const stateMod = await import("@/app/api/onboarding/state/route");
    const res = await stateMod.GET(new Request("http://localhost/state"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBeTruthy();
    expect(body.archetype).toBe("solo-builder");
    expect(body.status).toBe("asking");
  });
});
