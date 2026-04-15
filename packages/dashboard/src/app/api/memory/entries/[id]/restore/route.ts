import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isFinite(entryId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const ok = core.restoreMemoryEntryV2(entryId);
  if (!ok) {
    return Response.json({ error: "restore failed" }, { status: 404 });
  }
  return Response.json({ success: true });
}
