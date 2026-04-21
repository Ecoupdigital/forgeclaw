import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import {
  ARCHETYPE_SLUGS,
  ARCHETYPE_FILES,
  loadArchetype,
  renderArchetype,
  type ArchetypeSlug,
  type PlaceholderMap,
} from '../templates/archetypes'

/**
 * Archetype helpers for `forgeclaw refine`.
 *
 * The canonical slug list + template loader already live in
 * `packages/cli/src/templates/archetypes/`. This module is the thin bridge
 * between the config file (~/.forgeclaw/forgeclaw.config.json) and that
 * loader, plus readers for the current harness on disk.
 */

export type Archetype = ArchetypeSlug

export const ARCHETYPES: readonly Archetype[] = ARCHETYPE_SLUGS

/**
 * Human-facing labels used in selects/prompts.
 *
 * Kept in-module (not in `archetypes/types.ts`) so the CLI command copy can
 * evolve independently of the template package.
 */
export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  'solo-builder': 'Solo Builder (dev + produto proprio)',
  'content-creator': 'Criador de Conteudo (video, newsletter, curso)',
  'agency-freela': 'Agencia / Freela (clientes multiplos)',
  'ecom-manager': 'Gestor E-commerce (loja, catalogo, ads)',
  generic: 'Generico (comecar do zero)',
}

/**
 * Every path-deriving helper accepts an optional `forgeclawDir` override so
 * tests can point at a tmp dir without relying on `process.env.HOME` (Bun
 * caches `homedir()` at process start).
 */
function getForgeclawDir(override?: string): string {
  return override ?? join(homedir(), '.forgeclaw')
}

function getConfigPath(override?: string): string {
  return join(getForgeclawDir(override), 'forgeclaw.config.json')
}

function getHarnessDir(override?: string): string {
  return join(getForgeclawDir(override), 'harness')
}

interface ConfigShape {
  archetype?: string
  [k: string]: unknown
}

function readConfig(forgeclawDir?: string): ConfigShape | null {
  const p = getConfigPath(forgeclawDir)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as ConfigShape
  } catch {
    return null
  }
}

/**
 * Returns the archetype slug stored in ~/.forgeclaw/forgeclaw.config.json.
 *
 * Returns null when:
 *   - the config file does not exist
 *   - the file is unparseable
 *   - the `archetype` field is absent or not one of ARCHETYPE_SLUGS
 */
export function getCurrentArchetype(forgeclawDir?: string): Archetype | null {
  const cfg = readConfig(forgeclawDir)
  if (!cfg) return null
  const value = cfg.archetype
  if (typeof value !== 'string') return null
  if (!ARCHETYPE_SLUGS.includes(value as ArchetypeSlug)) return null
  return value as Archetype
}

/**
 * Writes `archetype` into the config, preserving all other fields and the
 * 0o600 permission bit.
 *
 * Throws when the config file is missing (run `forgeclaw install` first).
 */
export function setArchetype(archetype: Archetype, forgeclawDir?: string): void {
  const p = getConfigPath(forgeclawDir)
  if (!existsSync(p)) {
    throw new Error('Config not found — run forgeclaw install first')
  }
  if (!ARCHETYPE_SLUGS.includes(archetype)) {
    throw new Error(`Invalid archetype: ${archetype}`)
  }
  const current = readConfig(forgeclawDir) ?? {}
  const merged = { ...current, archetype }
  writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8')
  try {
    chmodSync(p, 0o600)
  } catch {
    // best-effort (Windows, exotic FS)
  }
}

/**
 * Loads and renders an archetype's templates using the same placeholder map
 * the installer (Phase 25) uses. Reuses config fields when available, falls
 * back to sensible defaults when keys are missing (refine can run on a
 * half-configured harness).
 *
 * @returns Record keyed by full filename ('SOUL.md', 'USER.md', ...).
 */
export function loadArchetypeTemplates(
  archetype: Archetype,
  forgeclawDir?: string,
): Record<string, string> {
  const template = loadArchetype(archetype)
  const cfg = readConfig(forgeclawDir) ?? {}
  const placeholders: PlaceholderMap = {
    userName: typeof cfg.userName === 'string' ? cfg.userName : '',
    company: typeof cfg.company === 'string' ? cfg.company : '',
    role: typeof cfg.role === 'string' ? cfg.role : '',
    workingDir: typeof cfg.workingDir === 'string' ? cfg.workingDir : '',
    vaultPath: typeof cfg.vaultPath === 'string' ? cfg.vaultPath : '',
    timezone: typeof cfg.timezone === 'string' ? cfg.timezone : 'America/Sao_Paulo',
    today: new Date().toISOString().slice(0, 10),
  }
  return renderArchetype(template, placeholders)
}

/**
 * Reads the current harness files from disk. Returns empty strings for
 * files that do not exist so downstream consumers can treat the dict as
 * stable-shaped.
 */
export function readCurrentHarness(forgeclawDir?: string): Record<string, string> {
  const dir = getHarnessDir(forgeclawDir)
  const out: Record<string, string> = {}
  for (const fname of ARCHETYPE_FILES) {
    const p = join(dir, fname)
    if (existsSync(p)) {
      try {
        out[fname] = readFileSync(p, 'utf-8')
      } catch {
        out[fname] = ''
      }
    } else {
      out[fname] = ''
    }
  }
  return out
}
