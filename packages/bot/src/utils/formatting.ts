import { InlineKeyboard } from 'grammy';

/**
 * Escape HTML entities for Telegram HTML parse mode.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert basic markdown to Telegram HTML.
 * Handles: bold, inline code, code blocks.
 * Escapes HTML entities first, then applies formatting.
 */
export function convertToHtml(markdown: string): string {
  // Extract code blocks first to avoid processing their content
  const codeBlocks: string[] = [];
  let result = markdown.replace(/```(?:\w*\n)?([\s\S]*?)```/g, (_match, code: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(code.trim());
    return `\x00CODEBLOCK_${idx}\x00`;
  });

  // Extract inline code
  const inlineCodes: string[] = [];
  result = result.replace(/`([^`]+)`/g, (_match, code: string) => {
    const idx = inlineCodes.length;
    inlineCodes.push(code);
    return `\x00INLINE_${idx}\x00`;
  });

  // Escape HTML in remaining text
  result = escapeHtml(result);

  // Apply bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  result = result.replace(/__(.+?)__/g, '<b>$1</b>');

  // Apply italic: *text* or _text_ (single)
  result = result.replace(/\*(.+?)\*/g, '<i>$1</i>');
  result = result.replace(/_(.+?)_/g, '<i>$1</i>');

  // Restore inline code (escaped)
  for (let i = 0; i < inlineCodes.length; i++) {
    result = result.replace(`\x00INLINE_${i}\x00`, `<code>${escapeHtml(inlineCodes[i])}</code>`);
  }

  // Restore code blocks (escaped)
  for (let i = 0; i < codeBlocks.length; i++) {
    result = result.replace(`\x00CODEBLOCK_${i}\x00`, `<pre>${escapeHtml(codeBlocks[i])}</pre>`);
  }

  return result;
}

/**
 * Build a visual context usage bar.
 * Example: "Context: 34% ████░░░░░░"
 */
export function buildContextBar(usage: number): string {
  const percent = Math.min(100, Math.max(0, Math.round(usage)));
  const totalBars = 10;
  const filled = Math.round((percent / 100) * totalBars);
  const empty = totalBars - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  return `Context: ${percent}% ${bar}`;
}

/**
 * Build the action keyboard with UP, Stop, New buttons.
 */
export function buildActionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('UP', 'action:up')
    .text('Parar', 'action:stop')
    .text('Novo', 'action:new');
}

/**
 * Truncate text for Telegram's 4096 char limit.
 * Respects code blocks — won't cut in the middle of one.
 */
export function truncateForTelegram(text: string, limit: number = 4096): string {
  if (text.length <= limit) return text;

  const truncated = text.slice(0, limit - 20);

  // Check if we're inside an unclosed <pre> block
  const preOpens = (truncated.match(/<pre>/g) || []).length;
  const preCloses = (truncated.match(/<\/pre>/g) || []).length;

  if (preOpens > preCloses) {
    // Find last complete </pre> and cut there
    const lastClose = truncated.lastIndexOf('</pre>');
    if (lastClose > 0) {
      return truncated.slice(0, lastClose + 6) + '\n\n... (truncated)';
    }
  }

  // Check for unclosed <code>
  const codeOpens = (truncated.match(/<code>/g) || []).length;
  const codeCloses = (truncated.match(/<\/code>/g) || []).length;

  let result = truncated;
  if (codeOpens > codeCloses) {
    result += '</code>';
  }

  return result + '\n\n... (truncated)';
}
