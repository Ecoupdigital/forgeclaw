import * as core from "@/lib/core";
import { mockHarnessFiles } from "@/lib/mock-data";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const files = await core.listHarnessFiles();
    if (files) {
      return Response.json({ files, source: "core" });
    }
  } catch (err) {
    console.warn("[api/harness] Core unavailable, using mock data:", err);
  }

  return Response.json({ files: mockHarnessFiles, source: "mock" });
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { name, content } = body as { name: string; content: string };

    if (!name || typeof content !== "string") {
      return Response.json(
        { success: false, error: "Missing name or content" },
        { status: 400 }
      );
    }

    const written = await core.writeHarnessFile(name, content);

    if (written) {
      return Response.json({
        success: true,
        name,
        lines: content.split("\n").length,
        source: "core",
      });
    }

    // Fallback
    return Response.json({
      success: true,
      name,
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
