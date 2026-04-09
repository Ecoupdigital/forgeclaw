import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HarnessLoader } from '../src/harness-loader';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

describe('HarnessLoader', () => {
  const tmpDir = `/tmp/forgeclaw-harness-test-${randomUUID()}`;
  let loader: HarnessLoader;

  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });

    // Create test harness files
    writeFileSync(join(tmpDir, 'SOUL.md'), '# Soul\nI am ForgeClaw');
    writeFileSync(join(tmpDir, 'USER.md'), '# User\nJohn Doe');
    writeFileSync(join(tmpDir, 'AGENTS.md'), '# Agents\nList of agents');
    writeFileSync(join(tmpDir, 'TOOLS.md'), '# Tools\nAvailable tools');
    writeFileSync(join(tmpDir, 'MEMORY.md'), '# Memory\nPast events');
    writeFileSync(join(tmpDir, 'STYLE.md'), '# Style\nContent style guide');

    loader = new HarnessLoader(tmpDir);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('deve carregar arquivos core quando isContentTask=false', async () => {
      const result = await loader.load({ isContentTask: false });

      expect(result).toContain('# Soul');
      expect(result).toContain('# User');
      expect(result).toContain('# Agents');
      expect(result).toContain('# Tools');
      expect(result).toContain('# Memory');
      expect(result).not.toContain('# Style');
    });

    it('deve incluir STYLE.md quando isContentTask=true', async () => {
      const result = await loader.load({ isContentTask: true });

      expect(result).toContain('# Soul');
      expect(result).toContain('# Style');
    });

    it('deve separar arquivos com ---', async () => {
      const result = await loader.load({ isContentTask: false });
      expect(result).toContain('---');
    });
  });

  describe('cache', () => {
    it('deve usar cache na segunda chamada (mesmo mtime)', async () => {
      const loader2 = new HarnessLoader(tmpDir);

      const result1 = await loader2.load({ isContentTask: false });
      const result2 = await loader2.load({ isContentTask: false });

      expect(result1).toBe(result2);
    });
  });

  describe('isContentTask', () => {
    it('deve detectar tarefa de conteudo', () => {
      expect(loader.isContentTask('Escreve um post para instagram')).toBe(true);
      expect(loader.isContentTask('Faz um carrossel sobre IA')).toBe(true);
      expect(loader.isContentTask('Conteudo para linkedin')).toBe(true);
    });

    it('deve retornar false para tarefa tecnica', () => {
      expect(loader.isContentTask('Fix the bug in auth module')).toBe(false);
      expect(loader.isContentTask('Deploy to production')).toBe(false);
    });
  });

  describe('arquivo inexistente', () => {
    it('deve retornar string vazia para arquivo que nao existe', async () => {
      const emptyDir = `/tmp/forgeclaw-harness-empty-${randomUUID()}`;
      mkdirSync(emptyDir, { recursive: true });

      const emptyLoader = new HarnessLoader(emptyDir);
      const result = await emptyLoader.load({ isContentTask: false });

      // All files missing, so result should be empty
      expect(result).toBe('');

      rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});
