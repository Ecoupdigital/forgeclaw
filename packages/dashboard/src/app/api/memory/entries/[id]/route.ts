import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function PUT(
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

  try {
    const body = (await request.json()) as {
      content?: string;
      kind?: string;
      pinned?: boolean;
      reviewed?: boolean;
    };

    const ok = core.updateMemoryEntryV2(entryId, body);
    if (!ok) {
      return Response.json({ error: "update failed or entry not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

  const ok = core.archiveMemoryEntryV2(entryId);
  if (!ok) {
    return Response.json({ error: "archive failed" }, { status: 404 });
  }
  return Response.json({ success: true });
}
