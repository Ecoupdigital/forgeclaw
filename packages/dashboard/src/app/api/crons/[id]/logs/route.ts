import { mockCronLogs } from "@/lib/mock-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobId = parseInt(id);
  const logs = mockCronLogs.filter((l) => l.jobId === jobId);

  return Response.json({ logs });
}
