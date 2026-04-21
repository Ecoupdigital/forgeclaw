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
import { checkBun, checkClaudeInstalled, checkClaudeAuth, MIN_BUN_VERSION } from './diagnostics';
import { validateBotToken, validateDirectoryExists } from './validators';

function cancelled(): never {
  log.warn('Installation cancelled.');
  process.exit(0);
}

function checkValue<T>(value: T | symbol): T {
  if (isCancel(value)) cancelled();
  return value as T;
}

/**
 * Valida Bun (>= MIN_BUN_VERSION), Claude Code CLI instalado e autenticado.
 * Cada falha retorna `ok:false` com `reason` acionavel e flags de diagnostico.
 */
export async function checkDependencies(): Promise<{
  ok: boolean;
  bunVersion?: string;
  hasClaude: boolean;
  claudeAuthenticated: boolean;
  reason?: string;
}> {
  const bun = await checkBun();
  if (!bun.installed) {
    return {
      ok: false,
      hasClaude: false,
      claudeAuthenticated: false,
      reason: 'Bun is not installed. Install from https://bun.sh then run: npx forgeclaw install --resume',
    };
  }
  if (!bun.meetsMinimum) {
    return {
      ok: false,
      bunVersion: bun.version,
      hasClaude: false,
      claudeAuthenticated: false,
      reason: `Bun ${bun.version} detected; minimum required is ${MIN_BUN_VERSION}. Run: bun upgrade, then: npx forgeclaw install --resume`,
    };
  }

  const claude = await checkClaudeInstalled();
  if (!claude.installed) {
    return {
      ok: false,
      bunVersion: bun.version,
      hasClaude: false,
      claudeAuthenticated: false,
      reason: 'Claude Code CLI not found on PATH. Install: npm install -g @anthropic-ai/claude-code, then: claude login, then: npx forgeclaw install --resume',
    };
  }

  const auth = await checkClaudeAuth();
  if (!auth.authenticated) {
    return {
      ok: false,
      bunVersion: bun.version,
      hasClaude: true,
      claudeAuthenticated: false,
      reason: auth.hint ?? 'Claude Code CLI is installed but not authenticated. Run: claude login',
    };
  }

  return {
    ok: true,
    bunVersion: bun.version,
    hasClaude: true,
    claudeAuthenticated: true,
  };
}

/**
 * Delegado a diagnostics.checkClaudeAuth. Mantido como superficie publica
 * pra permitir rechecagem pontual em outras fases se necessario.
 */
export async function verifyClaudeAuth(): Promise<{ authenticated: boolean; hint?: string }> {
  const r = await checkClaudeAuth();
  return { authenticated: r.authenticated, hint: r.hint };
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
  let botToken = '';
  let initialTokenValue = (existing.botToken as string) ?? '';
  while (true) {
    const raw = checkValue(
      await text({
        message: 'Telegram Bot Token (create at @BotFather):',
        placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        initialValue: initialTokenValue,
        validate(value) {
          if (!value) return 'Token is required';
          if (!/^\d+:.+$/.test(value)) return 'Token must start with a number followed by :';
        },
      })
    );
    const tokenSpinner = spinner();
    tokenSpinner.start('Validating token with Telegram...');
    const check = await validateBotToken(raw);
    tokenSpinner.stop(
      check.ok ? `Token valid (@${check.data?.botUsername})` : 'Token validation failed.'
    );
    if (check.ok) {
      botToken = raw;
      break;
    }
    log.warn(check.reason);
    // Pre-preenche com o valor rejeitado pro usuario poder editar em vez de digitar tudo de novo.
    initialTokenValue = raw;
  }

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
        const r = validateDirectoryExists(value);
        if (!r.ok) return r.reason;
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
