import * as core from "@/lib/core";
import { mockConfig } from "@/lib/mock-data";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const config = await core.getConfig();
    if (config) {
      return Response.json({ config, source: "core" });
    }
  } catch (err) {
    console.warn("[api/config] Core unavailable:", err);
  }

  // Never return mock data — return minimal defaults so UI shows empty state
  return Response.json({
    config: {
      botToken: "",
      allowedChatIds: [],
      defaultRuntime: "claude-code",
    },
    source: "empty",
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

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

    // Core unavailable — cannot persist
    return Response.json(
      { success: false, error: "Core unavailable, config not saved" },
      { status: 503 }
    );
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
