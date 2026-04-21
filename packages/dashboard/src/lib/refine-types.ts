/**
 * DTOs para a API de refine. Compartilhados entre route handlers e
 * componentes client. NAO reimporte tipos do @forgeclaw/core aqui — isso
 * empurraria o core pra bundle client. DTOs serializaveis dedicados.
 *
 * Os shapes espelham os do onboarding (Fase 27-02) propositalmente: a UI
 * reusa InterviewerChat/HarnessPreview/ActionsBar/BudgetBar mudando apenas o
 * hook de data source.
 */

export type RefineStatus =
  | "pending"
  | "asking"
  | "thinking"
  | "done"
  | "aborted"
  | "error";

export type RefineMode = "default" | "archetype" | "section" | "reset";

export type RefineArchetype =
  | "solo-builder"
  | "content-creator"
  | "agency-freela"
  | "ecom-manager"
  | "generic";

export type RefineSection =
  | "SOUL"
  | "USER"
  | "AGENTS"
  | "TOOLS"
  | "MEMORY"
  | "STYLE"
  | "HEARTBEAT";

export interface RefineMessageDTO {
  index: number;
  role: "interviewer" | "user";
  text: string;
  at: number;
}

export interface RefineHarnessFileDTO {
  name: string;
  currentContent: string;
  previewContent: string;
  changed: boolean;
}

export interface RefineDiffSummary {
  summary: string;
  filesTouched: string[];
  opsCount: number;
}

export interface RefineBudgetDTO {
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

export interface RefineSessionSnapshot {
  sessionId: string;
  archetype: RefineArchetype;
  mode: RefineMode;
  /** Section scope when mode === 'section'; null otherwise. */
  section: RefineSection | null;
  status: RefineStatus;
  messages: RefineMessageDTO[];
  currentQuestion: string | null;
  currentRationale: string | null;
  harnessFiles: RefineHarnessFileDTO[];
  diffSummary: RefineDiffSummary | null;
  budget: RefineBudgetDTO;
  errorMessage?: string;
  startedAt: number;
  updatedAt: number;
}

export interface RefineApiError {
  error: string;
  code:
    | "NO_SESSION"
    | "NO_ARCHETYPE"
    | "NOT_DONE"
    | "INVALID_INPUT"
    | "INTERVIEWER_FAILED"
    | "HARNESS_APPLY_FAILED"
    | "BACKUP_FAILED"
    | "NOT_FOUND"
    | "INTERNAL";
  details?: unknown;
}

export interface RefineCreateSessionBody {
  mode: RefineMode;
  /** Optional — if omitted, backend resolves from forgeclaw.config.json. */
  archetype?: RefineArchetype;
  /** Required when mode === 'section'. */
  section?: RefineSection;
}

export interface RefineApplyBody {
  sessionId: string;
  reason?: string;
}

export interface RefineApplyResponse {
  ok: true;
  backupId: string;
  appliedFiles: string[];
  skippedFiles: Array<{ file: string; reason: string }>;
  sentinelPath: string;
}

export interface RefineCancelBody {
  sessionId: string;
}

export interface RefineCancelResponse {
  ok: true;
  sentinelPath: string;
}

export interface RefineBackupDTO {
  id: string;
  createdAtIso: string;
  sizeBytes: number;
  fileCount: number;
}

export interface RefineListBackupsResponse {
  backups: RefineBackupDTO[];
}

export interface RefineRestoreBody {
  backupId: string;
}

export interface RefineRestoreResponse {
  ok: true;
  restoredId: string;
  sentinelPath: string;
}
