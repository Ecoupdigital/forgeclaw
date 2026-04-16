import { requireApiAuth } from "@/lib/auth";
import * as core from "@/lib/core";

/**
 * GET /api/tokens/stats?topLimit=10
 *
 * Returns aggregate token stats and top sessions by consumption.
 * Response: {
 *   totals: { totalInput, totalOutput, totalCacheCreation, totalCacheRead, totalRequests },
 *   topSessions: Array<{ sessionKey, totalInput, totalOutput, totalCache, count }>,
 *   source: 'core' | 'empty'
 * }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const topLimit = Math.min(Number(url.searchParams.get("topLimit")) || 10, 50);

  try {
    const totals = core.getTokenUsageStats();
    const topSessions = core.getTokenUsageTopSessions(topLimit);
    return Response.json({
      totals: totals ?? {
        totalInput: 0,
        totalOutput: 0,
        totalCacheCreation: 0,
        totalCacheRead: 0,
        totalRequests: 0,
      },
      topSessions: topSessions ?? [],
      source: totals ? "core" : "empty",
    });
  } catch (err) {
    console.warn("[api/tokens/stats] Error:", err);
    return Response.json({
      totals: {
        totalInput: 0,
        totalOutput: 0,
        totalCacheCreation: 0,
        totalCacheRead: 0,
        totalRequests: 0,
      },
      topSessions: [],
      source: "empty",
    });
  }
}
