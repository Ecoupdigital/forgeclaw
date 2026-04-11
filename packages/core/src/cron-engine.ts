import { Cron } from 'croner';
import { readFile, watch } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ClaudeRunner } from './claude-runner';
import { getConfig } from './config';
import { stateStore } from './state-store';
import { eventBus } from './event-bus';
import type { CronJob, CronLog } from './types';

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
    const existingJobs = stateStore.listCronJobs();
    const existingByName = new Map(existingJobs.map((j) => [j.name, j]));
    const parsedNames = new Set(parsedJobs.map((j) => j.name));

    // Create or update jobs from HEARTBEAT.md
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
          });
          console.log(`[cron-engine] Updated job: ${parsed.name}`);
        }
      } else {
        // Create new
        stateStore.createCronJob({
          name: parsed.name,
          schedule: parsed.schedule,
          prompt: parsed.prompt,
          targetTopicId,
          enabled: true,
          lastRun: null,
          lastStatus: null,
        });
        console.log(`[cron-engine] Created job: ${parsed.name}`);
      }
    }

    // Disable jobs removed from HEARTBEAT.md
    for (const existing of existingJobs) {
      if (!parsedNames.has(existing.name) && existing.enabled) {
        stateStore.updateCronJob(existing.id, { enabled: false });
        console.log(`[cron-engine] Disabled removed job: ${existing.name}`);
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
        const runner = new ClaudeRunner();
        const collected: string[] = [];
        const config = await getConfig();

        for await (const event of runner.run(job.prompt, { cwd: config.workingDir })) {
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

    // Update cron log
    // Note: We create a new log entry for the final state since SQLite update by log id
    // would require an updateCronLog method. We use the existing log entry approach.
    stateStore.createCronLog({
      jobId: job.id,
      startedAt,
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
