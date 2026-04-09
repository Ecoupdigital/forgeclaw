import { mockCronJobs } from "@/lib/mock-data";

export async function GET() {
  return Response.json({ jobs: mockCronJobs });
}

export async function POST(request: Request) {
  const body = await request.json();
  // In production: cronEngine.createJob(body)
  return Response.json({
    success: true,
    job: { id: Date.now(), ...body },
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, action } = body as { id: number; action: string };

  // In production: cronEngine.runJobNow(id) or cronEngine.toggleJob(id)
  return Response.json({
    success: true,
    id,
    action,
  });
}
