import { describe, test, expect } from 'bun:test';
import {
  renderPlaceholders,
  renderArchetype,
  loadArchetype,
  ARCHETYPE_SLUGS,
  ARCHETYPE_FILES,
  type PlaceholderMap,
} from '../../src/templates/archetypes';

const sampleMap: Partial<PlaceholderMap> = {
  userName: 'Fulano de Tal',
  company: 'Acme Inc.',
  role: 'Founder',
  workingDir: '/home/fulano/projects',
  vaultPath: '/home/fulano/obsidian',
  timezone: 'UTC',
  today: '2030-01-01',
};

describe('renderPlaceholders', () => {
  test('replaces all known placeholders', () => {
    const input = 'Ola {{userName}} da {{company}} em {{workingDir}} hoje {{today}}';
    const out = renderPlaceholders(input, sampleMap);
    expect(out).toBe('Ola Fulano de Tal da Acme Inc. em /home/fulano/projects hoje 2030-01-01');
  });

  test('empty map replaces with empty string and keeps today default', () => {
    const input = 'x={{userName}} y={{today}}';
    const out = renderPlaceholders(input, {});
    expect(out.startsWith('x= y=')).toBe(true);
    // today defaults to current date YYYY-MM-DD
    expect(/y=\d{4}-\d{2}-\d{2}$/.test(out)).toBe(true);
  });

  test('preserves unknown tokens for debugging', () => {
    const input = 'known={{userName}} unknown={{notARealKey}}';
    const out = renderPlaceholders(input, sampleMap);
    expect(out).toBe('known=Fulano de Tal unknown={{notARealKey}}');
  });

  test('handles repeated placeholders', () => {
    const input = '{{userName}} + {{userName}}';
    const out = renderPlaceholders(input, sampleMap);
    expect(out).toBe('Fulano de Tal + Fulano de Tal');
  });

  test('timezone defaults to America/Sao_Paulo when omitted', () => {
    const input = 'tz={{timezone}}';
    const out = renderPlaceholders(input, { userName: 'x' });
    expect(out).toBe('tz=America/Sao_Paulo');
  });
});

describe('renderArchetype', () => {
  test.each(ARCHETYPE_SLUGS.map((s) => [s]))(
    'renders %s template with no leftover known placeholders',
    (slug) => {
      const tpl = loadArchetype(slug);
      const files = renderArchetype(tpl, sampleMap);
      // Todos os arquivos esperados aparecem
      for (const fname of ARCHETYPE_FILES) {
        expect(fname in files).toBe(true);
        expect(files[fname].length).toBeGreaterThan(0);
      }
      // Nenhum placeholder universal sobrou em USER.md apos render
      const known = [
        '{{userName}}',
        '{{company}}',
        '{{role}}',
        '{{timezone}}',
        '{{workingDir}}',
        '{{vaultPath}}',
        '{{today}}',
      ];
      for (const ph of known) {
        expect(files['USER.md']).not.toContain(ph);
      }
      // Valores substituidos presentes em USER.md
      expect(files['USER.md']).toContain('Fulano de Tal');
      expect(files['USER.md']).toContain('2030-01-01');
    }
  );

  test('returns exactly 7 files', () => {
    const tpl = loadArchetype('generic');
    const files = renderArchetype(tpl, sampleMap);
    expect(Object.keys(files).sort()).toEqual([...ARCHETYPE_FILES].sort());
  });
});
