import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DiffOp, FileDiff, HarnessDiff, HarnessFile } from './types';
import { HARNESS_FILES_ALL, InterviewDiffValidationError } from './types';

export interface MergeResult {
  ok: boolean;
  appliedFiles: HarnessFile[];
  skippedFiles: Array<{ file: HarnessFile; reason: string }>;
  /** Conteudo final por arquivo (para debug/preview). */
  finalContents: Record<string, string>;
}

/**
 * Aplica um DiffOp em um conteudo de string. Puro — nao toca em disco.
 */
export function applyOpToContent(content: string, op: DiffOp): string {
  switch (op.op) {
    case 'append': {
      if (content.length === 0) return op.content.trimStart();
      const sep = content.endsWith('\n\n') ? '' : content.endsWith('\n') ? '\n' : '\n\n';
      return content + sep + op.content;
    }
    case 'replace': {
      if (!content.includes(op.find)) {
        throw new InterviewDiffValidationError(
          `replace: 'find' not found in content: ${op.find.slice(0, 60)}`,
          op,
        );
      }
      return content.replace(op.find, op.replace);
    }
    case 'replace_section': {
      return replaceSection(content, op.header, op.content, Boolean(op.createIfMissing));
    }
    case 'set_placeholder': {
      const token = `{{${op.key}}}`;
      // Substitui todas as ocorrencias (global), sem regex — escape-safe.
      return content.split(token).join(op.value);
    }
  }
}

/**
 * Substitui uma secao H2 delimitada por `header` ate o proximo header H2 ou EOF.
 * Preserva newline antes do proximo H2.
 *
 * - Se a secao nao existe e createIfMissing=true: appenda `\n\n{header}\n\n{content}`
 * - Se a secao nao existe e createIfMissing=false: throw
 */
function replaceSection(
  content: string,
  header: string,
  sectionContent: string,
  createIfMissing: boolean,
): string {
  if (!header.startsWith('## ')) {
    throw new InterviewDiffValidationError(
      `replace_section.header must start with "## ": ${header}`,
      { header },
    );
  }

  const lines = content.split('\n');
  const startIdx = lines.findIndex((l) => l === header || l.trimEnd() === header);

  if (startIdx === -1) {
    if (!createIfMissing) {
      throw new InterviewDiffValidationError(
        `replace_section: header not found and createIfMissing=false: ${header}`,
        { header },
      );
    }
    // Append no fim com separador garantido
    const sep = content.endsWith('\n\n') ? '' : content.endsWith('\n') ? '\n' : '\n\n';
    return content + sep + header + '\n\n' + sectionContent.replace(/\n+$/, '') + '\n';
  }

  // Encontra o fim: proxima linha que comece com "## " (H2) ou EOF
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      endIdx = i;
      break;
    }
  }

  const newSectionLines = [header, '', sectionContent.replace(/\n+$/, ''), ''];
  const before = lines.slice(0, startIdx);
  const after = lines.slice(endIdx);
  return [...before, ...newSectionLines, ...after].join('\n');
}

/**
 * Aplica uma lista ordenada de DiffOp em memoria sobre o conteudo atual.
 * Retorna novo conteudo. Joga InterviewDiffValidationError se algum op falha.
 */
export function applyOpsToContent(content: string, ops: DiffOp[]): string {
  let cur = content;
  for (const op of ops) {
    cur = applyOpToContent(cur, op);
  }
  return cur;
}

/**
 * Preview do diff: calcula o resultado SEM escrever em disco.
 * Util pra UI de onboarding (Fase 27) mostrar "antes/depois".
 */
export function previewDiff(harnessDir: string, diff: HarnessDiff): MergeResult {
  return runMerge(harnessDir, diff, /* dryRun */ true);
}

/**
 * Aplica o diff e ESCREVE nos arquivos. Retorna relatorio.
 *
 * Regras:
 *  - Cada FileDiff precisa referenciar um arquivo que EXISTE no harnessDir.
 *    Se nao existe, entra em skippedFiles (nao cria do zero).
 *  - Ordem: diffs sao aplicados na ordem do array. Ops dentro de um FileDiff idem.
 *  - Atomicidade: se QUALQUER ops falha em um arquivo, aquele arquivo e revertido
 *    (nao escrito). Os arquivos ja escritos anteriores NAO sao desfeitos —
 *    o caller da Interviewer deve tratar abort de transacao se precisar.
 */
export function applyDiff(harnessDir: string, diff: HarnessDiff): MergeResult {
  return runMerge(harnessDir, diff, /* dryRun */ false);
}

function runMerge(harnessDir: string, diff: HarnessDiff, dryRun: boolean): MergeResult {
  const applied: HarnessFile[] = [];
  const skipped: Array<{ file: HarnessFile; reason: string }> = [];
  const finalContents: Record<string, string> = {};

  for (const fd of diff.diffs) {
    if (!HARNESS_FILES_ALL.includes(fd.file)) {
      skipped.push({ file: fd.file, reason: `not in HARNESS_FILES_ALL` });
      continue;
    }
    const path = join(harnessDir, fd.file);
    if (!existsSync(path)) {
      skipped.push({ file: fd.file, reason: `file not found at ${path}` });
      continue;
    }
    let original: string;
    try {
      original = readFileSync(path, 'utf-8');
    } catch (err) {
      skipped.push({ file: fd.file, reason: `read error: ${(err as Error).message}` });
      continue;
    }
    let next: string;
    try {
      next = applyOpsToContent(original, fd.ops);
    } catch (err) {
      skipped.push({ file: fd.file, reason: `ops failed: ${(err as Error).message}` });
      continue;
    }
    finalContents[fd.file] = next;
    if (!dryRun) {
      writeFileSync(path, next);
    }
    applied.push(fd.file);
  }

  return {
    ok: skipped.length === 0,
    appliedFiles: applied,
    skippedFiles: skipped,
    finalContents,
  };
}

/** Helper: filtra apenas diffs de arquivos presentes no dir. Nao escreve. */
export function filterValidDiffs(harnessDir: string, diff: HarnessDiff): HarnessDiff {
  const filtered: FileDiff[] = diff.diffs.filter((fd) =>
    existsSync(join(harnessDir, fd.file)),
  );
  return { summary: diff.summary, diffs: filtered };
}
