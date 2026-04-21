/**
 * DTOs da API de onboarding. Compartilhados entre route handlers e componentes
 * client. NAO reimporte tipos do @forgeclaw/core aqui — isso empurraria o core
 * pra bundle client. Definimos DTOs serializaveis dedicados.
 */

export type OnboardingStatus =
  | "pending"
  | "asking"
  | "thinking"
  | "done"
  | "aborted"
  | "error";

export interface OnboardingMessageDTO {
  index: number;
  role: "interviewer" | "user";
  text: string;
  /** Epoch ms. */
  at: number;
}

export interface OnboardingHarnessFileDTO {
  name: string;
  /** Conteudo atual em disco. */
  currentContent: string;
  /** Conteudo apos aplicar o diff corrente (igual a currentContent se nao ha ops nele). */
  previewContent: string;
  /** true se o preview difere do conteudo atual. */
  changed: boolean;
}

export interface OnboardingDiffSummary {
  summary: string;
  /** Resumo curto: files touched, ops count. */
  filesTouched: string[];
  opsCount: number;
}

export interface OnboardingBudgetDTO {
  turnsUsed: number;
  maxTurns: number;
  inputTokensUsed: number;
  maxInputTokens: number;
  outputTokensUsed: number;
  maxOutputTokens: number;
  elapsedMs: number;
  timeoutMs: number;
  withinLimits: boolean;
  cutoffReason?: string;
}

export interface OnboardingSessionSnapshot {
  sessionId: string;
  archetype: string;
  status: OnboardingStatus;
  messages: OnboardingMessageDTO[];
  /** Pergunta pendente quando status === 'asking'. */
  currentQuestion: string | null;
  /** Justificativa opcional da pergunta. */
  currentRationale: string | null;
  /** Arquivos do harness com current/preview. */
  harnessFiles: OnboardingHarnessFileDTO[];
  /** Resumo do diff final quando status === 'done'. */
  diffSummary: OnboardingDiffSummary | null;
  /** Status do budget (turnos/tokens/tempo). */
  budget: OnboardingBudgetDTO;
  /** Mensagem de erro quando status === 'error' ou 'aborted'. */
  errorMessage?: string;
  startedAt: number;
  updatedAt: number;
}

export interface OnboardingApiError {
  error: string;
  code:
    | "NO_SESSION"
    | "ALREADY_DONE"
    | "NOT_DONE"
    | "INVALID_INPUT"
    | "INTERVIEWER_FAILED"
    | "HARNESS_APPLY_FAILED"
    | "INTERNAL";
  details?: unknown;
}

export interface OnboardingApproveResponse {
  ok: true;
  appliedFiles: string[];
  skippedFiles: Array<{ file: string; reason: string }>;
  sentinelPath: string;
  redirectTo: string;
}

export interface OnboardingSkipResponse {
  ok: true;
  sentinelPath: string;
  redirectTo: string;
}
