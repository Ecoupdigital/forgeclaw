import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// --------- Mock do ClaudeRunner ---------
// A instancia real e substituida por uma fake controlada via __setNextResponse().
// Cada chamada a `run()` consome a proxima resposta da fila e emite eventos sinteticos.

interface MockResponse {
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

const mockResponseQueue: MockResponse[] = [];
let mockCallCount = 0;

function __setNextResponse(r: MockResponse): void {
  mockResponseQueue.push(r);
}
function __resetMock(): void {
  mockResponseQueue.length = 0;
  mockCallCount = 0;
}

vi.mock('../../src/claude-runner', () => {
  class ClaudeRunner {
    private aborted = false;
    async *run(_prompt: string, _opts: unknown): AsyncGenerator<unknown, void, unknown> {
      mockCallCount += 1;
      const next = mockResponseQueue.shift();
      if (!next) {
        throw new Error('[mock ClaudeRunner] No queued response — test misconfigured');
      }
      if (this.aborted) return;
      yield { type: 'text', data: { text: next.text } };
      yield { type: 'done', data: { usage: next.usage } };
    }
    abort(): void {
      this.aborted = true;
    }
    get isRunning(): boolean {
      return false;
    }
  }
  return { ClaudeRunner };
});

// IMPORTA APOS vi.mock pra pegar a versao mockada
import { Interviewer } from '../../src/onboarding/interviewer';
import { applyDiff } from '../../src/onboarding/merger';
import { InterviewResponseParseError } from '../../src/onboarding/types';

// --------- Fixtures ---------

interface Fixture {
  description: string;
  archetype: 'solo-builder' | 'content-creator' | 'agency-freela' | 'ecom-manager' | 'generic';
  budget?: { maxTurns?: number; maxInputTokens?: number; maxOutputTokens?: number; timeoutMs?: number };
  turns: Array<{
    userInput: string;
    modelResponse: string;
    tokens: { input: number; output: number };
  }>;
}

const FIXTURES_DIR = join(__dirname, 'fixtures');
function loadFixture(name: string): Fixture {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf-8')) as Fixture;
}

// --------- Helpers de setup do harnessDir temporario ---------

function seedHarness(dir: string): void {
  writeFileSync(
    join(dir, 'USER.md'),
    '# USER.md\n\n- nome: {{userName}}\n- empresa: {{company}}\n- cargo: {{role}}\n- dir: {{workingDir}}\n',
  );
  writeFileSync(join(dir, 'SOUL.md'), '# SOUL\nbase\n');
  writeFileSync(join(dir, 'AGENTS.md'), '# Agents\n');
  writeFileSync(join(dir, 'TOOLS.md'), '# Tools\n');
  writeFileSync(join(dir, 'MEMORY.md'), '# Memory\n');
  writeFileSync(join(dir, 'STYLE.md'), '# Style\n');
  writeFileSync(join(dir, 'HEARTBEAT.md'), '# Heartbeat\n');
}

// --------- Testes ---------

describe('Interviewer integration', () => {
  let tmp: string;

  beforeEach(() => {
    __resetMock();
    tmp = mkdtempSync(join(tmpdir(), 'fc-itv-'));
    seedHarness(tmp);
  });

  afterEach(() => {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('happy path: asking -> asking -> done and diff applies', async () => {
    const fix = loadFixture('content-creator-happy');
    for (const t of fix.turns) {
      __setNextResponse({
        text: t.modelResponse,
        usage: { input_tokens: t.tokens.input, output_tokens: t.tokens.output },
      });
    }

    const itv = new Interviewer({
      archetype: fix.archetype,
      harnessDir: tmp,
    });

    const r1 = await itv.start();
    expect(r1.status).toBe('asking');
    if (r1.status !== 'asking') throw new Error('expected asking');
    expect(r1.nextQuestion).toContain('chamado');

    const r2 = await itv.answer('Me chamo Ana');
    expect(r2.status).toBe('asking');

    const r3 = await itv.answer('Marca Acme');
    expect(r3.status).toBe('done');
    if (r3.status !== 'done') throw new Error('expected done');

    // Aplicar o diff final em disco
    const mergeResult = applyDiff(tmp, r3.harnessDiff);
    expect(mergeResult.ok).toBe(true);
    expect(mergeResult.appliedFiles).toContain('USER.md');

    const userMd = readFileSync(join(tmp, 'USER.md'), 'utf-8');
    expect(userMd).toContain('nome: Ana');
    expect(userMd).toContain('empresa: Acme');

    const state = itv.getState();
    expect(state.status).toBe('done');
    expect(state.turns.length).toBeGreaterThanOrEqual(4);
    expect(state.finalDiff).not.toBeNull();
  });

  it('budget exceeded: maxTurns=2 triggers aborted status before 3rd turn', async () => {
    const fix = loadFixture('solo-builder-budget-exceeded');
    // Somente as 2 primeiras respostas serao consumidas — a 3a NAO deve ser chamada.
    for (const t of fix.turns.slice(0, 2)) {
      __setNextResponse({
        text: t.modelResponse,
        usage: { input_tokens: t.tokens.input, output_tokens: t.tokens.output },
      });
    }

    const itv = new Interviewer({
      archetype: fix.archetype,
      harnessDir: tmp,
      budget: fix.budget,
    });

    const r1 = await itv.start();
    expect(r1.status).toBe('asking');

    const r2 = await itv.answer('Bob');
    // Dependendo de como o budget contar (turno increment antes da chamada),
    // esse 2o turno ja pode ser aborted. Aceite ambos: 'asking' ou 'aborted'.
    expect(['asking', 'aborted']).toContain(r2.status);

    if (r2.status === 'asking') {
      // Proxima tentativa DEVE cair em aborted (max_turns=2 ja atingido apos o 2o incremento)
      const r3 = await itv.answer('nunca chega');
      expect(r3.status).toBe('aborted');
      if (r3.status === 'aborted') {
        expect(r3.reason).toMatch(/budget|max_turns/i);
      }
    }

    const state = itv.getState();
    expect(state.status).toBe('aborted');
    expect(state.budget.withinLimits).toBe(false);
    expect(state.budget.cutoffReason).toBe('max_turns');
  });

  it('model-emitted aborted propagates to state without crash', async () => {
    const fix = loadFixture('generic-abort');
    for (const t of fix.turns) {
      __setNextResponse({
        text: t.modelResponse,
        usage: { input_tokens: t.tokens.input, output_tokens: t.tokens.output },
      });
    }

    const itv = new Interviewer({ archetype: fix.archetype, harnessDir: tmp });
    const r = await itv.start();
    expect(r.status).toBe('aborted');
    if (r.status !== 'aborted') throw new Error('expected aborted');
    expect(r.reason).toMatch(/sair/i);
    expect(itv.getState().status).toBe('aborted');
  });

  it('malformed response throws InterviewResponseParseError', async () => {
    const fix = loadFixture('malformed-response');
    __setNextResponse({
      text: fix.turns[0].modelResponse,
      usage: { input_tokens: fix.turns[0].tokens.input, output_tokens: fix.turns[0].tokens.output },
    });

    const itv = new Interviewer({ archetype: fix.archetype, harnessDir: tmp });
    await expect(itv.start()).rejects.toThrow(InterviewResponseParseError);
    expect(itv.getState().status).toBe('error');
  });

  it('abort() during asking cancels interview', async () => {
    __setNextResponse({
      text: '```json\n{ "status": "asking", "nextQuestion": "q?" }\n```',
      usage: { input_tokens: 100, output_tokens: 30 },
    });

    const itv = new Interviewer({ archetype: 'generic', harnessDir: tmp });
    const r1 = await itv.start();
    expect(r1.status).toBe('asking');

    itv.abort('user-initiated');
    expect(itv.getState().status).toBe('aborted');
    expect(itv.getState().errorMessage).toContain('user-initiated');
  });

  it('getState returns immutable snapshots (different references)', async () => {
    __setNextResponse({
      text: '```json\n{ "status": "asking", "nextQuestion": "q?" }\n```',
      usage: { input_tokens: 100, output_tokens: 30 },
    });
    const itv = new Interviewer({ archetype: 'generic', harnessDir: tmp });
    await itv.start();
    const s1 = itv.getState();
    const s2 = itv.getState();
    expect(s1).not.toBe(s2); // different reference
    expect(s1.turns).not.toBe(s2.turns); // deep copied
  });
});
