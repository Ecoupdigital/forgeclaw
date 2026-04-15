/**
 * Security scanner for memory writes.
 *
 * Memory content becomes part of the agent's system prompt, so any entry is
 * a potential prompt injection / exfiltration vector. This scanner blocks
 * known-bad patterns before they're persisted.
 *
 * Port of Hermes Agent's `_scan_memory_content` in tools/memory_tool.py,
 * adapted to TS and extended with pt-BR variants.
 */

export type SecurityViolationKind =
  | 'prompt_injection'
  | 'role_hijack'
  | 'deception_hide'
  | 'sys_prompt_override'
  | 'disregard_rules'
  | 'bypass_restrictions'
  | 'exfil_curl'
  | 'exfil_wget'
  | 'read_secrets'
  | 'ssh_backdoor'
  | 'ssh_access'
  | 'forgeclaw_env'
  | 'invisible_unicode';

export interface SecurityViolation {
  kind: SecurityViolationKind;
  match: string;
  message: string;
}

// Ordered list of (regex, violation kind). First hit wins.
const THREAT_PATTERNS: Array<[RegExp, SecurityViolationKind]> = [
  // --- Prompt injection (EN + PT) ---
  [/ignore\s+(previous|all|above|prior)\s+instructions/i, 'prompt_injection'],
  [/ignore\s+(as|todas|as\s+anteriores|anteriores)\s+(instru[çc][õo]es|ordens)/i, 'prompt_injection'],
  [/you\s+are\s+now\s+/i, 'role_hijack'],
  [/voc[êe]\s+agora\s+[ée]\s+/i, 'role_hijack'],
  [/do\s+not\s+tell\s+the\s+user/i, 'deception_hide'],
  [/n[ãa]o\s+(conte|diga|fale)\s+(ao|para\s+o)\s+usu[áa]rio/i, 'deception_hide'],
  [/system\s+prompt\s+override/i, 'sys_prompt_override'],
  [/sobrescrever\s+o?\s+system\s+prompt/i, 'sys_prompt_override'],
  [/disregard\s+(your|all|any)\s+(instructions|rules|guidelines)/i, 'disregard_rules'],
  [/desconsidere\s+(as|suas|todas)\s+(instru[çc][õo]es|regras|diretrizes)/i, 'disregard_rules'],
  [/act\s+as\s+(if|though)\s+you\s+(have\s+no|don['\u2019]t\s+have)\s+(restrictions|limits|rules)/i, 'bypass_restrictions'],
  [/finja?\s+que\s+voc[êe]\s+n[ãa]o\s+tem\s+(restri[çc][õo]es|limites|regras)/i, 'bypass_restrictions'],
  // --- Exfiltration via curl/wget with secrets ---
  [/curl[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)/i, 'exfil_curl'],
  [/wget[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)/i, 'exfil_wget'],
  [/cat[^\n]*(\.env|credentials|\.netrc|\.pgpass|\.npmrc|\.pypirc)/i, 'read_secrets'],
  // --- Persistence via ssh / shell rc ---
  // authorized_keys is always suspicious when written to memory
  [/authorized_keys/i, 'ssh_backdoor'],
  // .env paths are only flagged when paired with read/exfil verbs — just
  // mentioning ~/.forgeclaw/.env in docs is fine.
  [/\b(cat|read|curl|wget|scp)\b[^\n]*(\$HOME\/\.forgeclaw\/\.env|~\/\.forgeclaw\/\.env)/i, 'forgeclaw_env'],
  // .ssh path is only flagged when paired with a verb that reads/writes.
  [/\b(cat|read|cp|mv|curl|scp)\b[^\n]*(\$HOME\/\.ssh|~\/\.ssh)/i, 'ssh_access'],
];

// Invisible / bidi control characters used in prompt injection attacks.
const INVISIBLE_CHARS = [
  '\u200b', '\u200c', '\u200d', '\u2060', '\ufeff',
  '\u202a', '\u202b', '\u202c', '\u202d', '\u202e',
];

/**
 * Scan text for known threat patterns. Returns first violation or null.
 * Scans should be fast (regex only, no network).
 */
export function scanMemoryContent(content: string): SecurityViolation | null {
  if (!content) return null;

  // Invisible unicode first (cheap)
  for (const ch of INVISIBLE_CHARS) {
    if (content.includes(ch)) {
      return {
        kind: 'invisible_unicode',
        match: `U+${ch.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`,
        message: `Blocked: content contains invisible unicode character U+${ch
          .charCodeAt(0)
          .toString(16)
          .padStart(4, '0')
          .toUpperCase()} (possible injection).`,
      };
    }
  }

  // Pattern scan
  for (const [pattern, kind] of THREAT_PATTERNS) {
    const m = content.match(pattern);
    if (m) {
      return {
        kind,
        match: m[0],
        message: `Blocked: content matches threat pattern '${kind}'. Memory entries are injected into the system prompt and must not contain injection or exfiltration payloads.`,
      };
    }
  }

  return null;
}

/** Quick boolean check — throws nothing. */
export function isContentSafe(content: string): boolean {
  return scanMemoryContent(content) === null;
}
