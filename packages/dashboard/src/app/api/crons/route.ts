import * as core from "@/lib/core";
import { mockCronJobs } from "@/lib/mock-data";

export async function GET() {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      schedule,
      prompt,
      targetTopicId,
      enabled,
      origin,
      sourceFile,
    } = body as {
      name: string;
      schedule: string;
      prompt: string;
      targetTopicId: number | null;
      enabled: boolean;
      origin?: "file" | "db";
      sourceFile?: string | null;
    };

    const resolvedOrigin: "file" | "db" = origin ?? "db";
    const resolvedSourceFile: string | null = sourceFile ?? null;

    const id = core.createCronJob({
      name,
      schedule,
      prompt,
      targetTopicId: targetTopicId ?? null,
      enabled: enabled ?? true,
      lastRun: null,
      lastStatus: null,
      origin: resolvedOrigin,
      sourceFile: resolvedSourceFile,
    });

    if (id !== null) {
      return Response.json({
        success: true,
        job: {
          id,
          name,
          schedule,
          prompt,
          targetTopicId,
          enabled,
          origin: resolvedOrigin,
          sourceFile: resolvedSourceFile,
        },
        source: "core",
      });
    }

    // Fallback: return a fake ID
    return Response.json({
      success: true,
      job: {
        id: Date.now(),
        ...body,
        origin: resolvedOrigin,
        sourceFile: resolvedSourceFile,
      },
      source: "mock",
    });
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

export async function DELETE(request: Request) {
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, action, ...updates } = body as {
      id: number;
      action: string;
      [key: string]: unknown;
    };

    if (action === "toggle") {
      const enabled = updates.enabled as boolean | undefined;
      const newEnabled = enabled !== undefined ? enabled : !(core.getCronJob(id)?.enabled);
      core.updateCronJob(id, { enabled: newEnabled });
      return Response.json({
        success: true,
        id,
        action,
        enabled: newEnabled,
        source: "core",
      });
    }

    if (action === "update" && updates) {
      const existing = core.getCronJob(id);
      if (existing && existing.origin === "file") {
        return Response.json(
          {
            success: false,
            error: "Cannot update file-origin jobs from dashboard",
          },
          { status: 403 }
        );
      }
      const updated = core.updateCronJob(
        id,
        updates as Partial<Omit<import("@/lib/types").CronJob, "id">>
      );
      if (updated) {
        return Response.json({
          success: true,
          id,
          action,
          source: "core",
        });
      }
    }

    // action === "run_now" requires the cron engine runtime (bot process)
    // We can't execute ClaudeRunner from the dashboard process
    if (action === "run_now") {
      return Response.json({
        success: false,
        id,
        action,
        error:
          "Manual execution requires the bot process. Use the Telegram bot to trigger /cron run.",
      });
    }

    return Response.json({ success: true, id, action, source: "mock" });
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
