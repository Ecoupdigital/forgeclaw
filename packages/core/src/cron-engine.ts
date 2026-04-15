import { Cron } from 'croner';
import { readFile, writeFile, watch } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ClaudeRunner } from './claude-runner';
import { getConfig } from './config';
import { stateStore } from './state-store';
import { eventBus } from './event-bus';
import { runnerRegistry } from './runners';
import type { CronJob, CronLog, RuntimeName } from './types';

const DEFAULT_HEARTBEAT_PATH = join(homedir(), '.forgeclaw', 'HEARTBEAT.md');

interface ParsedJob {
  name: string;
  schedule: string;
  prompt: string;
  targetTopic: string;
}

type SchedulePattern = {
  regex: RegExp;
  toCron: (match: RegExpMatchArray) => string;
};

const SCHEDULE_PATTERNS: SchedulePattern[] = [
  {
    // "Todo dia às 23h30", "Todo dia às 8h15"
    regex: /^todo\s+dia\s+[àa]s?\s+(\d{1,2})h(\d{2})$/i,
    toCron: (m) => `${m[2]} ${m[1]} * * *`,
  },
  {
    // "Todo dia às 8h", "Todo dia às 23h"
    regex: /^todo\s+dia\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * *`,
  },
  {
    // "Toda hora"
    regex: /^toda\s+hora$/i,
    toCron: () => '0 * * * *',
  },
  {
    // "Toda segunda às 8h"
    regex: /^toda\s+segunda\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * 1`,
  },
  {
    // "Toda terça às 9h"
    regex: /^toda\s+ter[çc]a\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * 2`,
  },
  {
    // "Toda quarta às 9h"
    regex: /^toda\s+quarta\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * 3`,
  },
  {
    // "Toda quinta às 9h"
    regex: /^toda\s+quinta\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * 4`,
  },
  {
    // "Toda sexta às 9h"
    regex: /^toda\s+sexta\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * 5`,
  },
  {
    // "Toda terça e quinta às 9h"
    regex: /^toda\s+ter[çc]a\s+e\s+quinta\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * 2,4`,
  },
  {
    // "Toda segunda e quarta às 9h"
    regex: /^toda\s+segunda\s+e\s+quarta\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * 1,3`,
  },
  {
    // "Toda segunda, quarta e sexta às 9h"
    regex: /^toda\s+segunda,?\s+quarta\s+e\s+sexta\s+[àa]s?\s+(\d{1,2})h$/i,
    toCron: (m) => `0 ${m[1]} * * 1,3,5`,
  },
  {
    // "A cada N minutos"
    regex: /^a\s+cada\s+(\d+)\s+minutos?$/i,
    toCron: (m) => `*/${m[1]} * * * *`,
  },
  {
    // "A cada N horas"
    regex: /^a\s+cada\s+(\d+)\s+horas?$/i,
    toCron: (m) => `0 */${m[1]} * * *`,
  },
];

function naturalToCron(schedule: string): string | null {
  const trimmed = schedule.trim();

  for (const pattern of SCHEDULE_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      return pattern.toCron(match);
    }
  }

  // If already a cron expression (5 fields), pass through
  if (/^[\d*\/,\-]+\s+[\d*\/,\-]+\s+[\d*\/,\-]+\s+[\d*\/,\-]+\s+[\d*\/,\-]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateTimeIso(d: Date): string {
  return `${formatDateIso(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Substitui template vars no prompt do cron antes de enviar ao ClaudeRunner.
 * Vars suportadas:
 *   - {today}     -> YYYY-MM-DD local
 *   - {yesterday} -> YYYY-MM-DD local de ontem
 *   - {now}       -> YYYY-MM-DDTHH:MM local
 *
 * Substituicao literal (sem regex). Vars desconhecidas sao deixadas intactas.
 */
function expandTemplateVars(prompt: string, now: Date = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return prompt
    .split('{today}').join(formatDateIso(now))
    .split('{yesterday}').join(formatDateIso(yesterday))
    .split('{now}').join(formatDateTimeIso(now));
}

class CronEngine {
  private heartbeatPath: string;
  private scheduledJobs: Cron[] = [];
  private watchAbort: AbortController | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(heartbeatPath: string = DEFAULT_HEARTBEAT_PATH) {
    this.heartbeatPath = heartbeatPath;
  }

  parseHeartbeat(content: string): ParsedJob[] {
    // Descartar a secao "## Managed by Dashboard" (mirror do dashboard, nao fonte de verdade).
    // A secao vai do marcador ate o proximo header '^## ' OU o fim do arquivo.
    // O DB continua sendo source-of-truth para jobs DB-origin — a secao e apenas mirror legivel.
    const managedHeader = /^## Managed by Dashboard\s*$/m;
    const managedMatch = managedHeader.exec(content);
    if (managedMatch) {
      const start = managedMatch.index;
      const afterHeader = start + managedMatch[0].length;
      const rest = content.slice(afterHeader);
      const nextHeaderMatch = rest.match(/^## /m);
      if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
        // Remove apenas o trecho do marcador ate o proximo header '^## '
        content = content.slice(0, start) + content.slice(afterHeader + nextHeaderMatch.index);
      } else {
        // Remove do marcador ate o fim do arquivo
        content = content.slice(0, start);
      }
    }

    const jobs: ParsedJob[] = [];
    const headerRegex = /^## (.+?) → tópico: (.+)$/gm;
    const headers: { schedule: string; topic: string; index: number }[] = [];

    let match: RegExpExecArray | null;
    while ((match = headerRegex.exec(content)) !== null) {
      headers.push({
        schedule: match[1].trim(),
        topic: match[2].trim(),
        index: match.index + match[0].length,
      });
    }

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const nextIndex = i + 1 < headers.length ? headers[i + 1].index - headers[i + 1].schedule.length - headers[i + 1].topic.length - 20 : content.length;
      const section = content.slice(header.index, nextIndex);

      const items: string[] = [];
      const itemRegex = /^- (.+)$/gm;
      let itemMatch: RegExpExecArray | null;
      while ((itemMatch = itemRegex.exec(section)) !== null) {
        items.push(itemMatch[1].trim());
      }

      if (items.length === 0) continue;

      const cronExpr = naturalToCron(header.schedule);
      if (!cronExpr) {
        console.warn(`[cron-engine] Schedule not recognized, skipping: "${header.schedule}"`);
        continue;
      }

      jobs.push({
        name: header.schedule,
        schedule: cronExpr,
        prompt: items.join('\n'),
        targetTopic: header.topic,
      });
    }

    return jobs;
  }

  async start(): Promise<void> {
    if (this.running) {
      await this.stop();
    }

    if (!existsSync(this.heartbeatPath)) {
      console.log(`[cron-engine] HEARTBEAT.md not found at ${this.heartbeatPath}, cron engine idle.`);
      this.running = true;
      this.watchHeartbeat();
      return;
    }

    const content = await readFile(this.heartbeatPath, 'utf-8');
    const parsedJobs = this.parseHeartbeat(content);

    console.log(`[cron-engine] Parsed ${parsedJobs.length} jobs from HEARTBEAT.md`);

    // Sync with database
    await this.syncJobsWithDb(parsedJobs);

    // Schedule enabled jobs
    const dbJobs = stateStore.listCronJobs(true);
    for (const job of dbJobs) {
      this.scheduleJob(job);
    }

    this.running = true;
    this.watchHeartbeat();

    console.log(`[cron-engine] Started with ${dbJobs.length} active jobs`);
  }

  private async syncJobsWithDb(parsedJobs: ParsedJob[]): Promise<void> {
    // Hot reload so afeta jobs file-origin. Jobs DB-origin sao intocados — source-of-truth
    // deles e o DB via dashboard CRUD, nao o arquivo HEARTBEAT.md.
    const allJobs = stateStore.listCronJobs();
    const existingJobs = allJobs.filter((j) => j.origin === 'file');
    const existingByName = new Map(existingJobs.map((j) => [j.name, j]));
    const parsedNames = new Set(parsedJobs.map((j) => j.name));

    // HEARTBEAT vence em conflito: se um job db-origin tem o mesmo name que um parsed job,
    // desabilitar o db-origin (marcacao, nao delete, para preservar cron_logs historicos).
    const parsedNamesSet = new Set(parsedJobs.map((p) => p.name));
    for (const job of allJobs) {
      if (job.origin === 'db' && parsedNamesSet.has(job.name) && job.enabled) {
        stateStore.updateCronJob(job.id, { enabled: false });
        console.log(`[cron-engine] DB-origin job "${job.name}" conflicts with HEARTBEAT.md, disabled.`);
      }
    }

    // Create or update file-origin jobs from HEARTBEAT.md
    for (const parsed of parsedJobs) {
      const existing = existingByName.get(parsed.name);

      // Resolve target topic ID by name
      const topics = stateStore.listTopics();
      const targetTopic = topics.find((t) => t.name === parsed.targetTopic);
      const targetTopicId = targetTopic?.id ?? null;

      if (existing) {
        // Update if changed
        if (
          existing.schedule !== parsed.schedule ||
          existing.prompt !== parsed.prompt ||
          existing.targetTopicId !== targetTopicId
        ) {
          stateStore.updateCronJob(existing.id, {
            schedule: parsed.schedule,
            prompt: parsed.prompt,
            targetTopicId,
            enabled: true,
            origin: 'file',
            sourceFile: this.heartbeatPath,
          });
          console.log(`[cron-engine] Updated job: ${parsed.name}`);
        } else if (!existing.enabled) {
          // Job voltou ao arquivo apos ter sido removido — re-enable
          stateStore.updateCronJob(existing.id, { enabled: true });
          console.log(`[cron-engine] Re-enabled job: ${parsed.name}`);
        }
      } else {
        // Create new file-origin job
        stateStore.createCronJob({
          name: parsed.name,
          schedule: parsed.schedule,
          prompt: parsed.prompt,
          targetTopicId,
          enabled: true,
          lastRun: null,
          lastStatus: null,
          origin: 'file',
          sourceFile: this.heartbeatPath,
        });
        console.log(`[cron-engine] Created job: ${parsed.name}`);
      }
    }

    // Disable file-origin jobs removed from HEARTBEAT.md.
    // DB-origin jobs are NEVER touched here (only in the conflict loop above).
    for (const existing of existingJobs) {
      if (!parsedNames.has(existing.name) && existing.enabled) {
        stateStore.updateCronJob(existing.id, { enabled: false });
        console.log(`[cron-engine] Disabled removed job (file-origin): ${existing.name}`);
      }
    }
  }

  private scheduleJob(job: CronJob): void {
    try {
      const cronJob = new Cron(job.schedule, async () => {
        console.log(`[cron-engine] Firing cron: ${job.name} (id=${job.id})`);
        await eventBus.emit('cron:fired', { jobId: job.id, name: job.name });
        await this.executeJob(job);
      });
      this.scheduledJobs.push(cronJob);
    } catch (err) {
      console.error(`[cron-engine] Failed to schedule job "${job.name}":`, err);
    }
  }

  async executeJob(job: CronJob): Promise<void> {
    const startedAt = Date.now();
    const executedAt = new Date(startedAt);
    // Substituir template vars ({today}, {yesterday}, {now}) ANTES de chamar o runner.
    // Calculado uma vez por execucao — retry reutiliza o mesmo valor para consistencia.
    // O prompt original (nao-expandido) permanece no DB; a expansao e apenas em memoria.
    const expandedPrompt = expandTemplateVars(job.prompt, executedAt);
    if (expandedPrompt !== job.prompt) {
      console.log(`[cron-engine] Expanded template vars in job "${job.name}"`);
    }

    const logId = stateStore.createCronLog({
      jobId: job.id,
      startedAt,
      finishedAt: null,
      status: 'running',
      output: null,
    });

    console.log(`[cron-engine] Executing cron: ${job.name}`);

    let success = false;
    let output = '';

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        console.log(`[cron-engine] Retrying cron "${job.name}" after 30s...`);
        await new Promise((r) => setTimeout(r, 30_000));
      }

      try {
        const config = await getConfig();

        // Resolve runtime for this cron: job-level override → config default
        const jobRuntime = (job.runtime ?? config.defaultRuntime) as RuntimeName | undefined;
        const runner = runnerRegistry.get(jobRuntime, { allowFallback: true });
        console.log(
          `[cron-engine] runtime '${runner.name}' for job ${job.id} (${job.name})`,
        );

        const collected: string[] = [];

        for await (const event of runner.run(expandedPrompt, {
          cwd: config.workingDir,
          model: job.model ?? undefined,
        })) {
          if (event.type === 'text' && typeof event.data.text === 'string') {
            collected.push(event.data.text);
          }
          if (event.type === 'done' && typeof event.data.result === 'string') {
            collected.push(event.data.result);
          }
        }

        output = collected.join('');
        success = true;
        break;
      } catch (err) {
        output = err instanceof Error ? err.message : String(err);
        console.error(`[cron-engine] Cron "${job.name}" attempt ${attempt + 1} failed:`, err);
      }
    }

    const finishedAt = Date.now();
    const status = success ? 'success' : 'failed';

    // Update the "running" log entry with final state
    stateStore.updateCronLog(logId, {
      finishedAt,
      status,
      output: output.slice(0, 10_000), // Limit output size
    });

    // Update job status
    stateStore.updateCronJob(job.id, {
      lastRun: finishedAt,
      lastStatus: status,
    });

    // Emit result event
    await eventBus.emit('cron:result', {
      jobId: job.id,
      jobName: job.name,
      topicId: job.targetTopicId,
      topicName: '', // Will be resolved by listener
      output,
      status,
    });

    console.log(`[cron-engine] Cron "${job.name}" finished: ${status} (${finishedAt - startedAt}ms)`);
  }

  async stop(): Promise<void> {
    // Stop all scheduled cron jobs
    for (const job of this.scheduledJobs) {
      job.stop();
    }
    this.scheduledJobs = [];

    // Stop file watcher
    if (this.watchAbort) {
      this.watchAbort.abort();
      this.watchAbort = null;
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.running = false;
    console.log('[cron-engine] Stopped');
  }

  /**
   * Reload jobs from DB (and HEARTBEAT.md) without restarting the process.
   * Triggered by the dashboard via IPC after CRUD operations on db-origin jobs.
   * Idempotent and safe to call while running — internally stops and re-starts.
   */
  async reload(): Promise<void> {
    console.log('[cron-engine] Reload requested via IPC');
    if (this.running) {
      await this.stop();
    }
    await this.start();
    console.log('[cron-engine] Reload complete');
  }

  /**
   * Execute a job by id immediately, without waiting for its schedule.
   * Returns true if the job was found and executed (success or failure), false if not found.
   * Used by the "Run now" action via IPC.
   */
  async runJobById(id: number): Promise<boolean> {
    const job = stateStore.getCronJob(id);
    if (!job) return false;
    await this.executeJob(job);
    return true;
  }

  private watchHeartbeat(): void {
    this.watchAbort = new AbortController();

    (async () => {
      try {
        const watcher = watch(this.heartbeatPath, { signal: this.watchAbort!.signal });
        for await (const event of watcher) {
          if (event.eventType === 'change') {
            // Debounce 2s to avoid rapid reloads during edits
            if (this.debounceTimer) {
              clearTimeout(this.debounceTimer);
            }
            this.debounceTimer = setTimeout(async () => {
              console.log('[cron-engine] HEARTBEAT.md changed, reloading...');
              try {
                await this.stop();
                await this.start();
              } catch (err) {
                console.error('[cron-engine] Hot reload failed:', err);
              }
            }, 2_000);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[cron-engine] Watch error:', err);
      }
    })();
  }

  /**
   * Reescreve apenas a secao "## Managed by Dashboard" do HEARTBEAT.md com os jobs fornecidos.
   * Preserva todo o conteudo antes do marcador e qualquer header apos o bloco managed.
   * Esta secao e ignorada pelo parser — e apenas um mirror legivel por humanos/git para
   * jobs DB-origin (dashboard CRUD).
   *
   * Filtra automaticamente apenas jobs com origin='db' — jobs file-origin ja estao no arquivo
   * por natureza.
   */
  async writeDashboardSection(jobs: CronJob[]): Promise<void> {
    let content = '';
    if (existsSync(this.heartbeatPath)) {
      content = await readFile(this.heartbeatPath, 'utf-8');
    }

    const marker = '## Managed by Dashboard';
    const markerRegex = /^## Managed by Dashboard\s*$/m;
    const match = markerRegex.exec(content);

    // Monta o corpo da secao managed. Usa '### ' (h3) nos headers de jobs para evitar
    // qualquer colisao com o parser (que procura '^## '). Defense-in-depth — o parser
    // ja ignora tudo nesta secao, mas '###' garante que jobs mirror jamais sejam
    // reparseados se alguem editar manualmente o marcador.
    const dbJobs = jobs.filter((j) => j.origin === 'db');
    const lines: string[] = [
      marker,
      '',
      '> Auto-generated mirror from dashboard DB. Edits here are ignored by the parser.',
      '',
    ];

    if (dbJobs.length === 0) {
      lines.push('_No dashboard-managed jobs yet._');
      lines.push('');
    } else {
      for (const job of dbJobs) {
        const topicLabel = job.targetTopicId ? `topic#${job.targetTopicId}` : 'default';
        const enabledLabel = job.enabled ? '' : ' _(disabled)_';
        lines.push(`### ${job.name}${enabledLabel}`);
        lines.push(`- schedule: \`${job.schedule}\` → tópico: ${topicLabel}`);
        // Preserva quebras de linha como espacos e limita para evitar poluicao do arquivo
        const preview = job.prompt.replace(/\s+/g, ' ').trim().slice(0, 500);
        lines.push(`- prompt: ${preview}`);
        lines.push('');
      }
    }

    const sectionBody = lines.join('\n');

    let newContent: string;
    if (match) {
      const start = match.index;
      const afterHeader = start + match[0].length;
      // Procura proximo header '^## ' apos o marcador. Os '### ' do body nao batem com '^## '.
      const rest = content.slice(afterHeader);
      const nextTopLevel = rest.match(/^## /m);
      if (nextTopLevel && nextTopLevel.index !== undefined) {
        // Preserva quaisquer secoes '^## ' que venham depois do bloco managed.
        newContent =
          content.slice(0, start) +
          sectionBody +
          '\n' +
          content.slice(afterHeader + nextTopLevel.index);
      } else {
        // Marcador existe mas nada depois — substitui ate o fim.
        newContent = content.slice(0, start) + sectionBody + '\n';
      }
    } else {
      // Marcador nao existe — append ao fim do arquivo (com separacao).
      const trimmed = content.trimEnd();
      newContent = (trimmed ? trimmed + '\n\n' : '') + sectionBody + '\n';
    }

    await writeFile(this.heartbeatPath, newContent, 'utf-8');
    console.log(
      `[cron-engine] Wrote ${dbJobs.length} DB-origin job(s) to HEARTBEAT.md managed section`
    );
  }

  async runJobNow(jobId: number): Promise<void> {
    const job = stateStore.getCronJob(jobId);
    if (!job) {
      throw new Error(`Cron job ${jobId} not found`);
    }
    console.log(`[cron-engine] Manual run triggered for: ${job.name}`);
    await this.executeJob(job);
  }

  listJobs(): CronJob[] {
    return stateStore.listCronJobs();
  }

  getJobLogs(jobId: number, limit: number = 20): CronLog[] {
    return stateStore.getCronLogs(jobId, limit);
  }

  get isRunning(): boolean {
    return this.running;
  }

  get activeJobCount(): number {
    return this.scheduledJobs.length;
  }
}

export const cronEngine = new CronEngine();
export { CronEngine, naturalToCron, expandTemplateVars };
export type { ParsedJob };
