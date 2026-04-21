import { describe, test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listArchetypes,
  loadArchetype,
  ARCHETYPE_SLUGS,
  type ArchetypeSlug,
} from '../../src/templates/archetypes';

describe('listArchetypes', () => {
  test('returns all 5 archetypes with valid metadata', () => {
    const all = listArchetypes();
    const slugs = all.map((a) => a.slug).sort();
    expect(slugs).toEqual(
      [...ARCHETYPE_SLUGS].sort()
    );
    expect(all.length).toBe(5);
  });

  test('each metadata entry has required fields', () => {
    for (const meta of listArchetypes()) {
      expect(typeof meta.name).toBe('string');
      expect(meta.name.length).toBeGreaterThan(0);
      expect(typeof meta.description).toBe('string');
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeLessThanOrEqual(160);
      expect(['claude-code', 'codex']).toContain(meta.defaultRuntime);
      expect(['groq', 'openai', 'none']).toContain(meta.voiceProvider);
      expect(Array.isArray(meta.tags)).toBe(true);
      expect(Array.isArray(meta.suggestedAgents)).toBe(true);
      expect(meta.suggestedAgents.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(meta.recommendedTools)).toBe(true);
      expect(meta.recommendedTools.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('loadArchetype', () => {
  test.each(ARCHETYPE_SLUGS.map((s) => [s]))(
    'loads %s successfully',
    (slug: ArchetypeSlug) => {
      const tpl = loadArchetype(slug);
      expect(tpl.meta.slug).toBe(slug);
      expect(tpl.soulRaw.length).toBeGreaterThan(0);
      expect(tpl.userRaw.length).toBeGreaterThan(0);
      expect(tpl.agentsRaw.length).toBeGreaterThan(0);
      expect(tpl.toolsRaw.length).toBeGreaterThan(0);
      expect(tpl.memoryRaw.length).toBeGreaterThan(0);
      expect(tpl.styleRaw.length).toBeGreaterThan(0);
      expect(tpl.heartbeatRaw.length).toBeGreaterThan(0);
    }
  );

  test('throws on unknown slug', () => {
    expect(() => loadArchetype('does-not-exist' as ArchetypeSlug)).toThrow(
      /Unknown archetype slug/
    );
  });

  test('AGENTS.md lists every agent from archetype.json.suggestedAgents', () => {
    for (const slug of ARCHETYPE_SLUGS) {
      const tpl = loadArchetype(slug);
      for (const agent of tpl.meta.suggestedAgents) {
        expect(tpl.agentsRaw).toContain(agent.name);
      }
    }
  });

  test('each USER.md contains the 7 universal placeholders', () => {
    const required = [
      '{{userName}}',
      '{{company}}',
      '{{role}}',
      '{{timezone}}',
      '{{workingDir}}',
      '{{vaultPath}}',
      '{{today}}',
    ];
    for (const slug of ARCHETYPE_SLUGS) {
      const tpl = loadArchetype(slug);
      for (const ph of required) {
        expect(tpl.userRaw).toContain(ph);
      }
    }
  });

  test('no template contains forbidden personal data', () => {
    const forbidden = [
      'Jonathan',
      'EcoUp',
      'Don Vicente',
      'Donvicente',
      'Kovvy',
      'LFpro',
      'LF Pro',
      'LF-Pro',
      'Clearify',
      'Passini',
      'Mybrows',
    ];
    for (const slug of ARCHETYPE_SLUGS) {
      const tpl = loadArchetype(slug);
      const combined = [
        tpl.soulRaw,
        tpl.userRaw,
        tpl.agentsRaw,
        tpl.toolsRaw,
        tpl.memoryRaw,
        tpl.styleRaw,
        tpl.heartbeatRaw,
      ].join('\n');
      for (const word of forbidden) {
        expect(combined).not.toContain(word);
      }
    }
  });
});
