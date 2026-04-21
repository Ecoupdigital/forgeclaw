import {
  text,
  confirm,
  select,
  spinner,
  log,
  isCancel,
} from '@clack/prompts';
import { randomBytes } from 'node:crypto';
import type { InstallContext, PhaseAResult } from './types';
import { writeState } from './state';

function cancelled(): never {
  log.warn('Installation cancelled.');
  process.exit(0);
}

function checkValue<T>(value: T | symbol): T {
  if (isCancel(value)) cancelled();
  return value as T;
}

/**
 * STUB — implementacao real em 25-02.
 * Retorna {ok:true} sempre nesta fase. Versao real valida versao do Bun,
 * existencia do `claude` CLI e se esta autenticado (via claude --print "ping" etc).
 */
export async function checkDependencies(): Promise<{
  ok: boolean;
  bunVersion?: string;
  hasClaude: boolean;
  claudeAuthenticated: boolean;
  reason?: string;
}> {
  return { ok: true, hasClaude: true, claudeAuthenticated: true };
}

/**
 * STUB — 25-02 substitui com logica que tenta `claude --print` e detecta
 * mensagens de nao-autenticado.
 */
export async function verifyClaudeAuth(): Promise<{ authenticated: boolean; hint?: string }> {
  return { authenticated: true };
}

/**
 * Fase A: coleta credenciais e valida pre-requisitos tecnicos.
 * Em caso de claude nao autenticado, escreve state com pauseReason
 * e aborta com instrucao clara.
 */
export async function runPhaseA(ctx: InstallContext): Promise<PhaseAResult> {
  const existing = ctx.existingConfig;

  // --- 1) Dependencias ---
  const sp = spinner();
  sp.start('Checking dependencies...');
  const deps = await checkDependencies();
  sp.stop('Dependency check complete.');

  if (!deps.ok) {
    writeState(ctx.stateFilePath, {
      version: 1,
      phase: 'none',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      pauseReason: deps.reason ?? 'dependency-missing',
    });
    log.error(deps.reason ?? 'Missing dependency.');
    log.warn('Resolve the issue, then run: npx forgeclaw install --resume');
    process.exit(1);
  }

  if (!deps.claudeAuthenticated) {
    writeState(ctx.stateFilePath, {
      version: 1,
      phase: 'none',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      pauseReason: 'claude-not-authenticated',
    });
    log.error('Claude Code CLI is installed but not authenticated.');
    log.warn('Run: claude login');
    log.warn('Then: npx forgeclaw install --resume');
    process.exit(1);
  }

  // --- 2) Credenciais ---
  const botToken = checkValue(
    await text({
      message: 'Telegram Bot Token (create at @BotFather):',
      placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      initialValue: (existing.botToken as string) ?? '',
      validate(value) {
        if (!value) return 'Token is required';
        if (!/^\d+:.+$/.test(value)) return 'Token must start with a number followed by :';
      },
    })
  );

  const userIdRaw = checkValue(
    await text({
      message: 'Your Telegram User ID (get it from @userinfobot):',
      placeholder: '123456789',
      initialValue: existing.allowedUsers
        ? String((existing.allowedUsers as number[])[0] ?? '')
        : '',
      validate(value) {
        if (!value) return 'User ID is required';
        if (!/^\d+$/.test(value)) return 'User ID must be a number';
      },
    })
  );

  const workingDir = checkValue(
    await text({
      message: 'Projects directory:',
      initialValue: (existing.workingDir as string) ?? '',
      validate(value) {
        if (!value) return 'Directory is required';
      },
    })
  );

  const useObsidian = checkValue(
    await confirm({
      message: 'Do you use an Obsidian Vault?',
      initialValue: !!existing.vaultPath,
    })
  );

  let vaultPath: string | null = null;
  if (useObsidian) {
    vaultPath = checkValue(
      await text({
        message: 'Vault path:',
        initialValue: (existing.vaultPath as string) ?? '',
        validate(value) {
          if (!value) return 'Vault path is required';
        },
      })
    );
  }

  const voiceProvider = checkValue(
    await select({
      message: 'Voice transcription provider:',
      initialValue: (existing.voiceProvider as string) ?? 'groq',
      options: [
        { value: 'groq', label: 'Groq Whisper (recommended, fast & free tier)' },
        { value: 'openai', label: 'OpenAI Whisper' },
        { value: 'none', label: 'No voice transcription' },
      ],
    })
  ) as 'groq' | 'openai' | 'none';

  let openaiApiKey: string | null = null;
  let groqApiKey: string | null = null;

  if (voiceProvider === 'openai') {
    openaiApiKey = checkValue(
      await text({
        message: 'OpenAI API Key:',
        placeholder: 'sk-...',
        initialValue: (existing.openaiApiKey as string) ?? '',
        validate(value) {
          if (!value) return 'API key is required for OpenAI Whisper';
        },
      })
    );
  } else if (voiceProvider === 'groq') {
    groqApiKey = checkValue(
      await text({
        message: 'Groq API Key (get at console.groq.com):',
        placeholder: 'gsk_...',
        initialValue: (existing.groqApiKey as string) ?? '',
        validate(value) {
          if (!value) return 'API key is required for Groq Whisper';
        },
      })
    );
  }

  const userName = checkValue(
    await text({
      message: 'Your name:',
      initialValue: (existing.userName as string) ?? '',
      validate(value) {
        if (!value) return 'Name is required';
      },
    })
  );

  const company = checkValue(
    await text({
      message: 'Your company:',
      initialValue: (existing.company as string) ?? '',
      placeholder: 'Optional',
    })
  );

  const role = checkValue(
    await text({
      message: 'Your role:',
      initialValue: (existing.role as string) ?? '',
      placeholder: 'Optional',
    })
  );

  const timezone =
    (typeof existing.timezone === 'string' && existing.timezone) || 'America/Sao_Paulo';

  const result: PhaseAResult = {
    botToken,
    userId: Number(userIdRaw),
    voiceProvider,
    openaiApiKey,
    groqApiKey,
    workingDir,
    vaultPath,
    userName,
    company,
    role,
    timezone,
    dashboardToken:
      (existing.dashboardToken as string) ?? randomBytes(32).toString('hex'),
  };

  // Persiste state apos Fase A completa. Resume pega daqui.
  writeState(ctx.stateFilePath, {
    version: 1,
    phase: 'a-complete',
    startedAt: ctx.existingState?.startedAt ?? new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    phaseAResult: result,
  });

  return result;
}
