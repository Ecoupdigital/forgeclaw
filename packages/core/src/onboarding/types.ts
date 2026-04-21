/**
 * Tipos do Entrevistador ForgeClaw.
 *
 * Protocolo fechado, bounded em turnos e tokens, auditavel.
 *
 * Regras de ouro:
 *  - Nenhuma comunicacao entre modulos usa strings livres. Tudo flui via os tipos
 *    abaixo. Se precisar mudar o shape, mude AQUI primeiro e atualize callers.
 *  - InterviewResponse sempre tem discriminante `status` — nunca 2 campos
 *    opcionais representando o mesmo estado.
 *  - HarnessDiff nao aceita overwrite implicito de arquivo inteiro. Use
 *    DiffOp com operacao explicita.
 */

// ---------- Arquivos de harness alvo ----------

export type HarnessFile =
  | 'SOUL.md'
  | 'USER.md'
  | 'AGENTS.md'
  | 'TOOLS.md'
  | 'MEMORY.md'
  | 'STYLE.md'
  | 'HEARTBEAT.md';

export const HARNESS_FILES_ALL: readonly HarnessFile[] = [
  'SOUL.md',
  'USER.md',
  'AGENTS.md',
  'TOOLS.md',
  'MEMORY.md',
  'STYLE.md',
  'HEARTBEAT.md',
] as const;

// ---------- Arquetipo (referenciado, nao duplicado) ----------

export type ArchetypeSlug =
  | 'solo-builder'
  | 'content-creator'
  | 'agency-freela'
  | 'ecom-manager'
  | 'generic';

// ---------- Turnos e mensagens ----------

export type TurnRole = 'interviewer' | 'user';

export interface InterviewTurn {
  /** Incrementa a cada troca (interviewer ou user). 1-indexed. */
  index: number;
  role: TurnRole;
  text: string;
  /** Epoch ms (Date.now()). */
  at: number;
  /** Tokens consumidos neste turno (0 para turnos de user). */
  tokens?: {
    input: number;
    output: number;
    cacheCreation?: number;
    cacheRead?: number;
  };
}

// ---------- Operacoes de diff no harness ----------

/**
 * Operacoes permitidas em um arquivo de harness. Cada uma e uma mudanca
 * cirurgica, nunca "overwrite do arquivo inteiro". O merger aplica na ordem.
 */
export type DiffOp =
  /** Adiciona texto ao fim do arquivo (com separador \n\n se nao tiver). */
  | { op: 'append'; content: string }
  /** Substitui a primeira ocorrencia de `find` por `replace`. Falha se find ausente. */
  | { op: 'replace'; find: string; replace: string }
  /**
   * Substitui o conteudo de uma secao markdown (header H2 exato, ate o proximo H2
   * ou EOF). Se a secao nao existe, o merger pode criar no fim (flag createIfMissing).
   */
  | {
      op: 'replace_section';
      header: string; // ex: "## Pilares editoriais"
      content: string;
      createIfMissing?: boolean;
    }
  /**
   * Substitui um placeholder `{{key}}` em todas as ocorrencias. Util pra USER.md.
   * NOTA: o merger NAO valida se `key` esta em PlaceholderMap — cabe ao interviewer
   * emitir somente keys conhecidas.
   */
  | { op: 'set_placeholder'; key: string; value: string };

export interface FileDiff {
  file: HarnessFile;
  ops: DiffOp[];
}

export interface HarnessDiff {
  /** Lista ordenada de diffs por arquivo. Aplicados na ordem que vem. */
  diffs: FileDiff[];
  /** Resumo humano do que o entrevistador mudou (exibido ao usuario). */
  summary: string;
}

// ---------- Estado do budget ----------

export interface BudgetConfig {
  /** Teto de turnos totais (interviewer + user). Default 30 (15 trocas). */
  maxTurns: number;
  /** Teto de tokens de input acumulado. Default 80_000. */
  maxInputTokens: number;
  /** Teto de tokens de output acumulado. Default 20_000. */
  maxOutputTokens: number;
  /** Timeout total da sessao em ms. Default 15 minutos. */
  timeoutMs: number;
}

export interface BudgetStatus {
  turnsUsed: number;
  inputTokensUsed: number;
  outputTokensUsed: number;
  elapsedMs: number;
  /** true = ainda dentro dos limites; false = cutoff ativou. */
  withinLimits: boolean;
  /** Motivo do cutoff quando withinLimits === false. */
  cutoffReason?: 'max_turns' | 'max_input_tokens' | 'max_output_tokens' | 'timeout';
}

// ---------- Estado completo da interview ----------

export type InterviewStatus =
  | 'pending'      // criado mas run() nao chamado ainda
  | 'asking'       // entrevistador esperando proxima resposta do usuario
  | 'thinking'     // entrevistador processando (subprocess ativo)
  | 'done'         // diff finalizado e pronto pra merge
  | 'aborted'      // usuario ou budget cancelou
  | 'error';       // erro irrecuperavel

export interface InterviewState {
  /** Slug do arquetipo escolhido pelo usuario. */
  archetype: ArchetypeSlug;
  /** Historico completo de turnos (ordem 1..N). */
  turns: InterviewTurn[];
  /** Status corrente. */
  status: InterviewStatus;
  /** Diff final quando status === 'done'. */
  finalDiff: HarnessDiff | null;
  /** Snapshot do budget. */
  budget: BudgetStatus;
  /** Epoch ms em que a interview comecou. */
  startedAt: number;
  /** Epoch ms do ultimo evento. */
  updatedAt: number;
  /** Mensagem de erro quando status === 'error' ou 'aborted'. */
  errorMessage?: string;
}

// ---------- Output estruturado do modelo ----------

/**
 * Formato que o Entrevistador DEVE emitir a cada turno. E sempre JSON valido
 * em um unico objeto de nivel superior. Discriminado por `status`.
 *
 * O motor (interviewer.ts) parseia o output textual final do Claude,
 * localiza o PRIMEIRO bloco ```json ... ``` e valida contra este schema.
 */
export type InterviewResponse =
  | {
      status: 'asking';
      /** Pergunta unica pro usuario. Max ~400 chars. */
      nextQuestion: string;
      /** Opcional: justificativa curta (mostrada como subtitulo/tooltip). */
      rationale?: string;
    }
  | {
      status: 'done';
      /** Diff final pronto pra merge. */
      harnessDiff: HarnessDiff;
      /** Resumo humano do que mudou. */
      summary: string;
    }
  | {
      status: 'aborted';
      /** Motivo da abordagem ter sido abortada pelo proprio entrevistador. */
      reason: string;
    };

// ---------- Config do runner ----------

export interface InterviewerOptions {
  archetype: ArchetypeSlug;
  /** Caminho absoluto para o ~/.forgeclaw/harness/ atual (usado pelo merger). */
  harnessDir: string;
  /** Override do budget. Merge com DEFAULT_BUDGET. */
  budget?: Partial<BudgetConfig>;
  /** Modelo a usar (default do config de ForgeClaw). */
  model?: string;
  /** Working dir pro ClaudeRunner. Default: harnessDir. */
  cwd?: string;
  /**
   * Log sink opcional. Chamado a cada turno com o estado atualizado.
   * Uso: UI de onboarding (Fase 27) conecta aqui pra streamar em tempo real.
   */
  onTurn?: (state: InterviewState) => void;
  /** AbortSignal externo (ex: usuario clicou "cancelar"). */
  abortSignal?: AbortSignal;
}

// ---------- Defaults ----------

export const DEFAULT_BUDGET: BudgetConfig = {
  maxTurns: 30,
  maxInputTokens: 80_000,
  maxOutputTokens: 20_000,
  timeoutMs: 15 * 60 * 1000, // 15 min
};

// ---------- Erros tipados ----------

export class InterviewResponseParseError extends Error {
  constructor(message: string, public raw: string) {
    super(message);
    this.name = 'InterviewResponseParseError';
  }
}

export class InterviewBudgetExceededError extends Error {
  constructor(public reason: BudgetStatus['cutoffReason']) {
    super(`Interview budget exceeded: ${reason}`);
    this.name = 'InterviewBudgetExceededError';
  }
}

export class InterviewDiffValidationError extends Error {
  constructor(message: string, public diff: unknown) {
    super(message);
    this.name = 'InterviewDiffValidationError';
  }
}
