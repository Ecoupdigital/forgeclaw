import * as core from "@/lib/core";
import { mockHeartbeat } from "@/lib/mock-data";

export async function GET() {
  try {
    const content = await core.getHeartbeat();
    if (content !== null) {
      return Response.json({ content, source: "core" });
    }
  } catch (err) {
    console.warn("[api/heartbeat] Core unavailable, using mock data:", err);
  }

  return Response.json({ content: mockHeartbeat, source: "mock" });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { content } = body as { content: string };

    const written = await core.writeHeartbeat(content);

    if (written) {
      return Response.json({
        success: true,
        lines: content.split("\n").length,
        source: "core",
      });
    }

    // Fallback
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
