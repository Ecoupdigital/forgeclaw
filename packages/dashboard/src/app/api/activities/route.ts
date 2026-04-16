import { requireApiAuth } from "@/lib/auth";
import * as core from "@/lib/core";

/**
 * GET /api/activities?type=cron:fired&entityType=cron&limit=100&offset=0&since=1700000000000
 *
 * Returns activities (system event log) with optional filters.
 * All params are optional.
 * Response: { activities: Activity[], source: 'core' | 'empty' }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const entityType = url.searchParams.get("entityType") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
  const offset = Number(url.searchParams.get("offset")) || 0;
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? Number(sinceParam) : undefined;

  try {
    const activities = core.listActivities({
      type,
      entityType,
      limit,
      offset,
      since,
    });
    return Response.json({
      activities: activities ?? [],
      source: activities ? "core" : "empty",
    });
  } catch (err) {
    console.warn("[api/activities] Error:", err);
    return Response.json({ activities: [], source: "empty" });
  }
}
