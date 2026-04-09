import { mockMemoryContent, mockDailyLogs } from "@/lib/mock-data";

export async function GET() {
  return Response.json({
    memory: mockMemoryContent,
    dailyLogs: mockDailyLogs,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { content } = body as { content: string };

  // In production: memoryManager.writeMemory(content)
  return Response.json({
    success: true,
    lines: content.split("\n").length,
  });
}
