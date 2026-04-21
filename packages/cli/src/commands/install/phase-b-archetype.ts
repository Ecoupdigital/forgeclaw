import {
  select,
  spinner,
  confirm,
  log,
  isCancel,
} from '@clack/prompts';
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import {
  listArchetypes,
  loadArchetype,
  renderArchetype,
  ARCHETYPE_FILES,
  type ArchetypeSlug,
  type PlaceholderMap,
} from '../../templates/archetypes';
import { setupService, writeEnvFile } from '../../utils/service';
import { compileHarness } from '@forgeclaw/core';
import type { InstallContext, PhaseAResult, PhaseBResult } from './types';
import { writeState } from './state';

function cancelled(): never {
  log.warn('Installation cancelled.');
  process.exit(0);
}

function checkValue<T>(value: T | symbol): T {
  if (isCancel(value)) cancelled();
  return value as T;
}

async function chooseArchetypeInteractive(): Promise<ArchetypeSlug> {
  const metas = listArchetypes();
  if (metas.length === 0) {
    log.error('No archetypes found. Reinstall the CLI package.');
    process.exit(1);
  }
  const options = metas.map((m) => ({
    value: m.slug,
    label: `${m.icon ?? '*'} ${m.name}`,
    hint: m.description,
  }));
  const choice = checkValue(
    await select({
      message: 'Choose an archetype (you can refine later in the dashboard):',
      options,
    })
  ) as ArchetypeSlug;
  return choice;
}

/**
 * Escreve os 7 arquivos do arquetipo em `<harnessDir>`. Preserva `{name}.md`
 * existente em modo `update` apenas se o arquivo ja tinha sido editado a mao
 * (detectado por presenca de marker `<!-- CUSTOM -->` no topo) — caso contrario sobrescreve.
 */
function writeHarnessFiles(
  harnessDir: string,
  files: Record<string, string>,
  isUpdate: boolean
): string[] {
  mkdirSync(harnessDir, { recursive: true });
  const written: string[] = [];
  for (const fname of ARCHETYPE_FILES) {
    const dest = join(harnessDir, fname);
    const content = files[fname];
    if (!content) continue;
    if (existsSync(dest) && isUpdate) {
      try {
        const existing = require('node:fs').readFileSync(dest, 'utf-8') as string;
        if (existing.startsWith('<!-- CUSTOM -->')) {
          log.info(`Skipped ${fname} (marked <!-- CUSTOM -->)`);
          continue;
        }
      } catch {
        // fall through to overwrite
      }
    }
    writeFileSync(dest, content);
    written.push(fname);
    log.info(`Wrote ${fname}`);
  }
  return written;
}

export async function runPhaseB(
  ctx: InstallContext,
  phaseA: PhaseAResult
): Promise<PhaseBResult> {
  // --- 1) Escolher arquetipo ---
  let slug: ArchetypeSlug;
  if (ctx.options.archetype) {
    slug = ctx.options.archetype;
    log.info(`Using archetype from flag: ${slug}`);
  } else {
    slug = await chooseArchetypeInteractive();
  }

  // --- 2) Carregar e validar o template ---
  const template = loadArchetype(slug);

  // --- 3) Criar estrutura de diretorios ---
  const dirs = [
    ctx.forgeclawDir,
    join(ctx.forgeclawDir, 'harness'),
    join(ctx.forgeclawDir, 'memory'),
    join(ctx.forgeclawDir, 'memory', 'DAILY'),
    join(ctx.forgeclawDir, 'db'),
    join(ctx.forgeclawDir, 'logs'),
    join(ctx.forgeclawDir, 'logs', 'crons'),
    join(ctx.forgeclawDir, 'agents'),
  ];
  for (const d of dirs) mkdirSync(d, { recursive: true });

  // --- 4) Montar placeholders a partir da Fase A ---
  const today = new Date().toISOString().slice(0, 10);
  const placeholders: PlaceholderMap = {
    userName: phaseA.userName,
    company: phaseA.company,
    role: phaseA.role,
    workingDir: phaseA.workingDir,
    vaultPath: phaseA.vaultPath ?? '',
    timezone: phaseA.timezone,
    today,
  };
  const rendered = renderArchetype(template, placeholders);

  // --- 5) Escrever harness files ---
  const sp = spinner();
  sp.start('Writing harness files...');
  const harnessDir = join(ctx.forgeclawDir, 'harness');
  const written = writeHarnessFiles(harnessDir, rendered, !!ctx.options.update);
  sp.stop(`Wrote ${written.length} harness files.`);

  // --- 6) Compilar CLAUDE.md ---
  const compileResult = compileHarness();
  if (compileResult.success) {
    log.success(`CLAUDE.md compiled (${compileResult.includedFiles.length} files)`);
  } else {
    log.warn('CLAUDE.md compilation failed — harness will not be injected into Claude prompts');
  }

  // --- 7) Escrever config ---
  const config = {
    botToken: phaseA.botToken,
    allowedUsers: [phaseA.userId],
    allowedGroups: phaseA.allowedGroups,
    workingDir: phaseA.workingDir,
    vaultPath: phaseA.vaultPath,
    voiceProvider: phaseA.voiceProvider,
    userName: phaseA.userName,
    company: phaseA.company,
    role: phaseA.role,
    dashboardToken: phaseA.dashboardToken,
    timezone: phaseA.timezone,
    defaultRuntime: template.meta.defaultRuntime,
    archetype: slug,
  };
  writeFileSync(ctx.configPath, JSON.stringify(config, null, 2));
  chmodSync(ctx.configPath, 0o600);
  log.success(`Config written to ${ctx.configPath}`);

  writeEnvFile({
    openaiApiKey: phaseA.openaiApiKey ?? null,
    groqApiKey: phaseA.groqApiKey ?? null,
  });

  // --- 8) bun install no monorepo (best-effort) ---
  const depSp = spinner();
  depSp.start('Installing dependencies (bun install)...');
  try {
    const bunInstall = Bun.spawn(['bun', 'install'], {
      cwd: ctx.monorepoRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await bunInstall.exited;
    if (bunInstall.exitCode === 0) {
      depSp.stop('Dependencies installed.');
    } else {
      depSp.stop('Dependency install had warnings.');
    }
  } catch (err) {
    depSp.stop('Failed to install dependencies.');
    log.warn(`bun install failed: ${String(err)}`);
  }

  // --- 9) Setup service ---
  let serviceInstalled = false;
  const shouldSetupService = checkValue(
    await confirm({
      message: 'Set up ForgeClaw as a system service (auto-start on boot)?',
      initialValue: true,
    })
  );
  if (shouldSetupService) {
    const serviceResult = await setupService(config as unknown as Record<string, unknown>);
    if (serviceResult.success) {
      log.success(serviceResult.message);
      serviceInstalled = true;
    } else {
      log.warn(serviceResult.message);
    }
  }

  // --- 10) Persistir state ---
  const result: PhaseBResult = {
    archetype: slug,
    harnessFilesWritten: written,
    configPath: ctx.configPath,
    serviceInstalled,
  };
  writeState(ctx.stateFilePath, {
    version: 1,
    phase: 'b-complete',
    startedAt: ctx.existingState?.startedAt ?? new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    phaseAResult: phaseA,
    phaseBResult: result,
  });

  return result;
}
