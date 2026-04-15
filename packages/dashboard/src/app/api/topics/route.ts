import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const topics = core.listTopics();
    if (topics) {
      // Project only the fields the cron form dropdown needs.
      const slim = topics.map((t) => ({
        id: t.id,
        name: t.name ?? `Topic #${t.id}`,
        chatId: t.chatId,
        threadId: t.threadId,
        runtime: t.runtime ?? null,
        runtimeFallback: t.runtimeFallback ?? false,
      }));
      return Response.json({ topics: slim, source: "core" });
    }
  } catch (err) {
    console.warn("[api/topics] Core unavailable:", err);
  }
  return Response.json({ topics: [], source: "empty" });
}
