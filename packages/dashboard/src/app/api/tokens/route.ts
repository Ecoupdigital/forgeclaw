import { requireApiAuth } from "@/lib/auth";
import * as core from "@/lib/core";

/**
 * GET /api/tokens?days=30
 *
 * Returns daily token usage summary for the last N days.
 * Response: { daily: Array<{ date, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, count }>, source: 'core' | 'empty' }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const days = Math.min(Number(url.searchParams.get("days")) || 30, 365);

  try {
    const daily = core.getTokenUsageDailySummary(days);
    return Response.json({
      daily: daily ?? [],
      source: daily ? "core" : "empty",
    });
  } catch (err) {
    console.warn("[api/tokens] Error:", err);
    return Response.json({ daily: [], source: "empty" });
  }
}
