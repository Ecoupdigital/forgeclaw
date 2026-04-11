import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import type { SkillInfo } from "@/lib/types";

const SKILLS_DIR = join(homedir(), ".claude", "skills");
const CACHE_TTL_MS = 30_000;

let cache: { at: number; data: SkillInfo[] } | null = null;

function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
} {
  // Read first ~30 lines looking for a --- ... --- block.
  const head = content.split("\n").slice(0, 30).join("\n");
  const match = head.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const name = block
    .match(/^name\s*:\s*(.+?)\s*$/m)?.[1]
    ?.replace(/^["']|["']$/g, "");
  const description = block
    .match(/^description\s*:\s*(.+?)\s*$/m)?.[1]
    ?.replace(/^["']|["']$/g, "");
  return { name, description };
}

async function readSkillFromFile(
  filePath: string,
  relPath: string
): Promise<SkillInfo | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    // Fallback name derived from file path when frontmatter is missing.
    const fallbackName = relPath
      .replace(/\.md$/, "")
      .replace(/\/SKILL$/, "")
      .replace(/\//g, " / ");
    return {
      name: fm.name?.trim() || fallbackName,
      description: fm.description?.trim() || "",
      source: relPath,
    };
  } catch {
    return null;
  }
}

async function loadSkills(): Promise<SkillInfo[]> {
  if (!existsSync(SKILLS_DIR)) return [];

  const result: SkillInfo[] = [];
  let entries: string[];
  try {
    entries = await readdir(SKILLS_DIR);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const full = join(SKILLS_DIR, entry);
    let st;
    try {
      st = await stat(full);
    } catch {
      continue;
    }

    if (st.isDirectory()) {
      // Look for SKILL.md inside the directory.
      const skillFile = join(full, "SKILL.md");
      if (existsSync(skillFile)) {
        const skill = await readSkillFromFile(
          skillFile,
          `${entry}/SKILL.md`
        );
        if (skill) result.push(skill);
      }
    } else if (st.isFile() && entry.endsWith(".md")) {
      const skill = await readSkillFromFile(full, entry);
      if (skill) result.push(skill);
    }
  }

  // Sort alphabetically by display name.
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return Response.json({ skills: cache.data, source: "cache" });
  }
  try {
    const skills = await loadSkills();
    cache = { at: now, data: skills };
    return Response.json({ skills, source: "fs" });
  } catch (err) {
    return Response.json(
      {
        skills: [],
        source: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 200 } // Do not fail the request — the form degrades gracefully.
    );
  }
}
