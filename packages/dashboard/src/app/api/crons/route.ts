import * as core from "@/lib/core";
import { mockCronJobs } from "@/lib/mock-data";
import type { CronJob } from "@/lib/types";
import { CronExpressionParser } from "cron-parser";
import { z } from "zod";
import { requireApiAuth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// IPC → bot process
// ---------------------------------------------------------------------------
//
// The dashboard (Next.js, port 4040) is a separate process from the bot
// (which hosts the CronEngine). After any CRUD on db-origin jobs, we notify
// the bot via HTTP on its ws-server fetch handler (port 4041) so the engine
// re-loads from SQLite. Without this, new/edited jobs only become active on
// next bot boot or on HEARTBEAT.md fs.watch event.
//
// Fire-and-forget with a short timeout. If the bot is offline the request
// silently fails — that's fine, the job is persisted and will be picked up
// on next boot. We never block the HTTP response on this.

const BOT_IPC_URL =
  process.env.FORGECLAW_BOT_IPC_URL ?? "http://127.0.0.1:4041";

async function notifyCronReload(): Promise<void> {
  try {
    await fetch(`${BOT_IPC_URL}/cron/reload`, {
      method: "POST",
      signal: AbortSignal.timeout(1000),
    });
  } catch {
    // Bot offline or unreachable — not an error. Changes are persisted; next
    // boot (or next HEARTBEAT.md change) will pick them up.
  }
}

async function notifyCronRunNow(id: number): Promise<{
  ok: boolean;
  status: number;
  error?: string;
}> {
  try {
    // Bot responds 202 Accepted almost immediately — the actual Claude run
    // happens in the background and reports result via cron_logs. 3s is plenty
    // for the "started" ack; if the bot takes longer than that, something
    // is wrong with the IPC path itself.
    const res = await fetch(`${BOT_IPC_URL}/cron/run-now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    // 202 Accepted is success for run-now (started in background).
    // 200 OK also acceptable. 404/400/500 are real errors.
    const httpOk = res.status === 202 || res.status === 200;
    return {
      ok: httpOk && data.ok !== false,
      status: res.status,
      error: data.error,
    };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: err instanceof Error ? err.message : "Bot unreachable",
    };
  }
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
//
// IMPORTANT: `origin` and `sourceFile` are deliberately NOT accepted from the
// body. The dashboard may only create/update jobs with origin='db'. File-origin
// jobs are owned by the HEARTBEAT.md parser (see .plano/fases/08-dashboard-web/
// 08-CONTEXT.md → "Fonte de verdade"). `.strict()` rejects unknown fields (400)
// so a client cannot smuggle origin/sourceFile in.

const createCronSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name too long (max 100 chars)"),
    schedule: z.string().trim().min(1, "Schedule is required"),
    prompt: z
      .string()
      .trim()
      .min(1, "Prompt is required")
      .max(5000, "Prompt too long (max 5000 chars)"),
    targetTopicId: z.number().int().positive().nullable().optional(),
    enabled: z.boolean().optional().default(true),
    runtime: z.enum(["claude-code", "codex"]).nullable().optional(),
    model: z.string().trim().max(100).nullable().optional(),
  })
  .strict();

// Partial for PUT action=update. Keeps the same caps/strict rules but every
// field is optional. We still forbid origin/sourceFile via `.strict()`.
const updateCronSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(100, "Name too long (max 100 chars)")
      .optional(),
    schedule: z.string().trim().min(1, "Schedule cannot be empty").optional(),
    prompt: z
      .string()
      .trim()
      .min(1, "Prompt cannot be empty")
      .max(5000, "Prompt too long (max 5000 chars)")
      .optional(),
    targetTopicId: z.number().int().positive().nullable().optional(),
    enabled: z.boolean().optional(),
    runtime: z.enum(["claude-code", "codex"]).nullable().optional(),
    model: z.string().trim().max(100).nullable().optional(),
  })
  .strict();

const KNOWN_ACTIONS = new Set(["toggle", "update", "run_now"]);

function badRequest(error: string, details?: unknown) {
  return Response.json(
    { success: false, error, ...(details !== undefined ? { details } : {}) },
    { status: 400 }
  );
}

function validateScheduleString(schedule: string): string | null {
  try {
    CronExpressionParser.parse(schedule);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid cron expression";
  }
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const jobs = core.listCronJobs();
    if (jobs) {
      return Response.json({ jobs, source: "core" });
    }
  } catch (err) {
    console.warn("[api/crons] Core unavailable, using mock data:", err);
  }

  return Response.json({ jobs: mockCronJobs, source: "mock" });
}

// ---------------------------------------------------------------------------
// POST — create cron job
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  // 1. Parse JSON defensively.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  // 2. Must be a plain object (not array / primitive / null).
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Request body must be a JSON object");
  }

  // 3. Schema validation (strict: rejects unknown fields such as origin/sourceFile).
  const parsed = createCronSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }
  const data = parsed.data;

  // 4. Validate schedule via cron-parser.
  const scheduleError = validateScheduleString(data.schedule);
  if (scheduleError) {
    return badRequest(`Invalid cron expression: ${scheduleError}`);
  }

  // 5. If targetTopicId provided, verify the topic exists (G13).
  if (data.targetTopicId != null) {
    const topic = core.getTopic(data.targetTopicId);
    if (!topic) {
      return badRequest(
        `Topic not found: targetTopicId=${data.targetTopicId}`
      );
    }
  }

  // 6. Persist. origin/sourceFile are HARD-CODED — never trust body.
  const id = core.createCronJob({
    name: data.name,
    schedule: data.schedule,
    prompt: data.prompt,
    targetTopicId: data.targetTopicId ?? null,
    enabled: data.enabled,
    lastRun: null,
    lastStatus: null,
    origin: "db",
    sourceFile: null,
    runtime: data.runtime ?? null,
    model: data.model ?? null,
  });

  // 7. NO mock-id fallback. A null from core means the DB actually failed.
  if (id === null) {
    return Response.json(
      {
        success: false,
        error: "Failed to create cron job (database unavailable or rejected)",
      },
      { status: 500 }
    );
  }

  // 8. Notify bot to reload cron engine (fire-and-forget).
  notifyCronReload();

  return Response.json(
    {
      success: true,
      job: {
        id,
        name: data.name,
        schedule: data.schedule,
        prompt: data.prompt,
        targetTopicId: data.targetTopicId ?? null,
        enabled: data.enabled,
        origin: "db",
        sourceFile: null,
      },
      source: "core",
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      return Response.json(
        { success: false, error: "Invalid id" },
        { status: 400 }
      );
    }
    const job = core.getCronJob(id);
    if (!job) {
      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }
    if (job.origin === "file") {
      return Response.json(
        {
          success: false,
          error: "Cannot delete file-origin jobs from dashboard",
        },
        { status: 403 }
      );
    }
    const deleted = core.deleteCronJob(id);
    if (deleted) notifyCronReload();
    return Response.json({ success: deleted, id });
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT — toggle / update / run_now
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  // 1. Parse body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Request body must be a JSON object");
  }

  const { id, action, ...updates } = body as {
    id?: unknown;
    action?: unknown;
    [key: string]: unknown;
  };

  // 2. id must be a positive integer.
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return badRequest("Missing or invalid id (must be a positive integer)");
  }

  // 3. action must be one of the known ones.
  if (typeof action !== "string" || !KNOWN_ACTIONS.has(action)) {
    return badRequest(
      `Unknown action. Must be one of: ${[...KNOWN_ACTIONS].join(", ")}`
    );
  }

  // 4. Resource must exist.
  const existing = core.getCronJob(id);
  if (!existing) {
    return Response.json(
      { success: false, error: "Cron job not found" },
      { status: 404 }
    );
  }

  // 5. Guard file-origin for mutating actions (toggle AND update).
  if (existing.origin === "file" && (action === "toggle" || action === "update")) {
    return Response.json(
      {
        success: false,
        error:
          "Cannot modify file-origin jobs from dashboard. Edit in HEARTBEAT.md.",
      },
      { status: 403 }
    );
  }

  // --- toggle ---
  if (action === "toggle") {
    const explicitEnabled =
      typeof updates.enabled === "boolean" ? updates.enabled : undefined;
    const newEnabled =
      explicitEnabled !== undefined ? explicitEnabled : !existing.enabled;

    const ok = core.updateCronJob(id, { enabled: newEnabled });
    if (!ok) {
      return Response.json(
        { success: false, error: "Failed to toggle cron job" },
        { status: 500 }
      );
    }
    notifyCronReload();
    return Response.json({
      success: true,
      id,
      action,
      enabled: newEnabled,
      source: "core",
    });
  }

  // --- update ---
  if (action === "update") {
    const parsed = updateCronSchema.safeParse(updates);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }
    const patch = parsed.data;

    // Must have at least one field to update.
    if (Object.keys(patch).length === 0) {
      return badRequest("No updatable fields provided");
    }

    // Revalidate schedule if present.
    if (patch.schedule !== undefined) {
      const scheduleError = validateScheduleString(patch.schedule);
      if (scheduleError) {
        return badRequest(`Invalid cron expression: ${scheduleError}`);
      }
    }

    // Revalidate targetTopicId if present and non-null (G13).
    if (patch.targetTopicId != null) {
      const topic = core.getTopic(patch.targetTopicId);
      if (!topic) {
        return badRequest(
          `Topic not found: targetTopicId=${patch.targetTopicId}`
        );
      }
    }

    const updated = core.updateCronJob(
      id,
      patch as Partial<Omit<CronJob, "id">>
    );
    if (!updated) {
      return Response.json(
        { success: false, error: "Failed to update cron job" },
        { status: 500 }
      );
    }
    notifyCronReload();
    return Response.json({ success: true, id, action, source: "core" });
  }

  // --- run_now ---
  // Dispatches to the bot process via IPC. The bot hosts the CronEngine and
  // ClaudeRunner; the dashboard cannot execute jobs directly.
  if (action === "run_now") {
    const ipc = await notifyCronRunNow(id);
    if (!ipc.ok) {
      return Response.json(
        {
          success: false,
          id,
          action,
          error:
            ipc.status === 503
              ? `Bot process unreachable: ${ipc.error ?? "unknown"}. Is the bot running?`
              : ipc.error ?? "Bot returned an error",
        },
        { status: ipc.status === 503 ? 503 : 500 }
      );
    }
    return Response.json({ success: true, id, action, source: "ipc" });
  }

  // Unreachable (KNOWN_ACTIONS guard above) — defensive 400.
  return badRequest("Unknown action");
}
