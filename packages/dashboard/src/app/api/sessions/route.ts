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

export async function POST() {
  return Response.json(
    {
      error: "Use WebSocket on port 4041 for chat",
      wsUrl: "ws://localhost:4041",
      protocol: {
        send: '{ type: "send", sessionKey: "<chatId>:<topicId>", message: "<text>" }',
        subscribe: '{ type: "subscribe", sessionKey: "<chatId>:<topicId>" }',
      },
    },
    { status: 410 }
  );
}
