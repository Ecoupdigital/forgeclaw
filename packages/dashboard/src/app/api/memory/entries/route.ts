import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? undefined;
  const reviewStatusRaw = url.searchParams.get("reviewStatus");
  const reviewStatus =
    reviewStatusRaw === "pending" || reviewStatusRaw === "all"
      ? (reviewStatusRaw as "pending" | "all")
      : "approved";
  const includeArchived = url.searchParams.get("archived") === "true";
  const limit = Number(url.searchParams.get("limit") ?? "200");
  const q = url.searchParams.get("q")?.trim() ?? "";
  const offset = Number(url.searchParams.get("offset") ?? "0");

  if (q.length >= 2) {
    const results = core.searchMemoryEntriesV2(q, {
      reviewStatus,
      includeArchived,
      limit,
      offset,
    });
    if (results === null) {
      return Response.json({ entries: [], source: "empty", total: 0 });
    }
    return Response.json({
      entries: results,
      source: "core",
      hasMore: results.length === limit,
    });
  }

  const entries = core.listMemoryEntriesV2({
    kind,
    reviewStatus,
    includeArchived,
    limit,
    offset,
  });
  if (entries === null) {
    return Response.json({ entries: [], source: "empty" });
  }
  return Response.json({
    entries,
    source: "core",
    hasMore: (entries?.length ?? 0) === limit,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      kind?: string;
      content?: string;
      pinned?: boolean;
    };

    if (!body.kind || !body.content) {
      return Response.json(
        { error: "kind and content are required" },
        { status: 400 },
      );
    }

    const validKinds = ["behavior", "user_profile", "fact", "decision", "preference"];
    if (!validKinds.includes(body.kind)) {
      return Response.json({ error: `invalid kind: ${body.kind}` }, { status: 400 });
    }

    const result = core.createMemoryEntryV2({
      kind: body.kind,
      content: body.content,
      pinned: body.pinned ?? false,
      reviewed: true, // manual entries are always approved
    });

    if (!result) {
      return Response.json({ error: "database unavailable" }, { status: 503 });
    }
    if (result.error) {
      return Response.json({ error: result.error, id: result.id }, { status: 409 });
    }
    return Response.json({ success: true, id: result.id });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "create failed" },
      { status: 500 },
    );
  }
}
