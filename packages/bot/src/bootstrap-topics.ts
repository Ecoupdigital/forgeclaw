import type { Bot, Context } from 'grammy';
import { stateStore } from '@forgeclaw/core';

/**
 * Bug 688 fix: populate and enrich the `topics` table at bot startup.
 *
 * History: until now, only the `sessions` table was populated by the bot.
 * `topics` stayed empty, which broke the cron target-topic dropdown in the
 * dashboard and prevented cron results from being routed to the correct
 * Telegram thread (the `cron:result` listener needs a topic row to resolve
 * chatId + threadId).
 *
 * Strategy (non-blocking, best-effort):
 *
 * 1. Read all sessions from the DB and parse their composite ids
 *    (`${chatId}:${threadId}` or `${chatId}` for DMs).
 * 2. Upsert a basic topic row for each unique (chatId, threadId) pair
 *    using a generic name. This alone makes the dropdown work.
 * 3. Enrich the name asynchronously by calling `bot.api.getChat` on each
 *    unique chatId (cached once per chat). The chat title becomes the
 *    prefix of the display name (e.g. "My Group · Topic 12").
 *
 * Errors are swallowed — a failure to enrich one topic must never crash the
 * bot startup. Worst case the dropdown shows generic names until the user
 * renames them manually via the dashboard.
 */
export async function bootstrapTopicsFromSessions(
  bot: Bot<Context>
): Promise<{ created: number; enriched: number; skipped: number }> {
  const sessions = stateStore.listSessions();
  if (sessions.length === 0) {
    return { created: 0, enriched: 0, skipped: 0 };
  }

  // Parse session ids. Format: "<chatId>" (DM) or "<chatId>:<threadId>".
  type SessionRef = { chatId: number; threadId: number | null };
  const refs: SessionRef[] = [];
  for (const s of sessions) {
    const parts = s.id.split(':');
    const chatId = Number(parts[0]);
    if (!Number.isFinite(chatId)) continue;
    const threadId =
      parts.length > 1 && parts[1] !== '0' ? Number(parts[1]) : null;
    if (threadId !== null && !Number.isFinite(threadId)) continue;
    refs.push({ chatId, threadId });
  }

  // Deduplicate.
  const uniq = new Map<string, SessionRef>();
  for (const r of refs) {
    const key = `${r.chatId}:${r.threadId ?? 'dm'}`;
    uniq.set(key, r);
  }

  // Step 1: fast upsert with generic names. This populates the table
  // immediately so the dashboard dropdown works even if getChat fails.
  let created = 0;
  let skipped = 0;
  for (const ref of uniq.values()) {
    const existing = stateStore.getTopicByChatAndThread(ref.chatId, ref.threadId);
    if (existing) {
      skipped++;
      continue;
    }
    stateStore.upsertTopic({
      chatId: ref.chatId,
      threadId: ref.threadId,
      name: ref.threadId ? `Topic ${ref.threadId}` : `Direct chat`,
    });
    created++;
  }

  // Step 2: enrich names from Telegram API. Cache chat titles per chatId to
  // avoid hammering the API. getChat is a public method, no special perms.
  const chatTitleCache = new Map<number, string | null>();
  let enriched = 0;

  for (const ref of uniq.values()) {
    try {
      // Fetch chat title once per chatId.
      if (!chatTitleCache.has(ref.chatId)) {
        const chat = await bot.api.getChat(ref.chatId);
        // ChatFullInfo has different shapes for DMs vs groups.
        // DMs have first_name/last_name; groups/channels have title.
        const title =
          (('title' in chat ? chat.title : undefined) as string | undefined) ??
          (('first_name' in chat ? chat.first_name : undefined) as
            | string
            | undefined) ??
          null;
        chatTitleCache.set(ref.chatId, title ?? null);
      }
      const chatTitle = chatTitleCache.get(ref.chatId);

      // Build a display name. For DMs we just use the chat title (user's name).
      // For forum topics we use "Group · Topic N" since there is no Bot API
      // method to fetch individual topic names.
      let name: string;
      if (ref.threadId) {
        name = chatTitle
          ? `${chatTitle} · Topic ${ref.threadId}`
          : `Topic ${ref.threadId}`;
      } else {
        name = chatTitle ?? `Direct chat`;
      }

      const topic = stateStore.getTopicByChatAndThread(
        ref.chatId,
        ref.threadId
      );
      if (topic && topic.name !== name) {
        stateStore.upsertTopic({
          chatId: ref.chatId,
          threadId: ref.threadId,
          name,
        });
        enriched++;
      }
    } catch (err) {
      // getChat can fail if the bot was removed, chat deleted, rate-limited.
      // Non-fatal — the generic name from step 1 stays.
      console.warn(
        `[bootstrap-topics] Failed to enrich chat ${ref.chatId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(
    `[bootstrap-topics] created=${created} enriched=${enriched} skipped=${skipped}`
  );
  return { created, enriched, skipped };
}
