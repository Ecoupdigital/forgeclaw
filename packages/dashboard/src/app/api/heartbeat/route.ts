import * as core from "@/lib/core";
import { mockHeartbeat } from "@/lib/mock-data";
import { requireApiAuth } from "@/lib/auth";

const MAX_HEARTBEAT_BYTES = 64 * 1024; // 64 KiB

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const content = await core.getHeartbeat();
    if (content !== null) {
      return Response.json({ content, source: "core" });
    }
  } catch (err) {
    console.warn("[api/heartbeat] Core unavailable:", err);
  }

  // Never return mock data — return empty string so UI shows empty state
  return Response.json({ content: "", source: "empty" });
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  // 1. Defensive JSON parse.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { success: false, error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const { content } = body as { content?: unknown };

  // 2. Type guard — fix BACKEND-012 (was leaking "Cannot read properties of
  // undefined (reading 'split')" when content was missing).
  if (typeof content !== "string") {
    return Response.json(
      { success: false, error: "content must be a string" },
      { status: 400 }
    );
  }

  // 3. Empty/whitespace guard — fix BACKEND-013 (data-loss vector: PUT
  // {content:""} previously wiped HEARTBEAT.md to zero bytes and made all
  // file-origin cron jobs disappear on next fs.watch reload).
  if (content.trim().length === 0) {
    return Response.json(
      {
        success: false,
        error:
          "Empty heartbeat rejected. Use a confirm dialog on the frontend if you really want to wipe it.",
      },
      { status: 400 }
    );
  }

  // 4. Size cap — fix BACKEND-014 (disk-fill vector).
  // Compare raw character length (byte length <= char length * 4 for UTF-8).
  if (content.length > MAX_HEARTBEAT_BYTES) {
    return Response.json(
      {
        success: false,
        error: `Heartbeat file too large (max ${MAX_HEARTBEAT_BYTES} bytes)`,
      },
      { status: 413 }
    );
  }

  // 5. Persist.
  const written = await core.writeHeartbeat(content);
  if (!written) {
    return Response.json(
      { success: false, error: "Failed to write heartbeat file" },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    lines: content.split("\n").length,
    source: "core",
  });
}
