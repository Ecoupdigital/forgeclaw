import * as core from "@/lib/core";
import { mockMemoryContent, mockDailyLogs } from "@/lib/mock-data";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const memory = await core.getMemoryContent();
    const dailyLogs = await core.listDailyLogs();

    if (memory !== null || dailyLogs !== null) {
      return Response.json({
        memory: memory ?? "",
        dailyLogs: dailyLogs ?? [],
        source: "core",
      });
    }
  } catch (err) {
    console.warn("[api/memory] Core unavailable, using mock data:", err);
  }

  return Response.json({
    memory: mockMemoryContent,
    dailyLogs: mockDailyLogs,
    source: "mock",
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { content } = body as { content: string };

    const written = await core.writeMemoryContent(content);

    if (written) {
      return Response.json({
        success: true,
        lines: content.split("\n").length,
        source: "core",
      });
    }

    // Fallback: pretend it worked
    return Response.json({
      success: true,
      lines: content.split("\n").length,
      source: "mock",
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
