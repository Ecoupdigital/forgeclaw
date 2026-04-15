/**
 * BuiltinMemoryProvider — wraps BuiltinMemoryStore as a MemoryProvider.
 *
 * This is the always-on provider registered first in MemoryManager. It
 * implements the provider interface by delegating to the store for writes
 * and combining store snapshot + FTS5 search for retrieval.
 *
 * The prefetch logic is the "intelligent gating" layer:
 *  - Always returns top-K FTS5 hits against memory_entries when the query
 *    has enough signal (>= 2 chars per token, not a greeting)
 *  - For messages table search, uses FTS5 over historic conversations too
 *  - Results are ranked by BM25 (FTS5 native)
 *  - No embeddings in v1.5 — adding embeddings later means swapping the
 *    search() call in BuiltinMemoryStore, not rewriting the provider
 */

import type {
  MemoryProvider,
  MemoryToolInput,
  MemoryToolResult,
  PrefetchResult,
  ProviderInitContext,
  ToolSchema,
} from './types';
import type { MemoryEntryKind } from '../types';
import { BuiltinMemoryStore } from './builtin-store';
import { stateStore } from '../state-store';

const STOP_WORDS = new Set([
  'oi', 'olá', 'ola', 'e', 'ai', 'tudo', 'bem', 'ok', 'hi', 'hello',
  'um', 'uma', 'o', 'a', 'os', 'as', 'de', 'da', 'do', 'pra', 'para',
  'com', 'sem', 'me', 'te', 'se', 'eu', 'tu', 'voce', 'você',
]);

export class BuiltinMemoryProvider implements MemoryProvider {
  readonly name = 'builtin';

  constructor(private readonly store: BuiltinMemoryStore) {}

  isAvailable(): boolean {
    return true;
  }

  async initialize(_ctx: ProviderInitContext): Promise<void> {
    this.store.loadSnapshot();
  }

  async systemPromptBlock(): Promise<string> {
    const snap = this.store.getSnapshot();
    const parts: string[] = [];
    if (snap.user && snap.user.trim() && snap.user !== '# (empty)\n') parts.push(snap.user.trim());
    if (snap.memory && snap.memory.trim() && snap.memory !== '# (empty)\n') parts.push(snap.memory.trim());
    return parts.join('\n\n---\n\n');
  }

  async prefetch(query: string, ctx: { sessionId?: string } = {}): Promise<PrefetchResult | null> {
    if (!this.shouldSearch(query)) return null;

    // 1) FTS5 over memory_entries
    const memHits = this.store.search(query, 5);

    // 2) FTS5 over past messages — SKIP when the session has --resume active,
    //    because the Claude CLI already sees the full conversation history.
    //    Injecting message hits on top of resume causes double context and
    //    confuses the model (confirmed bug: panorama ghost response).
    const msgHits = ctx.sessionId ? [] : stateStore.searchMessages(query, 5);

    if (memHits.length === 0 && msgHits.length === 0) {
      return null;
    }

    const lines: string[] = [];
    const hitsReport: PrefetchResult['hits'] = [];

    if (memHits.length > 0) {
      lines.push('## memórias relacionadas');
      for (const h of memHits) {
        lines.push(`- [${h.entry.kind}] ${h.entry.content.slice(0, 280)}`);
        hitsReport.push({
          memoryId: h.entry.id,
          score: h.score,
          reason: `fts:memory:${h.entry.kind}`,
          contentPreview: h.entry.content.slice(0, 120),
        });
        // mark as accessed (boosts ranking next time)
        stateStore.touchMemoryEntry(h.entry.id);
      }
      lines.push('');
    }

    if (msgHits.length > 0) {
      lines.push('## conversas anteriores relacionadas');
      for (const h of msgHits.slice(0, 3)) {
        // Cap preview and annotate with relative time
        const preview = h.content.replace(/\s+/g, ' ').slice(0, 200);
        const d = new Date(h.createdAt);
        const when = d.toISOString().slice(0, 16).replace('T', ' ');
        lines.push(`- [${when}] ${preview}`);
        hitsReport.push({
          memoryId: -h.messageId, // negative = message ID, not memory ID
          score: -h.rank,
          reason: 'fts:message',
          contentPreview: preview.slice(0, 120),
        });
      }
    }

    return { text: lines.join('\n'), hits: hitsReport };
  }

  queuePrefetch(_query: string): void {
    // FTS5 is fast (<10ms) — no background queue needed for built-in.
  }

  async syncTurn(_user: string, _assistant: string): Promise<void> {
    // Built-in doesn't auto-extract on every turn; writer cron does that.
    // This hook is here so external providers (e.g. semantic embedding)
    // can opt in later.
  }

  // -- Tool: `memory` --

  getToolSchemas(): ToolSchema[] {
    return [
      {
        name: 'memory',
        description:
          'Acessa a memória persistente do ForgeClaw. Use quando o usuário referenciar trabalho passado, continuidade de assunto anterior, ou pedir pra lembrar/esquecer algo. action=search para buscar, read para ler o estado atual, add/replace/remove para editar.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['search', 'read', 'add', 'replace', 'remove'],
              description: 'Operação a executar.',
            },
            target: {
              type: 'string',
              enum: ['memory', 'user'],
              description: 'Qual store operar (memory=behavior, user=user_profile). Opcional em search.',
            },
            query: {
              type: 'string',
              description: 'Termos pra busca (action=search).',
            },
            content: {
              type: 'string',
              description: 'Conteúdo novo pra adicionar ou substituir (action=add/replace).',
            },
            needle: {
              type: 'string',
              description: 'Substring única que identifica o entry a editar/remover (action=replace/remove).',
            },
            kind: {
              type: 'string',
              description: 'Kind do entry ao criar (default="fact"): behavior|user_profile|fact|decision|preference.',
            },
          },
          required: ['action'],
        },
      },
    ];
  }

  async handleToolCall(name: string, args: MemoryToolInput): Promise<MemoryToolResult> {
    if (name !== 'memory') {
      return { ok: false, message: `unknown tool ${name}` };
    }

    const kind = this.resolveKind(args);

    switch (args.action) {
      case 'search': {
        if (!args.query) return { ok: false, message: 'query é obrigatório em action=search' };
        const hits = this.store.search(args.query, 10);
        return {
          ok: true,
          message: `${hits.length} resultado(s)`,
          data: hits.map((h) => ({
            id: h.entry.id,
            kind: h.entry.kind,
            content: h.entry.content,
            score: h.score,
            accessCount: h.entry.accessCount,
            pinned: h.entry.pinned,
          })),
        };
      }
      case 'read': {
        const targetKind: MemoryEntryKind = args.target === 'user' ? 'user_profile' : 'behavior';
        return { ok: true, message: 'ok', data: this.store.read(targetKind) };
      }
      case 'add': {
        if (!args.content) return { ok: false, message: 'content é obrigatório' };
        const res = this.store.add(kind, args.content, { actor: 'agent', sourceType: 'manual' });
        return { ok: res.ok, message: res.reason ?? 'added', data: res.entry };
      }
      case 'replace': {
        if (!args.needle || !args.content)
          return { ok: false, message: 'needle e content são obrigatórios' };
        const res = this.store.replace(kind, args.needle, args.content, { actor: 'agent' });
        return { ok: res.ok, message: res.reason ?? 'replaced', data: res.entry };
      }
      case 'remove': {
        if (!args.needle) return { ok: false, message: 'needle é obrigatório' };
        const res = this.store.remove(kind, args.needle, { actor: 'agent' });
        return { ok: res.ok, message: res.reason ?? 'removed', data: res.entry };
      }
      default:
        return { ok: false, message: `ação desconhecida: ${args.action}` };
    }
  }

  async shutdown(): Promise<void> {
    // nothing to do — SQLite handle is shared
  }

  // ---- Private ----

  private shouldSearch(query: string): boolean {
    if (!query || query.length < 4) return false;
    const tokens = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
    return tokens.length >= 2;
  }

  private resolveKind(args: MemoryToolInput): MemoryEntryKind {
    if (args.target === 'user') return 'user_profile';
    if (args.target === 'memory') return 'behavior';
    const k = args.kind as MemoryEntryKind | undefined;
    if (k && ['behavior', 'user_profile', 'fact', 'decision', 'preference'].includes(k)) {
      return k;
    }
    return 'fact';
  }
}
