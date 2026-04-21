import { describe, test, expect } from 'bun:test';
import {
  loadArchetype,
  renderArchetype,
  ARCHETYPE_SLUGS,
  ARCHETYPE_FILES,
} from '../../src/templates/archetypes';

/**
 * Snapshot com valores DETERMINISTICOS. Se qualquer arquivo renderizado mudar,
 * o snapshot quebra e o executor tem que revisar (e atualizar via `bun test -u`).
 */
const fixedMap = {
  userName: '__USER__',
  company: '__COMPANY__',
  role: '__ROLE__',
  workingDir: '__WORKDIR__',
  vaultPath: '__VAULT__',
  timezone: '__TZ__',
  today: '__TODAY__',
};

describe('archetype snapshots', () => {
  test.each(ARCHETYPE_SLUGS.map((s) => [s]))(
    'archetype %s renders deterministically',
    (slug) => {
      const tpl = loadArchetype(slug);
      const files = renderArchetype(tpl, fixedMap);
      // Ordem estavel pro snapshot
      const snapshot: Record<string, string> = {};
      for (const f of ARCHETYPE_FILES) {
        snapshot[f] = files[f];
      }
      snapshot['__meta'] = JSON.stringify(
        {
          slug: tpl.meta.slug,
          name: tpl.meta.name,
          defaultRuntime: tpl.meta.defaultRuntime,
          voiceProvider: tpl.meta.voiceProvider,
          tags: tpl.meta.tags,
          suggestedAgents: tpl.meta.suggestedAgents.map((a) => a.name).sort(),
          recommendedTools: tpl.meta.recommendedTools,
        },
        null,
        2
      );
      expect(snapshot).toMatchSnapshot();
    }
  );
});
