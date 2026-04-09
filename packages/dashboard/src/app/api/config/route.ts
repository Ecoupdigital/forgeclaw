import * as core from "@/lib/core";
import { mockConfig } from "@/lib/mock-data";

export async function GET() {
  try {
    const config = await core.getConfig();
    if (config) {
      return Response.json({ config, source: "core" });
    }
  } catch (err) {
    console.warn("[api/config] Core unavailable, using mock data:", err);
  }

  return Response.json({ config: mockConfig, source: "mock" });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const written = await core.writeConfig(body as Record<string, unknown>);

    if (written) {
      // Re-read to return the saved config (with masked token)
      const config = await core.getConfig();
      return Response.json({
        success: true,
        config: config ?? body,
        source: "core",
      });
    }

    // Fallback
    return Response.json({
      success: true,
      config: body,
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
