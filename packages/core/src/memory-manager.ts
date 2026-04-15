import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Cron } from 'croner';

export class MemoryManager {
  private memoryDir: string;
  private dailyDir: string;
  private harnessDir: string;
  private memoryFilePath: string;
  private compileCron: Cron | null = null;

  constructor(
    memoryDir = join(homedir(), '.forgeclaw', 'memory'),
    harnessDir = join(homedir(), '.forgeclaw', 'harness'),
    dailyDir = process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log',
  ) {
    this.memoryDir = memoryDir;
    // Daily log lives inside the Obsidian vault so ForgeClaw and the Claude
    // Code CLI (via SessionStart / UserPromptSubmit hooks) share a single
    // source of truth. Falls back to the legacy path via env var override.
    this.dailyDir = dailyDir;
    this.harnessDir = harnessDir;
    this.memoryFilePath = join(harnessDir, 'MEMORY.md');
  }

  // Jonathan is in BRT (UTC-3). The server runs UTC. We format dates/times
  // in BRT so the daily log matches his wall clock and the "day boundary"
  // happens at midnight BRT instead of midnight UTC.
  private brtNow(): Date {
    // Shift UTC clock by -3h so we can use UTC getters as if they were BRT.
    return new Date(Date.now() - 3 * 60 * 60 * 1000);
  }

  private todayDate(): string {
    return this.brtNow().toISOString().slice(0, 10);
  }

  private yesterdayDate(): string {
    const d = this.brtNow();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  private timeStamp(): string {
    return this.brtNow().toISOString().slice(11, 16);
  }

  private dailyPath(date: string): string {
    return join(this.dailyDir, `${date}.md`);
  }

  /**
   * Adds a timestamped entry to today's daily log.
   * Creates the file and directories if they don't exist.
   */
  async addEntry(entry: string): Promise<void> {
    await mkdir(this.dailyDir, { recursive: true });
    const path = this.dailyPath(this.todayDate());
    const line = `- [${this.timeStamp()}] ${entry}\n`;

    let existing = '';
    try {
      existing = await readFile(path, 'utf-8');
    } catch {
      // File doesn't exist yet — will be created
    }

    await writeFile(path, existing + line, 'utf-8');
  }

  /**
   * Returns the contents of a daily log. Defaults to today.
   */
  async getDailyLog(date?: string): Promise<string> {
    const target = date ?? this.todayDate();
    try {
      return await readFile(this.dailyPath(target), 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Returns yesterday's daily log.
   */
  async getYesterdayLog(): Promise<string> {
    return this.getDailyLog(this.yesterdayDate());
  }

  /**
   * Reads the consolidated MEMORY.md file.
   */
  async getMemory(): Promise<string> {
    try {
      return await readFile(this.memoryFilePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Compiles today's daily log into MEMORY.md.
   * Extracts decision/lesson entries and appends them.
   * Designed to be called by the 23h cron job.
   */
  async compileDaily(): Promise<void> {
    const log = await this.getDailyLog();
    if (!log.trim()) return;

    const lines = log.split('\n').filter((l) => l.trim().length > 0);

    // Filter for entries that contain decision/lesson signals
    const keywords = [
      'decid', 'decidiu', 'decisao', 'decision',
      'aprend', 'lesson', 'licao',
      'importante', 'important',
      'fix', 'corrigi', 'bug',
      'mudou', 'changed', 'mudanca',
      'pattern', 'padrao',
      'erro', 'error',
      'insight',
    ];

    const insights = lines.filter((line) => {
      const lower = line.toLowerCase();
      return keywords.some((kw) => lower.includes(kw));
    });

    // If no keyword matches, take all entries (don't lose data)
    const toAppend = insights.length > 0 ? insights : lines;

    const today = this.todayDate();
    const formatted = toAppend
      .map((line) => {
        // Strip existing timestamp prefix "- [HH:MM] " and re-format with date
        const cleaned = line.replace(/^-\s*\[\d{2}:\d{2}\]\s*/, '');
        return `- [${today}] ${cleaned}`;
      })
      .join('\n');

    await mkdir(this.harnessDir, { recursive: true });

    let existing = '';
    try {
      existing = await readFile(this.memoryFilePath, 'utf-8');
    } catch {
      // File doesn't exist yet
    }

    const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
    await writeFile(this.memoryFilePath, existing + separator + formatted + '\n', 'utf-8');
  }

  /**
   * Schedules compileDaily() to run at 23:55 local time every day.
   * Idempotent — stops any previous schedule first. Called at bot startup.
   */
  startCompileCron(schedule: string = '55 23 * * *'): void {
    if (this.compileCron) {
      this.compileCron.stop();
      this.compileCron = null;
    }

    try {
      this.compileCron = new Cron(schedule, async () => {
        console.log('[memory-manager] Firing compileDaily via internal cron');
        try {
          await this.compileDaily();
          console.log('[memory-manager] compileDaily finished');
        } catch (err) {
          console.error('[memory-manager] compileDaily failed:', err);
        }
      });
      console.log(`[memory-manager] compileDaily cron scheduled: ${schedule}`);
    } catch (err) {
      console.error('[memory-manager] Failed to schedule compile cron:', err);
    }
  }

  stopCompileCron(): void {
    if (this.compileCron) {
      this.compileCron.stop();
      this.compileCron = null;
    }
  }

  /**
   * Lists all daily log files with metadata.
   */
  async listDailyLogs(): Promise<Array<{ date: string; path: string; entries: number }>> {
    try {
      const files = await readdir(this.dailyDir);
      const logs: Array<{ date: string; path: string; entries: number }> = [];

      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const date = file.replace('.md', '');
        const fullPath = join(this.dailyDir, file);

        try {
          const content = await readFile(fullPath, 'utf-8');
          const entries = content.split('\n').filter((l) => l.trim().startsWith('-')).length;
          logs.push({ date, path: fullPath, entries });
        } catch {
          logs.push({ date, path: fullPath, entries: 0 });
        }
      }

      return logs.sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  }
}

export const memoryManager = new MemoryManager();
