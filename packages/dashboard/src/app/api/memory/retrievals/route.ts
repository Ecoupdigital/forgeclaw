import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const retrievals = core.listRetrievalsV2(limit);
  if (retrievals === null) {
    return Response.json({ retrievals: [], source: "mock" });
  }
  return Response.json({ retrievals, source: "core" });
}
