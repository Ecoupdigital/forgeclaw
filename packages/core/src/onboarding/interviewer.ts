import { ClaudeRunner } from '../claude-runner';
import type { StreamEvent } from '../types';
import type {
  ArchetypeSlug,
  InterviewResponse,
  InterviewState,
  InterviewTurn,
  InterviewerOptions,
  BudgetConfig,
} from './types';
import {
  DEFAULT_BUDGET,
  InterviewBudgetExceededError,
  InterviewResponseParseError,
} from './types';
import {
  loadInterviewerPrompt,
  extractJsonBlock,
  validateInterviewResponse,
} from './prompts';
import { createBudgetTracker, type BudgetTracker } from './budget';

/**
 * Motor do Entrevistador ForgeClaw.
 *
 * Ciclo de vida:
 *   new Interviewer(opts)
 *   await itv.start()               -> InterviewResponse (asking | done | aborted)
 *   await itv.answer("resposta 1")  -> InterviewResponse
 *   await itv.answer("resposta 2")  -> ...
 *   itv.abort()                     -> seta status=aborted
 *   itv.getState()                  -> InterviewState (imutavel snapshot)
 *
 * Nao aplica o diff — e responsabilidade do caller chamar applyDiff(merger.ts)
 * depois de receber a resposta final com status 'done'.
 */
export class Interviewer {
  private readonly archetype: ArchetypeSlug;
  private readonly harnessDir: string;
  private readonly systemPrompt: string;
  private readonly budget: BudgetTracker;
  private readonly model?: string;
  private readonly cwd: string;
  private readonly onTurn?: (state: InterviewState) => void;
  private readonly abortSignal?: AbortSignal;

  private turns: InterviewTurn[] = [];
  private status: InterviewState['status'] = 'pending';
  private finalDiff: InterviewState['finalDiff'] = null;
  private errorMessage: string | undefined;
  private readonly startedAt: number;
  private updatedAt: number;

  /** Runner ativo no turno corrente (pra permitir abort). */
  private currentRunner: ClaudeRunner | null = null;

  constructor(opts: InterviewerOptions) {
    this.archetype = opts.archetype;
    this.harnessDir = opts.harnessDir;
    this.systemPrompt = loadInterviewerPrompt(opts.archetype);
    const budgetConfig: BudgetConfig = { ...DEFAULT_BUDGET, ...(opts.budget ?? {}) };
    this.budget = createBudgetTracker(budgetConfig);
    this.model = opts.model;
    this.cwd = opts.cwd ?? opts.harnessDir;
    this.onTurn = opts.onTurn;
    this.abortSignal = opts.abortSignal;
    this.startedAt = Date.now();
    this.updatedAt = this.startedAt;

    if (this.abortSignal) {
      this.abortSignal.addEventListener('abort', () => this.abort(), { once: true });
    }
  }

  /** Inicia a entrevista com o prompt-kickoff. Retorna primeira resposta. */
  async start(): Promise<InterviewResponse> {
    if (this.status !== 'pending') {
      throw new Error(`Interviewer.start() called when status=${this.status}`);
    }
    return this.runTurn(KICKOFF_MESSAGE);
  }

  /** Envia uma resposta do usuario e retorna a proxima InterviewResponse. */
  async answer(userMessage: string): Promise<InterviewResponse> {
    if (this.status !== 'asking') {
      throw new Error(`Interviewer.answer() called when status=${this.status}`);
    }
    // Registra o turno do usuario
    this.pushTurn({ index: this.turns.length + 1, role: 'user', text: userMessage, at: Date.now() });
    return this.runTurn(userMessage);
  }

  /** Cancela e marca como aborted. Safe to call repeatedly. */
  abort(reason = 'Aborted by caller'): void {
    if (this.status === 'done' || this.status === 'aborted') return;
    this.status = 'aborted';
    this.errorMessage = reason;
    this.updatedAt = Date.now();
    if (this.currentRunner) {
      try { this.currentRunner.abort(); } catch { /* ignore */ }
      this.currentRunner = null;
    }
    this.onTurn?.(this.getState());
  }

  /** Snapshot imutavel do estado corrente. */
  getState(): InterviewState {
    return {
      archetype: this.archetype,
      turns: this.turns.map((t) => ({ ...t })),
      status: this.status,
      finalDiff: this.finalDiff,
      budget: this.budget.snapshot(),
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      errorMessage: this.errorMessage,
    };
  }

  // --------- internals ---------

  private pushTurn(turn: InterviewTurn): void {
    this.turns.push(turn);
    this.updatedAt = Date.now();
  }

  /**
   * Roda UM turno: monta prompt com historico + userMessage, chama ClaudeRunner,
   * coleta texto completo, extrai JSON, valida, atualiza estado.
   */
  private async runTurn(userMessage: string): Promise<InterviewResponse> {
    // Budget: turno de ida (assistant). O turno do user ja foi pushed em answer().
    try {
      this.budget.incrementTurn();
      this.budget.assertTime();
    } catch (err) {
      if (err instanceof InterviewBudgetExceededError) {
        this.status = 'aborted';
        this.errorMessage = `Budget exceeded: ${err.reason}`;
        this.updatedAt = Date.now();
        this.onTurn?.(this.getState());
        return { status: 'aborted', reason: this.errorMessage };
      }
      throw err;
    }

    this.status = 'thinking';
    this.updatedAt = Date.now();
    this.onTurn?.(this.getState());

    const prompt = buildTurnPrompt(this.turns, userMessage);

    const runner = new ClaudeRunner();
    this.currentRunner = runner;

    let collectedText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreation = 0;
    let cacheRead = 0;

    try {
      for await (const ev of runner.run(prompt, {
        cwd: this.cwd,
        systemPrompt: this.systemPrompt,
        model: this.model,
        // NOTE: nao passamos sessionId — cada turno e stateless no lado do CLI.
      })) {
        if (this.abortSignal?.aborted) {
          try { runner.abort(); } catch { /* ignore */ }
          this.status = 'aborted';
          this.errorMessage = 'AbortSignal triggered';
          this.updatedAt = Date.now();
          this.onTurn?.(this.getState());
          return { status: 'aborted', reason: this.errorMessage };
        }
        collectedText += extractTextFromEvent(ev);
        if (ev.type === 'done') {
          const usage = (ev.data.usage ?? {}) as {
            input_tokens?: number;
            output_tokens?: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
          };
          inputTokens = usage.input_tokens ?? 0;
          outputTokens = usage.output_tokens ?? 0;
          cacheCreation = usage.cache_creation_input_tokens ?? 0;
          cacheRead = usage.cache_read_input_tokens ?? 0;
        }
      }
    } catch (err) {
      this.status = 'error';
      this.errorMessage = (err as Error).message;
      this.updatedAt = Date.now();
      this.onTurn?.(this.getState());
      throw err;
    } finally {
      this.currentRunner = null;
    }

    // Registra turno do entrevistador
    this.pushTurn({
      index: this.turns.length + 1,
      role: 'interviewer',
      text: collectedText,
      at: Date.now(),
      tokens: { input: inputTokens, output: outputTokens, cacheCreation, cacheRead },
    });

    // Atualiza budget de tokens (cutoff se exceder)
    try {
      this.budget.addTokens(inputTokens, outputTokens);
    } catch (err) {
      if (err instanceof InterviewBudgetExceededError) {
        this.status = 'aborted';
        this.errorMessage = `Budget exceeded: ${err.reason}`;
        this.updatedAt = Date.now();
        this.onTurn?.(this.getState());
        return { status: 'aborted', reason: this.errorMessage };
      }
      throw err;
    }

    // Parse e valida
    let response: InterviewResponse;
    try {
      const json = extractJsonBlock(collectedText);
      response = validateInterviewResponse(json, collectedText);
    } catch (err) {
      if (err instanceof InterviewResponseParseError) {
        this.status = 'error';
        this.errorMessage = `Parse error: ${err.message}`;
        this.updatedAt = Date.now();
        this.onTurn?.(this.getState());
        throw err;
      }
      throw err;
    }

    // Atualiza status baseado na resposta
    switch (response.status) {
      case 'asking':
        this.status = 'asking';
        break;
      case 'done':
        this.status = 'done';
        this.finalDiff = response.harnessDiff;
        break;
      case 'aborted':
        this.status = 'aborted';
        this.errorMessage = response.reason;
        break;
    }
    this.updatedAt = Date.now();
    this.onTurn?.(this.getState());
    return response;
  }
}

// ---------- helpers ----------

const KICKOFF_MESSAGE =
  'Start the interview. The user has chosen their archetype and is waiting for your first question. Respond with the JSON block per the system prompt.';

/**
 * Monta o prompt do turno. Strategy: historico compacto em JSON + ultimo userMessage
 * entre tags claras. O system prompt ja contem as regras de output.
 */
function buildTurnPrompt(history: InterviewTurn[], userMessage: string): string {
  // Compacta historico: role + text (sem tokens).
  const transcript = history
    .map((t) => `[${t.role}] ${t.text}`)
    .join('\n\n');
  const transcriptBlock = transcript.length > 0
    ? `<transcript>\n${transcript}\n</transcript>`
    : '<transcript>(empty — first turn)</transcript>';

  return [
    transcriptBlock,
    '',
    `<current_user_message>${userMessage}</current_user_message>`,
    '',
    'Reply with the JSON block per the system prompt. One question at a time, or final done diff.',
  ].join('\n');
}

/**
 * Extrai texto de um StreamEvent do ClaudeRunner. Ignora thinking/tool_use/result.
 */
function extractTextFromEvent(ev: StreamEvent): string {
  if (ev.type === 'text') {
    const data = ev.data as { text?: string };
    return data.text ?? '';
  }
  return '';
}
