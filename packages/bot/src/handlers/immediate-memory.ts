import { memoryManagerV2 } from '@forgeclaw/core';
import type { MemoryEntryKind } from '@forgeclaw/core';

/**
 * Regex patterns that indicate the user wants to save something to memory.
 * Each entry has: pattern (regex), extractGroup (capture group index for content),
 * and defaultKind (the MemoryEntryKind to use).
 *
 * Patterns are tested in order; first match wins.
 * All patterns are case-insensitive.
 */
const MEMORY_TRIGGERS: Array<{
  pattern: RegExp;
  extractGroup: number;
  defaultKind: MemoryEntryKind;
}> = [
  // Portuguese triggers
  { pattern: /^lembr[ae]\s+que\s+(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^n[aã]o\s+esque[cç]a\s+(?:que\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^anota\s+(?:que\s+|a[ií]\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^guarda\s+(?:que\s+|isso\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^memoriz[ae]\s+(?:que\s+|isso\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^eu\s+prefiro\s+(.+)/i, extractGroup: 1, defaultKind: 'preference' },
  { pattern: /^minha\s+prefer[eê]ncia\s+[eé]\s+(.+)/i, extractGroup: 1, defaultKind: 'preference' },
  // English triggers
  { pattern: /^remember\s+that\s+(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^don'?t\s+forget\s+(?:that\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^memorize\s+(?:that\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^note\s+that\s+(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^i\s+prefer\s+(.+)/i, extractGroup: 1, defaultKind: 'preference' },
];

interface MemoryDetection {
  content: string;
  kind: MemoryEntryKind;
  trigger: string; // the matched trigger phrase (for logging)
}

/**
 * Check if a message matches any memory-save trigger pattern.
 * Returns null if no match.
 */
export function detectMemoryTrigger(text: string): MemoryDetection | null {
  const trimmed = text.trim();
  if (trimmed.length < 10) return null; // too short to be meaningful

  for (const { pattern, extractGroup, defaultKind } of MEMORY_TRIGGERS) {
    const match = trimmed.match(pattern);
    if (match && match[extractGroup]) {
      const content = match[extractGroup].trim();
      if (content.length < 5) continue; // extracted content too short

      // Infer kind from content keywords
      const kind = inferKind(content, defaultKind);
      const trigger = trimmed.slice(0, trimmed.indexOf(content)).trim();

      return { content, kind, trigger };
    }
  }

  return null;
}

/**
 * Refine the kind based on content keywords.
 * - Content mentioning "prefiro", "prefer", "gosto de" -> 'preference'
 * - Content mentioning "decidi", "decided", "a partir de agora" -> 'decision'
 * - Otherwise keep defaultKind
 */
function inferKind(content: string, defaultKind: MemoryEntryKind): MemoryEntryKind {
  const lower = content.toLowerCase();

  if (/\b(prefir[oa]|prefer[eo]?|gosto\s+de|i\s+like|i\s+prefer)\b/.test(lower)) {
    return 'preference';
  }
  if (/\b(decid[io]|decided|a\s+partir\s+de\s+agora|from\s+now\s+on)\b/.test(lower)) {
    return 'decision';
  }

  return defaultKind;
}

/**
 * Detect memory trigger in message text and save immediately.
 * Best-effort: errors are logged but never block message processing.
 * Returns true if a memory was saved, false otherwise.
 */
export async function detectAndSaveImmediateMemory(text: string): Promise<boolean> {
  const detection = detectMemoryTrigger(text);
  if (!detection) return false;

  try {
    const result = await memoryManagerV2.handleToolCall('memory', {
      action: 'add',
      kind: detection.kind,
      content: detection.content,
    });

    if (result.ok) {
      console.log(
        `[immediate-memory] saved: kind=${detection.kind} trigger="${detection.trigger}" content="${detection.content.slice(0, 80)}"`,
      );
    } else {
      console.warn(
        `[immediate-memory] rejected: ${result.message} (trigger="${detection.trigger}")`,
      );
    }

    return result.ok;
  } catch (err) {
    console.error('[immediate-memory] failed to save:', err);
    return false;
  }
}
