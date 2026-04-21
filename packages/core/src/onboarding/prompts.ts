import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HARNESS_FILES_ALL,
  type ArchetypeSlug,
  type HarnessFile,
  type InterviewResponse,
  type HarnessDiff,
  type DiffOp,
  type FileDiff,
  InterviewResponseParseError,
  InterviewDiffValidationError,
} from './types';

/**
 * Diretorio base do modulo onboarding. Usado para localizar interviewer.md
 * e scripts/<slug>.md em runtime.
 */
const ONBOARDING_DIR = (() => {
  if (typeof __dirname !== 'undefined') return __dirname;
  return dirname(fileURLToPath(import.meta.url));
})();

const INTERVIEWER_MD_PATH = join(ONBOARDING_DIR, 'interviewer.md');
const SCRIPTS_DIR = join(ONBOARDING_DIR, 'scripts');

/** Cache simples do system prompt (mtime-free: ele nao muda em runtime). */
let cachedInterviewerPrompt: string | null = null;
const cachedScripts = new Map<ArchetypeSlug, string>();

/** Placeholders aceitos em DiffOp set_placeholder. Single source of truth. */
export const VALID_PLACEHOLDER_KEYS = [
  'userName',
  'company',
  'role',
  'workingDir',
  'vaultPath',
  'timezone',
] as const;

export type ValidPlaceholderKey = (typeof VALID_PLACEHOLDER_KEYS)[number];

/**
 * Retorna o system prompt completo pro Entrevistador, dado um arquetipo:
 *  interviewer.md + "\n\n---\n\n" + scripts/<slug>.md
 *
 * Se o script nao existir, ainda retorna o interviewer.md sozinho com warning.
 */
export function loadInterviewerPrompt(archetype: ArchetypeSlug): string {
  const base = loadInterviewerBase();
  const script = loadScript(archetype);
  if (!script) {
    console.warn(`[onboarding] No script file for archetype "${archetype}". Using base prompt only.`);
    return base;
  }
  return `${base}\n\n---\n\n${script}`;
}

export function loadInterviewerBase(): string {
  if (cachedInterviewerPrompt !== null) return cachedInterviewerPrompt;
  if (!existsSync(INTERVIEWER_MD_PATH)) {
    throw new Error(`[onboarding] interviewer.md not found at ${INTERVIEWER_MD_PATH}`);
  }
  cachedInterviewerPrompt = readFileSync(INTERVIEWER_MD_PATH, 'utf-8');
  return cachedInterviewerPrompt;
}

export function loadScript(archetype: ArchetypeSlug): string | null {
  if (cachedScripts.has(archetype)) return cachedScripts.get(archetype) ?? null;
  const path = join(SCRIPTS_DIR, `${archetype}.md`);
  if (!existsSync(path)) {
    cachedScripts.set(archetype, '');
    return null;
  }
  const content = readFileSync(path, 'utf-8');
  cachedScripts.set(archetype, content);
  return content;
}

/**
 * Extrai o PRIMEIRO bloco ```json ... ``` do texto bruto do modelo.
 * Retorna o JSON parseado ou null se nao achou/erro.
 */
export function extractJsonBlock(raw: string): unknown | null {
  const match = raw.match(/```json\s*\n([\s\S]*?)```/);
  if (!match) {
    // Fallback: tenta parsear o texto inteiro como JSON (ultima tentativa)
    try {
      return JSON.parse(raw.trim());
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

/**
 * Valida um objeto parseado contra o schema InterviewResponse.
 * Joga InterviewResponseParseError se invalido.
 */
export function validateInterviewResponse(obj: unknown, raw = ''): InterviewResponse {
  if (!obj || typeof obj !== 'object') {
    throw new InterviewResponseParseError('Response is not an object', raw);
  }
  const o = obj as Record<string, unknown>;
  if (o.status === 'asking') {
    if (typeof o.nextQuestion !== 'string' || o.nextQuestion.length === 0) {
      throw new InterviewResponseParseError('asking.nextQuestion missing or empty', raw);
    }
    if (o.rationale !== undefined && typeof o.rationale !== 'string') {
      throw new InterviewResponseParseError('asking.rationale must be string when present', raw);
    }
    return { status: 'asking', nextQuestion: o.nextQuestion, rationale: o.rationale as string | undefined };
  }
  if (o.status === 'done') {
    if (typeof o.summary !== 'string' || o.summary.length === 0) {
      throw new InterviewResponseParseError('done.summary missing or empty', raw);
    }
    const diff = validateHarnessDiff(o.harnessDiff);
    return { status: 'done', summary: o.summary, harnessDiff: diff };
  }
  if (o.status === 'aborted') {
    if (typeof o.reason !== 'string') {
      throw new InterviewResponseParseError('aborted.reason missing', raw);
    }
    return { status: 'aborted', reason: o.reason };
  }
  throw new InterviewResponseParseError(`Unknown status: ${String(o.status)}`, raw);
}

/**
 * Valida HarnessDiff. Joga InterviewDiffValidationError se invalido.
 * Aceita somente HarnessFile validos e DiffOp com shape correto.
 */
export function validateHarnessDiff(obj: unknown): HarnessDiff {
  if (!obj || typeof obj !== 'object') {
    throw new InterviewDiffValidationError('HarnessDiff is not an object', obj);
  }
  const o = obj as Record<string, unknown>;
  if (typeof o.summary !== 'string') {
    throw new InterviewDiffValidationError('HarnessDiff.summary must be string', obj);
  }
  if (!Array.isArray(o.diffs)) {
    throw new InterviewDiffValidationError('HarnessDiff.diffs must be array', obj);
  }
  const diffs: FileDiff[] = [];
  for (const d of o.diffs) {
    if (!d || typeof d !== 'object') {
      throw new InterviewDiffValidationError('FileDiff is not an object', d);
    }
    const fd = d as Record<string, unknown>;
    if (!HARNESS_FILES_ALL.includes(fd.file as HarnessFile)) {
      throw new InterviewDiffValidationError(`Invalid file: ${String(fd.file)}`, d);
    }
    if (!Array.isArray(fd.ops)) {
      throw new InterviewDiffValidationError('FileDiff.ops must be array', d);
    }
    const ops: DiffOp[] = [];
    for (const op of fd.ops) {
      ops.push(validateDiffOp(op));
    }
    diffs.push({ file: fd.file as HarnessFile, ops });
  }
  return { summary: o.summary, diffs };
}

export function validateDiffOp(raw: unknown): DiffOp {
  if (!raw || typeof raw !== 'object') {
    throw new InterviewDiffValidationError('DiffOp is not an object', raw);
  }
  const o = raw as Record<string, unknown>;
  switch (o.op) {
    case 'append':
      if (typeof o.content !== 'string') {
        throw new InterviewDiffValidationError('append.content must be string', raw);
      }
      return { op: 'append', content: o.content };
    case 'replace':
      if (typeof o.find !== 'string' || typeof o.replace !== 'string') {
        throw new InterviewDiffValidationError('replace.find/replace must be strings', raw);
      }
      return { op: 'replace', find: o.find, replace: o.replace };
    case 'replace_section':
      if (typeof o.header !== 'string' || !o.header.startsWith('## ')) {
        throw new InterviewDiffValidationError('replace_section.header must be a H2 (starts with "## ")', raw);
      }
      if (typeof o.content !== 'string') {
        throw new InterviewDiffValidationError('replace_section.content must be string', raw);
      }
      return {
        op: 'replace_section',
        header: o.header,
        content: o.content,
        createIfMissing: Boolean(o.createIfMissing),
      };
    case 'set_placeholder':
      if (typeof o.key !== 'string') {
        throw new InterviewDiffValidationError('set_placeholder.key must be string', raw);
      }
      if (!(VALID_PLACEHOLDER_KEYS as readonly string[]).includes(o.key)) {
        throw new InterviewDiffValidationError(`set_placeholder.key not allowed: ${o.key}`, raw);
      }
      if (typeof o.value !== 'string') {
        throw new InterviewDiffValidationError('set_placeholder.value must be string', raw);
      }
      return { op: 'set_placeholder', key: o.key, value: o.value };
    default:
      throw new InterviewDiffValidationError(`Unknown op: ${String(o.op)}`, raw);
  }
}

/** Reset dos caches — util pra testes. */
export function _resetPromptCache(): void {
  cachedInterviewerPrompt = null;
  cachedScripts.clear();
}
