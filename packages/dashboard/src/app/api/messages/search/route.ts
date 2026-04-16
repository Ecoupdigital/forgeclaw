import { searchMessages } from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const limitParam = url.searchParams.get("limit");

  if (!query || query.trim().length < 2) {
    return Response.json(
      { error: "Query parameter 'q' is required (min 2 characters)" },
      { status: 400 },
    );
  }

  const limit = limitParam ? Math.min(Math.max(1, Number(limitParam)), 100) : 50;

  try {
    const results = searchMessages(query, limit);
    return Response.json({
      results: results ?? [],
      query,
      source: results ? "core" : "empty",
    });
  } catch (err) {
    console.warn("[api/messages/search] Search failed:", err);
    return Response.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}
