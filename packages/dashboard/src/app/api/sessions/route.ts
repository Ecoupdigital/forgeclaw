import * as core from "@/lib/core";
import {
  mockSessions,
  mockMessages,
  mockTopics,
} from "@/lib/mock-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const topicId = url.searchParams.get("topicId");

  try {
    // If topicId specified, return messages for that topic
    if (topicId) {
      const msgs = core.getMessages(Number(topicId), 100);
      return Response.json({
        messages: msgs ?? [],
        source: msgs ? "core" : "mock",
      });
    }

    // Otherwise return all sessions
    const sessions = core.listSessions();

    if (sessions && sessions.length > 0) {
      return Response.json({
        sessions,
        source: "core",
      });
    }
  } catch (err) {
    console.warn("[api/sessions] Core unavailable:", err);
  }

  // Fallback to mock
  if (topicId) {
    return Response.json({
      messages: mockMessages.filter((m) => m.topicId === Number(topicId)),
      source: "mock",
    });
  }

  return Response.json({
    sessions: mockSessions,
    source: "mock",
  });
}

export async function POST() {
  return Response.json(
    {
      error: "Use WebSocket on port 4041 for chat",
      wsUrl: "ws://localhost:4041",
    },
    { status: 410 }
  );
}
