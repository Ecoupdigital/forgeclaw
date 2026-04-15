import * as core from "@/lib/core";
import { mockCronLogs } from "@/lib/mock-data";
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
    console.warn("[api/crons/logs] Core unavailable, using mock data:", err);
  }

  const logs = mockCronLogs.filter((l) => l.jobId === jobId);
  return Response.json({ logs, source: "mock" });
}
