import {
  DEFAULT_BUDGET,
  InterviewBudgetExceededError,
  type BudgetConfig,
  type BudgetStatus,
} from './types';

export interface BudgetTracker {
  readonly config: BudgetConfig;
  /** Registra que um novo turno comecou. Joga se exceder maxTurns. */
  incrementTurn(): void;
  /** Registra tokens consumidos. Joga se exceder maxInput/OutputTokens. */
  addTokens(input: number, output: number): void;
  /** Forca check de tempo. Joga se exceder timeoutMs. */
  assertTime(): void;
  /** Retorna snapshot imutavel do estado. */
  snapshot(): BudgetStatus;
  /** true se qualquer limite ja estourou. */
  exceeded(): boolean;
}

export function createBudgetTracker(partial?: Partial<BudgetConfig>): BudgetTracker {
  const config: BudgetConfig = { ...DEFAULT_BUDGET, ...(partial ?? {}) };
  const startedAt = Date.now();
  let turnsUsed = 0;
  let inputTokensUsed = 0;
  let outputTokensUsed = 0;
  let cutoffReason: BudgetStatus['cutoffReason'] | undefined;

  const elapsed = (): number => Date.now() - startedAt;

  const snapshot = (): BudgetStatus => ({
    turnsUsed,
    inputTokensUsed,
    outputTokensUsed,
    elapsedMs: elapsed(),
    withinLimits: cutoffReason === undefined,
    cutoffReason,
  });

  const markAndThrow = (reason: NonNullable<BudgetStatus['cutoffReason']>): never => {
    cutoffReason = reason;
    throw new InterviewBudgetExceededError(reason);
  };

  const incrementTurn = (): void => {
    turnsUsed += 1;
    if (turnsUsed > config.maxTurns) {
      markAndThrow('max_turns');
    }
  };

  const addTokens = (input: number, output: number): void => {
    inputTokensUsed += Math.max(0, input);
    outputTokensUsed += Math.max(0, output);
    if (inputTokensUsed > config.maxInputTokens) {
      markAndThrow('max_input_tokens');
    }
    if (outputTokensUsed > config.maxOutputTokens) {
      markAndThrow('max_output_tokens');
    }
  };

  const assertTime = (): void => {
    if (elapsed() > config.timeoutMs) {
      markAndThrow('timeout');
    }
  };

  return {
    config,
    incrementTurn,
    addTokens,
    assertTime,
    snapshot,
    exceeded: () => cutoffReason !== undefined,
  };
}
