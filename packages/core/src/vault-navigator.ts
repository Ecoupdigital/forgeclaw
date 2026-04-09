import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { getConfig } from './config';

export class VaultNavigator {
  private vaultPath: string | undefined;

  constructor(vaultPath?: string) {
    this.vaultPath = vaultPath;
  }

  /**
   * Lazily resolves vault path from config if not set at construction.
   */
  private async resolveVaultPath(): Promise<string | undefined> {
    if (this.vaultPath) return this.vaultPath;
    try {
      const config = await getConfig();
      this.vaultPath = config.vaultPath;
    } catch {
      // Config not available
    }
    return this.vaultPath;
  }

  /**
   * Checks if the vault path exists and is accessible.
   */
  private async vaultExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns an instruction string for Claude to navigate the vault.
   * If no vault is configured, returns empty string.
   */
  async getVaultInstruction(): Promise<string> {
    const path = await this.resolveVaultPath();
    if (!path) return '';

    if (!(await this.vaultExists(path))) return '';

    return `Meu Obsidian Vault esta em ${path}/\nUse Read e LS para navegar e buscar informacoes relevantes antes de responder.`;
  }

  /**
   * Lists top-level folders in the vault as a simple tree.
   * Used in the dashboard Memory tab to show connected vault.
   */
  async getVaultStructure(): Promise<string> {
    const path = await this.resolveVaultPath();
    if (!path || !(await this.vaultExists(path))) return '';

    try {
      const entries = await readdir(path, { withFileTypes: true });
      const folders = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name)
        .sort();

      if (folders.length === 0) return '';

      return folders.map((f) => `  ${f}/`).join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Searches for .md files in the vault containing the query string.
   * Uses Bun.spawn with grep for performance.
   * Returns up to 10 matching file paths.
   */
  async searchVault(query: string): Promise<string[]> {
    const path = await this.resolveVaultPath();
    if (!path || !(await this.vaultExists(path))) return [];
    if (!query.trim()) return [];

    try {
      const proc = Bun.spawn(['grep', '-rl', '--include=*.md', query, path], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      const files = output
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      return files.slice(0, 10);
    } catch {
      return [];
    }
  }
}

/**
 * Singleton instance. Vault path resolved lazily from config.
 */
export const vaultNavigator = new VaultNavigator();
