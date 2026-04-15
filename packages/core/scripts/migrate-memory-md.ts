#!/usr/bin/env bun
/**
 * One-shot migration — import the current ~/.forgeclaw/harness/MEMORY.md and
 * USER.md into the memory_entries table as behavior + user_profile entries.
 *
 * Splits by level-2 headers (## ...) so each logical section becomes its own
 * pinned entry. Idempotent: checks content hash before inserting.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stateStore } from '../src/state-store';
import { BuiltinMemoryStore } from '../src/memory/builtin-store';
import type { MemoryEntryKind } from '../src/types';

const HARNESS_DIR = join(homedir(), '.forgeclaw', 'harness');

function splitBySections(markdown: string): Array<{ title: string; body: string }> {
  const lines = markdown.split('\n');
  const sections: Array<{ title: string; body: string[] }> = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  // Skip top-level title (# ...) — it's metadata
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentTitle !== null) {
        sections.push({ title: currentTitle, body: currentBody });
      }
      currentTitle = line.replace(/^##\s+/, '').trim();
      currentBody = [];
    } else if (currentTitle !== null) {
      currentBody.push(line);
    }
  }
  if (currentTitle !== null) {
    sections.push({ title: currentTitle, body: currentBody });
  }

  return sections
    .map((s) => ({ title: s.title, body: s.body.join('\n').trim() }))
    .filter((s) => s.body.length > 10);
}

async function importFile(filePath: string, kind: MemoryEntryKind): Promise<number> {
  let markdown: string;
  try {
    markdown = await readFile(filePath, 'utf-8');
  } catch {
    console.warn(`[migrate] ${filePath} not found, skipping`);
    return 0;
  }

  const sections = splitBySections(markdown);
  if (sections.length === 0) {
    console.warn(`[migrate] no sections parsed from ${filePath}`);
    return 0;
  }

  const store = new BuiltinMemoryStore({
    memoryCharLimit: 20_000, // larger for one-shot import
    userCharLimit: 8_000,
  });

  let added = 0;
  for (const section of sections) {
    const content = `### ${section.title}\n\n${section.body}`;
    const res = store.add(kind, content, {
      actor: 'import',
      sourceType: 'import',
      reason: `imported from ${filePath}`,
      pinned: true, // pin imported sections so they survive decay
    });
    if (res.ok && res.entry) {
      console.log(`  + ${section.title} (${content.length} chars) [id=${res.entry.id}]`);
      added++;
    } else {
      console.warn(`  ! ${section.title}: ${res.reason}`);
    }
  }
  return added;
}

async function main(): Promise<void> {
  console.log('[migrate] starting MEMORY.md + USER.md → memory_entries');

  // Check if already migrated
  const existing = stateStore.listMemoryEntries({
    userId: 'default',
    workspaceId: 'default',
    kind: 'behavior',
  });
  if (existing.length > 0) {
    console.log(`[migrate] ${existing.length} behavior entries already exist — will dedup by hash`);
  }

  const memAdded = await importFile(join(HARNESS_DIR, 'MEMORY.md'), 'behavior');
  const userAdded = await importFile(join(HARNESS_DIR, 'USER.md'), 'user_profile');

  console.log(`[migrate] done: +${memAdded} behavior, +${userAdded} user_profile`);
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
