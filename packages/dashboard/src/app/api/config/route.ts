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

const VALID_CONFIG_FIELDS = new Set<string>([
  'botToken',
  'allowedUsers',
  'allowedGroups',
  'workingDir',
  'vaultPath',
  'voiceProvider',
  'claudeModel',
  'maxConcurrentSessions',
  'defaultRuntime',
  'runtimes',
  'writerRuntime',
  'writerModel',
  'showRuntimeBadge',
  'memoryReviewMode',
  'memoryAutoApproveThreshold',
  'dashboardToken',
  'timezone',
]);

export async function PUT(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    // Validate: reject unknown fields
    const incoming = body as Record<string, unknown>;
    const unknownFields = Object.keys(incoming).filter(
      (key) => !VALID_CONFIG_FIELDS.has(key)
    );

    if (unknownFields.length > 0) {
      return Response.json(
        {
          success: false,
          error: 'Unknown config fields rejected',
          unknownFields,
        },
        { status: 400 }
      );
    }

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
