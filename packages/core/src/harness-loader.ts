import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

interface CacheEntry {
  mtime: number;
  content: string;
}

const CONTENT_KEYWORDS = /\b(post|conte[uú]do|instagram|linkedin|escreve|copy|carrossel|reel|stories)\b/i;

const CORE_FILES = ['SOUL.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'MEMORY.md'];
const CONTENT_FILES = ['STYLE.md'];

export class HarnessLoader {
  private cache = new Map<string, CacheEntry>();
  private harnessDir: string;

  constructor(harnessDir: string = path.join(os.homedir(), '.forgeclaw', 'harness')) {
    this.harnessDir = harnessDir;
  }

  async load(context: { isContentTask: boolean }): Promise<string> {
    const files = context.isContentTask
      ? [...CORE_FILES, ...CONTENT_FILES]
      : CORE_FILES;

    const parts: string[] = [];

    for (const file of files) {
      const content = await this.readCached(path.join(this.harnessDir, file));
      if (content) parts.push(content);
    }

    return parts.join('\n\n---\n\n');
  }

  isContentTask(message: string): boolean {
    return CONTENT_KEYWORDS.test(message);
  }

  private async readCached(filePath: string): Promise<string> {
    try {
      const fileStat = await stat(filePath);
      const mtime = fileStat.mtimeMs;

      const cached = this.cache.get(filePath);
      if (cached && cached.mtime === mtime) {
        return cached.content;
      }

      const content = await readFile(filePath, 'utf-8');
      this.cache.set(filePath, { mtime, content });
      return content;
    } catch {
      return '';
    }
  }
}

export const harnessLoader = new HarnessLoader();
