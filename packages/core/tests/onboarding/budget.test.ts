import { describe, it, expect } from 'vitest';
import {
  createBudgetTracker,
  InterviewBudgetExceededError,
  DEFAULT_BUDGET,
} from '../../src/onboarding';

describe('createBudgetTracker', () => {
  it('uses DEFAULT_BUDGET when no overrides', () => {
    const b = createBudgetTracker();
    expect(b.config.maxTurns).toBe(DEFAULT_BUDGET.maxTurns);
    expect(b.config.maxInputTokens).toBe(DEFAULT_BUDGET.maxInputTokens);
  });

  it('applies partial overrides', () => {
    const b = createBudgetTracker({ maxTurns: 4 });
    expect(b.config.maxTurns).toBe(4);
    expect(b.config.maxInputTokens).toBe(DEFAULT_BUDGET.maxInputTokens);
  });

  it('increments turns safely up to max', () => {
    const b = createBudgetTracker({ maxTurns: 3 });
    b.incrementTurn(); // 1
    b.incrementTurn(); // 2
    b.incrementTurn(); // 3
    expect(b.snapshot().turnsUsed).toBe(3);
    expect(b.exceeded()).toBe(false);
  });

  it('throws InterviewBudgetExceededError on max_turns overflow', () => {
    const b = createBudgetTracker({ maxTurns: 2 });
    b.incrementTurn();
    b.incrementTurn();
    expect(() => b.incrementTurn()).toThrow(InterviewBudgetExceededError);
    expect(b.snapshot().cutoffReason).toBe('max_turns');
    expect(b.exceeded()).toBe(true);
  });

  it('throws on max_input_tokens', () => {
    const b = createBudgetTracker({ maxInputTokens: 100 });
    b.addTokens(50, 0);
    b.addTokens(49, 0);
    expect(() => b.addTokens(5, 0)).toThrow(InterviewBudgetExceededError);
    expect(b.snapshot().cutoffReason).toBe('max_input_tokens');
  });

  it('throws on max_output_tokens', () => {
    const b = createBudgetTracker({ maxOutputTokens: 50 });
    b.addTokens(0, 40);
    expect(() => b.addTokens(0, 20)).toThrow(InterviewBudgetExceededError);
    expect(b.snapshot().cutoffReason).toBe('max_output_tokens');
  });

  it('ignores negative token values (treats as 0)', () => {
    const b = createBudgetTracker({ maxInputTokens: 100 });
    b.addTokens(-10, -5);
    expect(b.snapshot().inputTokensUsed).toBe(0);
    expect(b.snapshot().outputTokensUsed).toBe(0);
  });

  it('snapshot is immutable across calls', () => {
    const b = createBudgetTracker({ maxTurns: 5 });
    const s1 = b.snapshot();
    b.incrementTurn();
    expect(s1.turnsUsed).toBe(0); // snapshot frozen
  });
});
