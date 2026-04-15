import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const memoryId = url.searchParams.get("memoryId");
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const audit = core.listMemoryAuditV2(
    memoryId ? Number(memoryId) : undefined,
    limit,
  );
  if (audit === null) {
    return Response.json({ audit: [], source: "mock" });
  }
  return Response.json({ audit, source: "core" });
}
