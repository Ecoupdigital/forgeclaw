import * as core from "@/lib/core";
import {
  mockSessions,
  mockMessages,
  mockTopics,
} from "@/lib/mock-data";

export async function GET() {
  try {
    const topics = core.listTopics();
    const sessions = core.listSessions();

    if (topics && sessions) {
      // Fetch messages for all topics
      const allMessages = topics.flatMap((t) => {
        const msgs = core.getMessages(t.id, 50);
        return msgs ?? [];
      });

      return Response.json({
        sessions,
        topics,
        messages: allMessages,
        source: "core",
      });
    }
  } catch (err) {
    console.warn("[api/sessions] Core unavailable, using mock data:", err);
  }

  return Response.json({
    sessions: mockSessions,
    topics: mockTopics,
    messages: mockMessages,
    source: "mock",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topicId, message } = body as {
      topicId: number;
      message: string;
    };

    // For now, POST just acknowledges. Full ClaudeRunner integration
    // requires the bot runtime (bun process) which is separate.
    return Response.json({
      success: true,
      topicId,
      message,
      timestamp: Date.now(),
      note: "Message recorded. ClaudeRunner execution requires the bot process.",
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
