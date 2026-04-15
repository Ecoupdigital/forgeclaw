import { spawn } from "node:child_process";
import BetterSqlite3 from "better-sqlite3";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { requireApiAuth } from "@/lib/auth";

const DB_PATH = join(homedir(), ".forgeclaw", "db", "forgeclaw.db");

function openDb(): BetterSqlite3.Database | null {
  if (!existsSync(DB_PATH)) return null;
  try {
    const db = new BetterSqlite3(DB_PATH);
    db.pragma("journal_mode = WAL");
    return db;
  } catch {
    return null;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await request.json()) as {
    runtime?: "claude-code" | "codex" | null;
    runtimeFallback?: boolean;
  };

  const db = openDb();
  if (!db) return Response.json({ error: "db unavailable" }, { status: 503 });

  try {
    if (body.runtimeFallback !== undefined) {
      db.prepare(
        "UPDATE topics SET runtime = ?, runtime_fallback = ? WHERE id = ?"
      ).run(body.runtime ?? null, body.runtimeFallback ? 1 : 0, topicId);
    } else {
      db.prepare("UPDATE topics SET runtime = ? WHERE id = ?").run(
        body.runtime ?? null,
        topicId
      );
    }

    // Reload hot — the bot/ws-server read from DB on each message, so no IPC needed
    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "update failed" },
      { status: 500 }
    );
  } finally {
    db.close();
  }
}
