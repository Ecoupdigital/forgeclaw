import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const jobId = parseInt(id);

  if (isNaN(jobId)) {
    return Response.json({ logs: [], error: "Invalid job ID" }, { status: 400 });
  }

  try {
    const logs = core.getCronLogs(jobId);
    if (logs) {
      return Response.json({ logs, source: "core" });
    }
  } catch (err) {
    console.warn("[api/crons/logs] Core unavailable:", err);
  }

  // H1: Never return mock data — return empty array so UI shows empty state
  return Response.json({ logs: [], source: "empty" });
}
