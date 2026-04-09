import { mockSessions, mockMessages, mockTopics } from "@/lib/mock-data";

export async function GET() {
  return Response.json({
    sessions: mockSessions,
    topics: mockTopics,
    messages: mockMessages,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { topicId, message } = body as { topicId: number; message: string };

  // In production, this would dispatch to ClaudeRunner via core
  return Response.json({
    success: true,
    topicId,
    message,
    timestamp: Date.now(),
  });
}
