import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

interface MemoryConfig {
  memoryReviewMode: "auto" | "hybrid" | "review";
  memoryAutoApproveThreshold: number;
}

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const cfg = await core.getConfig();
    return Response.json({
      memoryReviewMode: cfg?.memoryReviewMode ?? "hybrid",
      memoryAutoApproveThreshold: cfg?.memoryAutoApproveThreshold ?? 85,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "config read failed" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Partial<MemoryConfig>;

    if (
      body.memoryReviewMode !== undefined &&
      !["auto", "hybrid", "review"].includes(body.memoryReviewMode)
    ) {
      return Response.json({ error: "invalid memoryReviewMode" }, { status: 400 });
    }
    if (body.memoryAutoApproveThreshold !== undefined) {
      const t = Number(body.memoryAutoApproveThreshold);
      if (!Number.isFinite(t) || t < 0 || t > 100) {
        return Response.json(
          { error: "memoryAutoApproveThreshold must be 0-100" },
          { status: 400 },
        );
      }
    }

    const existing = (await core.getConfig()) ?? {};
    const merged = {
      ...existing,
      ...(body.memoryReviewMode !== undefined && { memoryReviewMode: body.memoryReviewMode }),
      ...(body.memoryAutoApproveThreshold !== undefined && {
        memoryAutoApproveThreshold: body.memoryAutoApproveThreshold,
      }),
    };

    const ok = await core.writeConfig(merged);
    if (!ok) {
      return Response.json({ error: "config write failed" }, { status: 500 });
    }

    return Response.json({
      success: true,
      memoryReviewMode: merged.memoryReviewMode ?? "hybrid",
      memoryAutoApproveThreshold: merged.memoryAutoApproveThreshold ?? 85,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "config update failed" },
      { status: 500 },
    );
  }
}
