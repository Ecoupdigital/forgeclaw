import { mockHeartbeat } from "@/lib/mock-data";

export async function GET() {
  return Response.json({ content: mockHeartbeat });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { content } = body as { content: string };

  // In production: writeFile(HEARTBEAT_PATH, content)
  return Response.json({
    success: true,
    lines: content.split("\n").length,
  });
}
