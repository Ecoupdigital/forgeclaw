/**
 * Tipos do sistema de arquetipos ForgeClaw.
 *
 * Um arquetipo e um conjunto de templates de harness (SOUL, USER, AGENTS, TOOLS,
 * MEMORY, STYLE, HEARTBEAT) + metadata (archetype.json) que o CLI installer usa
 * para bootstrapar um ~/.forgeclaw/harness/ funcional sem entrevista.
 */

export type ArchetypeSlug =
  | 'solo-builder'
  | 'content-creator'
  | 'agency-freela'
  | 'ecom-manager'
  | 'generic';

export const ARCHETYPE_SLUGS: readonly ArchetypeSlug[] = [
  'solo-builder',
  'content-creator',
  'agency-freela',
  'ecom-manager',
  'generic',
] as const;

/**
 * Conteudo do archetype.json. Todos os arquetipos DEVEM prover TODOS os campos.
 */
export interface ArchetypeMeta {
  /** Slug estavel (nome da pasta). */
  slug: ArchetypeSlug;
  /** Nome legivel. Ex: "Criador de Conteudo". */
  name: string;
  /** Descricao curta (1 frase, max 160 chars). */
  description: string;
  /** Runtime padrao sugerido ('claude-code' | 'codex'). */
  defaultRuntime: 'claude-code' | 'codex';
  /** Provider de voz sugerido ('groq' | 'openai' | 'none'). */
  voiceProvider: 'groq' | 'openai' | 'none';
  /** Tags que populam agents.memory_domain_filter quando o usuario criar agentes. */
  tags: string[];
  /** Lista dos agentes sugeridos que aparecerao em AGENTS.md. Nomes unicos. */
  suggestedAgents: SuggestedAgent[];
  /** Integracoes/MCPs recomendadas (livre, exibidas em TOOLS.md). */
  recommendedTools: string[];
  /** Emoji/icone curtinho usado em UI (opcional, fallback '*'). */
  icon?: string;
}

export interface SuggestedAgent {
  /** Nome do agente. Ex: "Editor de Carrossel". */
  name: string;
  /** 1 frase descrevendo a funcao. */
  description: string;
  /** Tags default que alimentarao memory_domain_filter na criacao via dashboard. */
  tags: string[];
}

/**
 * Placeholders universais. Todo template .md de arquetipo pode usar estes.
 * Valores nao fornecidos caem para o default (ou string vazia).
 */
export interface PlaceholderMap {
  userName: string;
  company: string;
  role: string;
  workingDir: string;
  vaultPath: string;
  timezone: string;
  /** Data corrente no formato YYYY-MM-DD (injetado pelo loader). */
  today: string;
}

/**
 * Resultado de `loadArchetype(slug)`.
 *
 * Os campos *Raw sao o conteudo dos .md ANTES de renderizar placeholders.
 * Use `renderPlaceholders(raw, map)` para obter o texto final.
 */
export interface ArchetypeTemplate {
  meta: ArchetypeMeta;
  soulRaw: string;
  userRaw: string;
  agentsRaw: string;
  toolsRaw: string;
  memoryRaw: string;
  styleRaw: string;
  heartbeatRaw: string;
}

/**
 * Lista canonica dos arquivos .md por arquetipo. Mesma ordem de
 * packages/core/src/harness-compiler.ts HARNESS_FILES + HEARTBEAT.md.
 */
export const ARCHETYPE_FILES = [
  'SOUL.md',
  'USER.md',
  'AGENTS.md',
  'TOOLS.md',
  'MEMORY.md',
  'STYLE.md',
  'HEARTBEAT.md',
] as const;

export type ArchetypeFileName = (typeof ARCHETYPE_FILES)[number];
