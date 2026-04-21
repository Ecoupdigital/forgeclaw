import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractJsonBlock,
  validateInterviewResponse,
  validateHarnessDiff,
  validateDiffOp,
  loadInterviewerPrompt,
  loadInterviewerBase,
  loadScript,
  VALID_PLACEHOLDER_KEYS,
  _resetPromptCache,
} from '../../src/onboarding/prompts';
import {
  InterviewResponseParseError,
  InterviewDiffValidationError,
  type ArchetypeSlug,
} from '../../src/onboarding/types';

describe('extractJsonBlock', () => {
  it('extracts JSON from ```json fenced block```', () => {
    const raw = 'some preamble\n```json\n{ "status": "asking", "nextQuestion": "q?" }\n```\ntail';
    const out = extractJsonBlock(raw) as { status?: string };
    expect(out?.status).toBe('asking');
  });

  it('returns null when block present but invalid JSON', () => {
    const raw = '```json\n{ invalid\n```';
    expect(extractJsonBlock(raw)).toBeNull();
  });

  it('falls back to parsing entire raw when no fenced block', () => {
    const raw = '{"status":"aborted","reason":"x"}';
    const out = extractJsonBlock(raw) as { status?: string };
    expect(out?.status).toBe('aborted');
  });

  it('returns null when no JSON at all', () => {
    expect(extractJsonBlock('hello world')).toBeNull();
  });

  it('extracts FIRST block when multiple exist', () => {
    const raw = '```json\n{"status":"asking","nextQuestion":"first"}\n```\nand then\n```json\n{"status":"aborted","reason":"second"}\n```';
    const out = extractJsonBlock(raw) as { status?: string; nextQuestion?: string };
    expect(out?.status).toBe('asking');
    expect(out?.nextQuestion).toBe('first');
  });
});

describe('validateInterviewResponse', () => {
  it('accepts valid asking', () => {
    const r = validateInterviewResponse({
      status: 'asking',
      nextQuestion: 'Qual seu nome?',
      rationale: 'basico',
    });
    expect(r.status).toBe('asking');
    if (r.status === 'asking') {
      expect(r.nextQuestion).toBe('Qual seu nome?');
    }
  });

  it('accepts valid done with diff', () => {
    const r = validateInterviewResponse({
      status: 'done',
      summary: 'tudo ok',
      harnessDiff: {
        summary: 'tudo ok',
        diffs: [
          {
            file: 'USER.md',
            ops: [{ op: 'set_placeholder', key: 'userName', value: 'Ana' }],
          },
        ],
      },
    });
    expect(r.status).toBe('done');
  });

  it('accepts valid aborted', () => {
    const r = validateInterviewResponse({ status: 'aborted', reason: 'x' });
    expect(r.status).toBe('aborted');
  });

  it('throws on missing status', () => {
    expect(() => validateInterviewResponse({})).toThrow(InterviewResponseParseError);
  });

  it('throws on unknown status', () => {
    expect(() => validateInterviewResponse({ status: 'weird' })).toThrow(InterviewResponseParseError);
  });

  it('throws on asking without nextQuestion', () => {
    expect(() => validateInterviewResponse({ status: 'asking' })).toThrow(InterviewResponseParseError);
  });

  it('throws on done without summary', () => {
    expect(() =>
      validateInterviewResponse({
        status: 'done',
        harnessDiff: { summary: 'x', diffs: [] },
      }),
    ).toThrow(InterviewResponseParseError);
  });

  it('throws on aborted without reason', () => {
    expect(() => validateInterviewResponse({ status: 'aborted' })).toThrow(InterviewResponseParseError);
  });
});

describe('validateHarnessDiff', () => {
  it('accepts empty diffs array', () => {
    const r = validateHarnessDiff({ summary: 'nothing', diffs: [] });
    expect(r.diffs).toHaveLength(0);
  });

  it('throws on missing summary', () => {
    expect(() => validateHarnessDiff({ diffs: [] })).toThrow(InterviewDiffValidationError);
  });

  it('throws on invalid file name', () => {
    expect(() =>
      validateHarnessDiff({
        summary: 's',
        diffs: [{ file: 'FOO.md', ops: [] }],
      }),
    ).toThrow(InterviewDiffValidationError);
  });

  it('throws on non-array ops', () => {
    expect(() =>
      validateHarnessDiff({
        summary: 's',
        diffs: [{ file: 'USER.md', ops: 'bogus' }],
      }),
    ).toThrow(InterviewDiffValidationError);
  });
});

describe('validateDiffOp', () => {
  it('accepts append', () => {
    const op = validateDiffOp({ op: 'append', content: 'x' });
    expect(op.op).toBe('append');
  });

  it('accepts replace', () => {
    const op = validateDiffOp({ op: 'replace', find: 'a', replace: 'b' });
    expect(op.op).toBe('replace');
  });

  it('accepts replace_section with H2 header', () => {
    const op = validateDiffOp({
      op: 'replace_section',
      header: '## Intro',
      content: 'x',
      createIfMissing: true,
    });
    expect(op.op).toBe('replace_section');
  });

  it('throws on replace_section with H3 header', () => {
    expect(() =>
      validateDiffOp({ op: 'replace_section', header: '### sub', content: 'x' }),
    ).toThrow(InterviewDiffValidationError);
  });

  it('accepts set_placeholder with valid key', () => {
    for (const key of VALID_PLACEHOLDER_KEYS) {
      const op = validateDiffOp({ op: 'set_placeholder', key, value: 'x' });
      expect(op.op).toBe('set_placeholder');
    }
  });

  it('throws on set_placeholder with invalid key', () => {
    expect(() =>
      validateDiffOp({ op: 'set_placeholder', key: 'today', value: 'x' }),
    ).toThrow(InterviewDiffValidationError);
    expect(() =>
      validateDiffOp({ op: 'set_placeholder', key: 'notARealKey', value: 'x' }),
    ).toThrow(InterviewDiffValidationError);
  });

  it('throws on unknown op', () => {
    expect(() => validateDiffOp({ op: 'wipe_file' })).toThrow(InterviewDiffValidationError);
  });
});

describe('loadInterviewerPrompt', () => {
  beforeEach(() => _resetPromptCache());

  it('loads base prompt without crashing', () => {
    const base = loadInterviewerBase();
    expect(base).toContain('ForgeClaw Interviewer');
    expect(base.length).toBeGreaterThan(500);
  });

  const slugs: ArchetypeSlug[] = [
    'solo-builder',
    'content-creator',
    'agency-freela',
    'ecom-manager',
    'generic',
  ];

  it.each(slugs)('loadInterviewerPrompt(%s) concatenates base + script', (slug) => {
    const prompt = loadInterviewerPrompt(slug);
    expect(prompt).toContain('ForgeClaw Interviewer');
    // Cada script tem um heading Roteiro
    expect(prompt).toMatch(/Roteiro:/);
    // Separador presente
    expect(prompt).toContain('\n\n---\n\n');
  });

  it.each(slugs)('loadScript(%s) returns non-empty string', (slug) => {
    const s = loadScript(slug);
    expect(s).not.toBeNull();
    expect((s ?? '').length).toBeGreaterThan(100);
  });
});
