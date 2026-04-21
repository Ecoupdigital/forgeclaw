import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyOpToContent,
  applyOpsToContent,
  applyDiff,
  previewDiff,
  InterviewDiffValidationError,
} from '../../src/onboarding';

describe('applyOpToContent', () => {
  it('append: adds content at end with paragraph separator', () => {
    // Contract (types.ts DiffOp.append): "separator \n\n if missing"
    // endsWith('\n\n') → already has paragraph separator, just concat
    // endsWith('\n')   → add 1 more \n to form \n\n
    // else              → add full \n\n
    expect(applyOpToContent('hello', { op: 'append', content: 'world' })).toBe('hello\n\nworld');
    expect(applyOpToContent('hello\n', { op: 'append', content: 'world' })).toBe('hello\n\nworld');
    expect(applyOpToContent('hello\n\n', { op: 'append', content: 'world' })).toBe('hello\n\nworld');
    expect(applyOpToContent('', { op: 'append', content: 'x' })).toBe('x');
  });

  it('replace: substitutes first occurrence', () => {
    expect(applyOpToContent('a b a', { op: 'replace', find: 'a', replace: 'X' })).toBe('X b a');
  });

  it('replace: throws when find not found', () => {
    expect(() => applyOpToContent('a b c', { op: 'replace', find: 'z', replace: 'X' })).toThrow(
      InterviewDiffValidationError,
    );
  });

  it('set_placeholder: replaces all occurrences without regex', () => {
    const content = 'ola {{userName}}, voce e {{userName}}? ({{userName}})';
    const out = applyOpToContent(content, { op: 'set_placeholder', key: 'userName', value: 'Ana' });
    expect(out).toBe('ola Ana, voce e Ana? (Ana)');
  });

  it('set_placeholder: value with special regex chars is safe', () => {
    const content = 'path: {{workingDir}}';
    const out = applyOpToContent(content, {
      op: 'set_placeholder',
      key: 'workingDir',
      value: '/home/a.b/$1/\\test',
    });
    expect(out).toBe('path: /home/a.b/$1/\\test');
  });

  it('replace_section: replaces existing H2 section up to next H2', () => {
    const content = [
      '# Title',
      '',
      '## Intro',
      'old intro',
      '',
      '## Middle',
      'mid',
      '',
      '## End',
      'end',
    ].join('\n');
    const out = applyOpToContent(content, {
      op: 'replace_section',
      header: '## Intro',
      content: 'NEW INTRO',
    });
    expect(out).toContain('## Intro');
    expect(out).toContain('NEW INTRO');
    expect(out).not.toContain('old intro');
    expect(out).toContain('## Middle');
    expect(out).toContain('## End');
  });

  it('replace_section: createIfMissing=true appends when not found', () => {
    const out = applyOpToContent('# Title\n\nbody\n', {
      op: 'replace_section',
      header: '## Novo',
      content: 'hi',
      createIfMissing: true,
    });
    expect(out).toContain('## Novo');
    expect(out).toContain('hi');
  });

  it('replace_section: throws when not found and createIfMissing=false', () => {
    expect(() =>
      applyOpToContent('# x', { op: 'replace_section', header: '## y', content: 'z' }),
    ).toThrow(InterviewDiffValidationError);
  });

  it('replace_section: throws on header not starting with "## "', () => {
    expect(() =>
      applyOpToContent('# x', {
        op: 'replace_section',
        header: '### subtitle',
        content: 'z',
        createIfMissing: true,
      }),
    ).toThrow(InterviewDiffValidationError);
  });
});

describe('applyOpsToContent', () => {
  it('applies ops in order', () => {
    const out = applyOpsToContent('foo', [
      { op: 'append', content: 'bar' },
      { op: 'replace', find: 'foo', replace: 'FOO' },
    ]);
    expect(out).toBe('FOO\n\nbar');
  });
});

describe('applyDiff / previewDiff', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fc-merger-'));
    // Seed: 3 arquivos de harness
    writeFileSync(join(tmpDir, 'USER.md'), 'nome: {{userName}}\n');
    writeFileSync(join(tmpDir, 'AGENTS.md'), '# Agents\n\n## Roster\nold\n');
    writeFileSync(join(tmpDir, 'SOUL.md'), '# SOUL\n\nbaseline\n');
  });

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('applyDiff writes files and returns relatorio', () => {
    const res = applyDiff(tmpDir, {
      summary: 'test',
      diffs: [
        {
          file: 'USER.md',
          ops: [{ op: 'set_placeholder', key: 'userName', value: 'Ana' }],
        },
        {
          file: 'AGENTS.md',
          ops: [{ op: 'replace_section', header: '## Roster', content: 'new\n' }],
        },
      ],
    });
    expect(res.ok).toBe(true);
    expect(res.appliedFiles).toContain('USER.md');
    expect(res.appliedFiles).toContain('AGENTS.md');
    expect(readFileSync(join(tmpDir, 'USER.md'), 'utf-8')).toContain('nome: Ana');
    expect(readFileSync(join(tmpDir, 'AGENTS.md'), 'utf-8')).toContain('new');
  });

  it('applyDiff skips missing files (does not crash)', () => {
    const res = applyDiff(tmpDir, {
      summary: 'test',
      diffs: [
        { file: 'HEARTBEAT.md', ops: [{ op: 'append', content: 'x' }] },
        { file: 'USER.md', ops: [{ op: 'set_placeholder', key: 'userName', value: 'B' }] },
      ],
    });
    expect(res.ok).toBe(false);
    expect(res.skippedFiles.find((s) => s.file === 'HEARTBEAT.md')).toBeTruthy();
    expect(res.appliedFiles).toContain('USER.md');
  });

  it('applyDiff reverts a file when any op in it fails', () => {
    const res = applyDiff(tmpDir, {
      summary: 'test',
      diffs: [
        {
          file: 'SOUL.md',
          ops: [
            { op: 'append', content: 'yay' },
            { op: 'replace', find: 'does-not-exist', replace: 'X' }, // falha
          ],
        },
      ],
    });
    expect(res.ok).toBe(false);
    expect(res.appliedFiles).not.toContain('SOUL.md');
    // Arquivo original preservado
    expect(readFileSync(join(tmpDir, 'SOUL.md'), 'utf-8')).toBe('# SOUL\n\nbaseline\n');
  });

  it('previewDiff does not write to disk', () => {
    const before = readFileSync(join(tmpDir, 'USER.md'), 'utf-8');
    const res = previewDiff(tmpDir, {
      summary: 'preview',
      diffs: [{ file: 'USER.md', ops: [{ op: 'set_placeholder', key: 'userName', value: 'X' }] }],
    });
    expect(res.finalContents['USER.md']).toContain('nome: X');
    const after = readFileSync(join(tmpDir, 'USER.md'), 'utf-8');
    expect(after).toBe(before);
  });
});
