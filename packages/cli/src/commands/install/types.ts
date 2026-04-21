import type { ArchetypeSlug } from '../../templates/archetypes';

/**
 * Flags aceitas pela CLI em `forgeclaw install` / `forgeclaw update`.
 */
export interface InstallOptions {
  /** Reutiliza config existente preenchendo defaults (modo `forgeclaw update`). */
  update?: boolean;
  /** Retoma instalacao a partir do state file em ~/.forgeclaw/.install-state.json. */
  resume?: boolean;
  /** Pula a escolha interativa de arquetipo se ja foi informado. */
  archetype?: ArchetypeSlug;
  /** Quando true, nao abre browser e nao faz spawn do dashboard (uso em CI/tests). */
  noHandoff?: boolean;
}

/**
 * Dados coletados na Fase A (tecnica). Serializaveis.
 * Suficientes para construir `forgeclaw.config.json` apos a Fase B.
 */
export interface PhaseAResult {
  botToken: string;
  userId: number;
  allowedGroups?: number[];
  voiceProvider: 'groq' | 'openai' | 'none';
  openaiApiKey?: string | null;
  groqApiKey?: string | null;
  workingDir: string;
  vaultPath: string | null;
  userName: string;
  company: string;
  role: string;
  timezone: string;
  dashboardToken: string;
}

/**
 * Dados produzidos pela Fase B (arquetipo). Serializaveis.
 */
export interface PhaseBResult {
  archetype: ArchetypeSlug;
  harnessFilesWritten: string[];
  configPath: string;
  serviceInstalled: boolean;
}

/**
 * Shape do arquivo ~/.forgeclaw/.install-state.json.
 * "phase" guarda a ULTIMA fase COMPLETA. Se phase='a' o resume pula Fase A e roda B->C.
 */
export interface InstallState {
  version: 1;
  phase: 'none' | 'a-complete' | 'b-complete';
  startedAt: string; // ISO
  lastUpdatedAt: string; // ISO
  phaseAResult?: PhaseAResult;
  phaseBResult?: PhaseBResult;
  /** Motivo da interrupcao quando aplicavel (ex: claude-not-authenticated). */
  pauseReason?: string;
}

/**
 * Contexto passado entre fases. Imutavel apos construcao.
 */
export interface InstallContext {
  options: InstallOptions;
  forgeclawDir: string;       // ~/.forgeclaw
  configPath: string;         // ~/.forgeclaw/forgeclaw.config.json
  stateFilePath: string;      // ~/.forgeclaw/.install-state.json
  monorepoRoot: string;       // raiz do checkout (fallback caminhos do bun install)
  existingConfig: Record<string, unknown>;
  existingState: InstallState | null;
}
