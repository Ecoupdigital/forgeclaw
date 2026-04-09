import { readFile, mkdir, unlink, readdir, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';

const TEMP_DIR = join(tmpdir(), 'forgeclaw');
const MAX_TEXT_SIZE = 100_000;
const MAX_ARCHIVE_TEXT_SIZE = 50_000;

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.ts', '.js', '.py', '.csv',
  '.html', '.css', '.xml', '.yaml', '.yml', '.toml',
  '.sh', '.bash', '.zsh', '.sql', '.rs', '.go', '.rb',
  '.jsx', '.tsx', '.vue', '.svelte', '.env', '.cfg', '.ini',
  '.log', '.conf',
]);

class FileHandler {
  /**
   * Download a file from Telegram via bot API.
   * Returns the local file path.
   */
  async downloadTelegramFile(bot: any, fileId: string): Promise<string> {
    await mkdir(TEMP_DIR, { recursive: true });

    const file = await bot.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const originalName = basename(file.file_path ?? 'unknown');
    const localPath = join(TEMP_DIR, `${randomUUID()}_${originalName}`);

    const buffer = await response.arrayBuffer();
    await Bun.write(localPath, buffer);

    return localPath;
  }

  /**
   * Extract content from a file based on its MIME type.
   */
  async extractContent(
    filePath: string,
    mimeType: string,
  ): Promise<{ type: 'text' | 'image' | 'file'; content: string }> {
    // PDF
    if (mimeType === 'application/pdf') {
      return this.extractPdf(filePath);
    }

    // Images
    if (mimeType.startsWith('image/')) {
      return { type: 'image', content: filePath };
    }

    // Text files by extension
    const ext = extname(filePath).toLowerCase();
    if (TEXT_EXTENSIONS.has(ext) || mimeType.startsWith('text/') || mimeType === 'application/json') {
      return this.extractTextFile(filePath);
    }

    // Archives
    if (mimeType === 'application/zip' || ext === '.zip') {
      return this.extractZip(filePath);
    }

    if (
      mimeType === 'application/gzip' ||
      mimeType === 'application/x-tar' ||
      ext === '.tar.gz' ||
      ext === '.tgz'
    ) {
      return this.extractTarGz(filePath);
    }

    // Unknown - return path
    return { type: 'file', content: filePath };
  }

  /**
   * Detect file paths mentioned in Claude's output text.
   * Returns paths that actually exist on the filesystem.
   */
  async detectOutboundFiles(text: string): Promise<string[]> {
    const pathPattern = /(?:\/home\/[^\s"'<>]+|\/tmp\/[^\s"'<>]+)/g;
    const matches = text.match(pathPattern) ?? [];

    const uniquePaths = [...new Set(matches)];
    const existing: string[] = [];

    for (const p of uniquePaths) {
      try {
        const s = await stat(p);
        if (s.isFile()) {
          existing.push(p);
        }
      } catch {
        // file doesn't exist, skip
      }
    }

    return existing;
  }

  /**
   * Clean up a temporary file.
   */
  async cleanup(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // ignore cleanup errors
    }
  }

  private async extractPdf(filePath: string): Promise<{ type: 'text'; content: string }> {
    try {
      const proc = Bun.spawn(['pdftotext', '-layout', filePath, '-'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new Error(`pdftotext failed (exit ${exitCode}): ${stderr}`);
      }

      return { type: 'text', content: output.slice(0, MAX_TEXT_SIZE) };
    } catch (err) {
      if (err instanceof Error && err.message.includes('pdftotext failed')) {
        throw err;
      }
      throw new Error(
        'pdftotext not installed. Install poppler-utils: apt install poppler-utils',
      );
    }
  }

  private async extractTextFile(filePath: string): Promise<{ type: 'text'; content: string }> {
    const content = await readFile(filePath, 'utf-8');
    return { type: 'text', content: content.slice(0, MAX_TEXT_SIZE) };
  }

  private async extractZip(filePath: string): Promise<{ type: 'text'; content: string }> {
    const tempDir = join(TEMP_DIR, `extract_${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      const proc = Bun.spawn(['unzip', '-o', filePath, '-d', tempDir], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      await proc.exited;

      return await this.readExtractedFiles(tempDir);
    } catch {
      throw new Error('unzip not installed or archive is corrupted');
    }
  }

  private async extractTarGz(filePath: string): Promise<{ type: 'text'; content: string }> {
    const tempDir = join(TEMP_DIR, `extract_${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      const proc = Bun.spawn(['tar', '-xzf', filePath, '-C', tempDir], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      await proc.exited;

      return await this.readExtractedFiles(tempDir);
    } catch {
      throw new Error('tar extraction failed or archive is corrupted');
    }
  }

  private async readExtractedFiles(dir: string): Promise<{ type: 'text'; content: string }> {
    const files = await this.listFilesRecursive(dir);
    let totalContent = '';
    let totalSize = 0;

    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext)) continue;

      try {
        const content = await readFile(file, 'utf-8');
        const relativePath = file.replace(dir, '');
        const chunk = `\n--- ${relativePath} ---\n${content}\n`;

        if (totalSize + chunk.length > MAX_ARCHIVE_TEXT_SIZE) break;

        totalContent += chunk;
        totalSize += chunk.length;
      } catch {
        // skip unreadable files
      }
    }

    if (!totalContent) {
      return { type: 'text', content: '(No readable text files found in archive)' };
    }

    return { type: 'text', content: totalContent };
  }

  private async listFilesRecursive(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.listFilesRecursive(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}

export const fileHandler = new FileHandler();
