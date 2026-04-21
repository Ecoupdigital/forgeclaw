/**
 * GET /api/refine/rollback
 *   List all harness backups under ~/.forgeclaw/harness-backups/ (most recent
 *   first). Returns an empty array when no backups exist.
 *
 * POST /api/refine/rollback
 *   Restore a backup by id. Internally creates a `pre-restore-<id>` safety
 *   backup, wipes and restores the harness dir, and recompiles CLAUDE.md.
 *   Writes 'applied' sentinel so the CLI (if waiting) unblocks.
 *
 *   Body: { backupId: string }
 */

import { requireApiAuth } from "@/lib/auth";
import {
  listBackups,
  restoreBackup,
  compileHarness,
} from "@forgeclaw/core";
import { writeRefineSentinel, REFINE_SENTINEL_PATH } from "@/lib/refine-sentinel";
import type {
  RefineApiError,
  RefineBackupDTO,
  RefineListBackupsResponse,
  RefineRestoreBody,
  RefineRestoreResponse,
} from "@/lib/refine-types";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const backups = listBackups();
    const dtos: RefineBackupDTO[] = backups.map((b) => ({
      id: b.id,
      createdAtIso: b.createdAt.toISOString(),
      sizeBytes: b.sizeBytes,
      fileCount: b.fileCount,
    }));
    return Response.json({ backups: dtos } satisfies RefineListBackupsResponse);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[refine/rollback] list failed:", message);
    return Response.json(
      {
        error: `Failed to list backups: ${message}`,
        code: "INTERNAL",
      } satisfies RefineApiError,
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  let body: RefineRestoreBody;
  try {
    body = (await request.json()) as RefineRestoreBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON body", code: "INVALID_INPUT" } satisfies RefineApiError,
      { status: 400 },
    );
  }

  if (typeof body.backupId !== "string" || body.backupId.length === 0) {
    return Response.json(
      {
        error: "Body field 'backupId' must be a non-empty string",
        code: "INVALID_INPUT",
      } satisfies RefineApiError,
      { status: 400 },
    );
  }

  // Validate id exists up-front to give a clean 404 rather than a 500 from
  // restoreBackup's internal throw.
  try {
    const backups = listBackups();
    const exists = backups.some((b) => b.id === body.backupId);
    if (!exists) {
      return Response.json(
        {
          error: `Backup not found: ${body.backupId}`,
          code: "NOT_FOUND",
        } satisfies RefineApiError,
        { status: 404 },
      );
    }
  } catch {
    // Fall through to restoreBackup which will throw a clear error.
  }

  try {
    restoreBackup(body.backupId);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[refine/rollback] restore failed:", message);
    try {
      writeRefineSentinel({ status: "error", error: message });
    } catch {
      // ignore
    }
    return Response.json(
      {
        error: `Restore failed: ${message}`,
        code: "HARNESS_APPLY_FAILED",
      } satisfies RefineApiError,
      { status: 500 },
    );
  }

  // Best-effort recompile; restore already moved the files into place.
  try {
    compileHarness();
  } catch (err) {
    console.warn(
      `[refine/rollback] compileHarness failed: ${(err as Error).message}`,
    );
  }

  // Sentinel so a CLI rollback invoked via dashboard (future) can unblock.
  // Current CLI `--rollback` is terminal-only, but this keeps the contract
  // consistent across operations.
  try {
    writeRefineSentinel({
      status: "applied",
      backupId: body.backupId,
    });
  } catch (err) {
    console.warn(
      `[refine/rollback] sentinel write failed: ${(err as Error).message}`,
    );
  }

  return Response.json({
    ok: true,
    restoredId: body.backupId,
    sentinelPath: REFINE_SENTINEL_PATH,
  } satisfies RefineRestoreResponse);
}
