import { intro, log } from '@clack/prompts';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { runPhaseA } from './phase-a-technical';
import { runPhaseB } from './phase-b-archetype';
import { runPhaseC } from './phase-c-handoff';
import { readState, createFreshState } from './state';
import type {
  InstallOptions,
  InstallContext,
  PhaseAResult,
  PhaseBResult,
} from './types';

const FORGECLAW_DIR = join(homedir(), '.forgeclaw');
const CONFIG_PATH = join(FORGECLAW_DIR, 'forgeclaw.config.json');
const STATE_FILE_PATH = join(FORGECLAW_DIR, '.install-state.json');
const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');

function loadExistingConfig(): Record<string, unknown> {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function install(options: InstallOptions = {}): Promise<void> {
  const isUpdate = options.update ?? false;
  const isResume = options.resume ?? false;

  intro('ForgeClaw - Your Personal AI Command Center');

  const existingConfig = loadExistingConfig();
  const existingState = readState(STATE_FILE_PATH);

  if (isUpdate && Object.keys(existingConfig).length > 0) {
    log.info('Existing configuration loaded. Press Enter to keep current values.');
  }

  if (isResume && !existingState) {
    log.warn('No previous install state found. Starting fresh.');
  }

  if (isResume && existingState) {
    log.info(`Resuming install (last phase: ${existingState.phase}).`);
    if (existingState.pauseReason) {
      log.info(`Previous pause reason: ${existingState.pauseReason}`);
    }
  }

  const ctx: InstallContext = {
    options,
    forgeclawDir: FORGECLAW_DIR,
    configPath: CONFIG_PATH,
    stateFilePath: STATE_FILE_PATH,
    monorepoRoot: MONOREPO_ROOT,
    existingConfig,
    existingState: existingState ?? createFreshState(),
  };

  let phaseA: PhaseAResult;
  if (isResume && existingState?.phaseAResult && existingState.phase !== 'none') {
    log.info('Skipping Phase A (already complete).');
    phaseA = existingState.phaseAResult;
  } else {
    phaseA = await runPhaseA(ctx);
  }

  let phaseB: PhaseBResult;
  if (isResume && existingState?.phaseBResult && existingState.phase === 'b-complete') {
    log.info('Skipping Phase B (already complete).');
    phaseB = existingState.phaseBResult;
  } else {
    phaseB = await runPhaseB(ctx, phaseA);
  }

  await runPhaseC(ctx, phaseA, phaseB);
}
