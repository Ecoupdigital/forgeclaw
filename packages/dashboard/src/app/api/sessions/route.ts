import * as core from "@/lib/core";
import type { TopicInfo } from "@/lib/types";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const topicId = url.searchParams.get("topicId");

  try {
    // If topicId specified, return messages for that topic
    if (topicId) {
      const msgs = core.getMessages(Number(topicId), 100);
      return Response.json({
        messages: msgs ?? [],
        source: msgs ? "core" : "empty",
      });
    }

    // Otherwise return all sessions, enriched with topic info from the
    // `topics` table. Without this enrichment the frontend can only show
    // generic "Session N" labels because sessions.topic_id is just the
    // Telegram thread_id (numeric), not the topic row name.
    //
    // session.id is a composite key "<chatId>:<threadId>" or "<chatId>" for
    // DMs. Build a lookup from the same shape of topics (chatId, threadId).
    const sessions = core.listSessions();

    if (sessions && sessions.length > 0) {
      const topics = (core.listTopics() ?? []) as TopicInfo[];
      const topicByKey = new Map<string, TopicInfo>();
      for (const t of topics) {
        const key =
          t.threadId !== null && t.threadId !== undefined
            ? `${t.chatId}:${t.threadId}`
            : `${t.chatId}`;
        topicByKey.set(key, t);
      }
      const enriched = sessions.map((s) => {
        const topic = topicByKey.get(s.id);
        return {
          ...s,
          topicName: topic?.name ?? null,
          topicRowId: topic?.id ?? null,
          chatId: topic?.chatId ?? null,
          threadId: topic?.threadId ?? null,
        };
      });
      return Response.json({
        sessions: enriched,
        source: "core",
      });
    }
  } catch (err) {
    console.warn("[api/sessions] Core unavailable:", err);
  }

  // H1: Never return mock data — return empty arrays so UI shows empty state
  if (topicId) {
    return Response.json({
      messages: [],
      source: "empty",
    });
  }

  return Response.json({
    sessions: [],
    source: "empty",
  });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  return Response.json(
    {
      error: "Use WebSocket on port 4041 for chat",
      wsUrl: "ws://localhost:4041",
    },
    { status: 410 }
  );
}
