import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARCHETYPE_SLUGS,
  type ArchetypeSlug,
  type ArchetypeMeta,
  type ArchetypeTemplate,
  type PlaceholderMap,
} from './types';

/**
 * Diretorio base dos arquetipos. Resolvido relativo ao arquivo fonte
 * (funciona tanto em ts-node/bun quanto apos compilacao).
 */
const ARCHETYPES_DIR = (() => {
  // __dirname funciona sob Bun/TS. Fallback para URL para compat.
  if (typeof __dirname !== 'undefined') return __dirname;
  return dirname(fileURLToPath(import.meta.url));
})();

/**
 * Valida que um objeto parseado e um ArchetypeMeta valido. Joga erro descritivo.
 */
function validateMeta(obj: unknown, slug: string): asserts obj is ArchetypeMeta {
  if (!obj || typeof obj !== 'object') {
    throw new Error(`[archetype:${slug}] archetype.json nao e um objeto`);
  }
  const o = obj as Record<string, unknown>;
  const required = [
    'slug',
    'name',
    'description',
    'defaultRuntime',
    'voiceProvider',
    'tags',
    'suggestedAgents',
    'recommendedTools',
  ] as const;
  for (const k of required) {
    if (!(k in o)) throw new Error(`[archetype:${slug}] archetype.json falta campo '${k}'`);
  }
  if (o.slug !== slug) {
    throw new Error(`[archetype:${slug}] slug mismatch: json=${String(o.slug)} dir=${slug}`);
  }
  if (!ARCHETYPE_SLUGS.includes(slug as ArchetypeSlug)) {
    throw new Error(`[archetype:${slug}] slug nao esta em ARCHETYPE_SLUGS`);
  }
  if (typeof o.name !== 'string' || o.name.length === 0) {
    throw new Error(`[archetype:${slug}] name invalido`);
  }
  if (typeof o.description !== 'string' || o.description.length > 160) {
    throw new Error(`[archetype:${slug}] description ausente ou > 160 chars`);
  }
  if (o.defaultRuntime !== 'claude-code' && o.defaultRuntime !== 'codex') {
    throw new Error(`[archetype:${slug}] defaultRuntime invalido`);
  }
  if (o.voiceProvider !== 'groq' && o.voiceProvider !== 'openai' && o.voiceProvider !== 'none') {
    throw new Error(`[archetype:${slug}] voiceProvider invalido`);
  }
  if (!Array.isArray(o.tags)) throw new Error(`[archetype:${slug}] tags deve ser array`);
  if (!Array.isArray(o.suggestedAgents))
    throw new Error(`[archetype:${slug}] suggestedAgents deve ser array`);
  if (!Array.isArray(o.recommendedTools))
    throw new Error(`[archetype:${slug}] recommendedTools deve ser array`);
  for (const ag of o.suggestedAgents as unknown[]) {
    if (!ag || typeof ag !== 'object') throw new Error(`[archetype:${slug}] suggestedAgent invalido`);
    const a = ag as Record<string, unknown>;
    if (typeof a.name !== 'string' || typeof a.description !== 'string' || !Array.isArray(a.tags)) {
      throw new Error(`[archetype:${slug}] suggestedAgent mal formado: ${JSON.stringify(a)}`);
    }
  }
}

/**
 * Le o archetype.json e todos os .md do arquetipo e retorna ArchetypeTemplate.
 * Os campos *Raw preservam os placeholders `{{...}}` sem substituicao.
 */
export function loadArchetype(slug: ArchetypeSlug): ArchetypeTemplate {
  if (!ARCHETYPE_SLUGS.includes(slug)) {
    throw new Error(`Unknown archetype slug: ${slug}`);
  }
  const dir = join(ARCHETYPES_DIR, slug);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`[archetype:${slug}] directory not found: ${dir}`);
  }
  const metaPath = join(dir, 'archetype.json');
  if (!existsSync(metaPath)) {
    throw new Error(`[archetype:${slug}] archetype.json missing at ${metaPath}`);
  }
  const metaRaw = readFileSync(metaPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(metaRaw);
  } catch (err) {
    throw new Error(`[archetype:${slug}] archetype.json invalid JSON: ${(err as Error).message}`);
  }
  validateMeta(parsed, slug);
  const meta = parsed;

  const readMd = (file: string): string => {
    const p = join(dir, file);
    if (!existsSync(p)) {
      throw new Error(`[archetype:${slug}] missing template file: ${file}`);
    }
    return readFileSync(p, 'utf-8');
  };

  return {
    meta,
    soulRaw: readMd('SOUL.md'),
    userRaw: readMd('USER.md'),
    agentsRaw: readMd('AGENTS.md'),
    toolsRaw: readMd('TOOLS.md'),
    memoryRaw: readMd('MEMORY.md'),
    styleRaw: readMd('STYLE.md'),
    heartbeatRaw: readMd('HEARTBEAT.md'),
  };
}

/**
 * Lista todos os arquetipos disponiveis (apenas metadata, nao le .md).
 * Ignora silenciosamente arquetipos invalidos e loga warning.
 */
export function listArchetypes(): ArchetypeMeta[] {
  const out: ArchetypeMeta[] = [];
  for (const slug of ARCHETYPE_SLUGS) {
    try {
      const metaPath = join(ARCHETYPES_DIR, slug, 'archetype.json');
      if (!existsSync(metaPath)) continue;
      const parsed: unknown = JSON.parse(readFileSync(metaPath, 'utf-8'));
      validateMeta(parsed, slug);
      out.push(parsed);
    } catch (err) {
      console.warn(`[archetypes] skipping ${slug}: ${(err as Error).message}`);
    }
  }
  return out;
}

/**
 * Substitui placeholders `{{key}}` pelo valor de map[key].
 * Keys ausentes no map viram string vazia (sem lancar erro).
 * Tokens nao-reconhecidos sao preservados para debug.
 */
export function renderPlaceholders(raw: string, map: Partial<PlaceholderMap>): string {
  const today = map.today ?? new Date().toISOString().slice(0, 10);
  const full: PlaceholderMap = {
    userName: map.userName ?? '',
    company: map.company ?? '',
    role: map.role ?? '',
    workingDir: map.workingDir ?? '',
    vaultPath: map.vaultPath ?? '',
    timezone: map.timezone ?? 'America/Sao_Paulo',
    today,
  };
  return raw.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (key in full) return (full as unknown as Record<string, string>)[key] ?? '';
    return match; // preserva token desconhecido (debug friendly)
  });
}

/**
 * Helper: renderiza TODOS os .md do template com o mesmo map de placeholders.
 * Retorna objeto pronto pro installer escrever em disco.
 */
export function renderArchetype(
  template: ArchetypeTemplate,
  map: Partial<PlaceholderMap>
): Record<string, string> {
  return {
    'SOUL.md': renderPlaceholders(template.soulRaw, map),
    'USER.md': renderPlaceholders(template.userRaw, map),
    'AGENTS.md': renderPlaceholders(template.agentsRaw, map),
    'TOOLS.md': renderPlaceholders(template.toolsRaw, map),
    'MEMORY.md': renderPlaceholders(template.memoryRaw, map),
    'STYLE.md': renderPlaceholders(template.styleRaw, map),
    'HEARTBEAT.md': renderPlaceholders(template.heartbeatRaw, map),
  };
}
