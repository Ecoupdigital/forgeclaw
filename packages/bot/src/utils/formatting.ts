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
 * Convert Markdown to Telegram HTML.
 *
 * Strategy: extract protected regions (code blocks, inline code) first,
 * then convert everything else line-by-line + inline patterns, then
 * restore protected regions. This avoids regex interactions and handles
 * multi-line bold, headers, lists, links, tables and horizontal rules.
 */
export function convertToHtml(markdown: string): string {
  // --- Phase 1: Extract protected regions ---

  const codeBlocks: string[] = [];
  let result = markdown.replace(/```(?:\w*\n)?([\s\S]*?)```/g, (_match, code: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(code.trim());
    return `\x00CB_${idx}\x00`;
  });

  const inlineCodes: string[] = [];
  result = result.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const idx = inlineCodes.length;
    inlineCodes.push(code);
    return `\x00IC_${idx}\x00`;
  });

  // --- Phase 2: Process line-by-line ---

  const lines = result.split('\n');
  const output: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip table separator rows (|---|---|)
    if (/^\s*\|[\s\-:|]+\|\s*$/.test(line)) {
      inTable = true;
      continue;
    }

    // Table rows → simple "key: value" or comma-separated
    if (/^\s*\|(.+)\|\s*$/.test(line)) {
      inTable = true;
      const cells = line.split('|').filter(c => c.trim()).map(c => escapeHtml(c.trim()));
      // First row after separator = data; if only 2 cells, use "key: value"
      if (cells.length === 2) {
        line = `${cells[0]}: ${cells[1]}`;
      } else {
        line = cells.join(' · ');
      }
      output.push(line);
      continue;
    }

    if (inTable && !/^\s*\|/.test(line)) {
      inTable = false;
    }

    // Horizontal rules → empty line
    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      output.push('');
      continue;
    }

    // Headers → bold text
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const text = escapeHtml(headerMatch[2]);
      output.push(`<b>${applyInlineFormatting(text)}</b>`);
      continue;
    }

    // Unordered list items → bullet
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      const indent = ulMatch[1].length >= 2 ? '  ' : '';
      const text = escapeHtml(ulMatch[2]);
      output.push(`${indent}• ${applyInlineFormatting(text)}`);
      continue;
    }

    // Ordered list items → keep number
    const olMatch = line.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
    if (olMatch) {
      const indent = olMatch[1].length >= 2 ? '  ' : '';
      const text = escapeHtml(olMatch[3]);
      output.push(`${indent}${olMatch[2]}. ${applyInlineFormatting(text)}`);
      continue;
    }

    // Blockquotes → italic with bar
    const bqMatch = line.match(/^>\s*(.*)$/);
    if (bqMatch) {
      const text = bqMatch[1] ? escapeHtml(bqMatch[1]) : '';
      output.push(text ? `▎<i>${applyInlineFormatting(text)}</i>` : '');
      continue;
    }

    // Regular line — escape and apply inline formatting
    line = escapeHtml(line);
    line = applyInlineFormatting(line);
    output.push(line);
  }

  result = output.join('\n');

  // --- Phase 3: Clean up ---

  // Collapse 3+ consecutive blank lines to 2
  result = result.replace(/\n{3,}/g, '\n\n');

  // --- Phase 4: Restore protected regions ---

  for (let i = 0; i < inlineCodes.length; i++) {
    result = result.replace(`\x00IC_${i}\x00`, `<code>${escapeHtml(inlineCodes[i])}</code>`);
  }

  for (let i = 0; i < codeBlocks.length; i++) {
    result = result.replace(`\x00CB_${i}\x00`, `<pre>${escapeHtml(codeBlocks[i])}</pre>`);
  }

  return result.trim();
}

/**
 * Apply inline Markdown formatting to an already HTML-escaped line.
 * Handles: **bold**, __bold__, *italic*, _italic_, [links](url),
 * ~~strikethrough~~.
 *
 * Bold uses `\*\*` which was already escaped to `**` since we escape
 * HTML entities (& < > ") but not asterisks.
 */
function applyInlineFormatting(line: string): string {
  // Links: [text](url) → <a href="url">text</a>
  line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold: **text** or __text__ (allow multiword, non-greedy)
  line = line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  line = line.replace(/__(.+?)__/g, '<b>$1</b>');

  // Strikethrough: ~~text~~
  line = line.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Italic: *text* or _text_ (single, careful not to match inside words)
  line = line.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '<i>$1</i>');
  line = line.replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '<i>$1</i>');

  return line;
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
