import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { requireApiAuth } from "@/lib/auth";

interface ModelInfo {
  id: string;
  label: string;
  tier: "fast" | "balanced" | "powerful";
}

const CACHE_DIR = join(homedir(), ".forgeclaw", "cache");
const CACHE_FILE = join(CACHE_DIR, "models.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Models verified working with `claude -p --model <id>`.
 * Aliases resolve to latest version automatically.
 */
const KNOWN_MODELS: ModelInfo[] = [
  // Aliases — always resolve to latest
  { id: "haiku", label: "Haiku (latest)", tier: "fast" },
  { id: "sonnet", label: "Sonnet (latest)", tier: "balanced" },
  { id: "opus", label: "Opus (latest)", tier: "powerful" },
  // Pinned versions
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", tier: "fast" },
  { id: "claude-sonnet-4-20250514", label: "Sonnet 4", tier: "balanced" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", tier: "balanced" },
  { id: "claude-opus-4-20250514", label: "Opus 4", tier: "powerful" },
  { id: "claude-opus-4-6", label: "Opus 4.6", tier: "powerful" },
];

interface CachedData {
  models: ModelInfo[];
  fetchedAt: number;
}

async function readCache(): Promise<CachedData | null> {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const raw = await readFile(CACHE_FILE, "utf-8");
    const data = JSON.parse(raw) as CachedData;
    if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeCache(models: ModelInfo[]): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(
      CACHE_FILE,
      JSON.stringify({ models, fetchedAt: Date.now() } satisfies CachedData),
      "utf-8",
    );
  } catch {
    // non-fatal
  }
}

/** Fetch models from Anthropic API if ANTHROPIC_API_KEY is set. */
async function fetchFromAPI(): Promise<ModelInfo[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=50", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      data: Array<{ id: string; display_name?: string }>;
    };

    const apiModels: ModelInfo[] = data.data
      .filter((m) => m.id.startsWith("claude-"))
      .map((m) => ({
        id: m.id,
        label:
          m.display_name ??
          m.id.replace("claude-", "").replace(/-\d{8}$/, "").replace(/-/g, " "),
        tier: m.id.includes("haiku")
          ? ("fast" as const)
          : m.id.includes("opus")
            ? ("powerful" as const)
            : ("balanced" as const),
      }));

    // Merge: aliases first, then API models, then any known models not in API
    const apiIds = new Set(apiModels.map((m) => m.id));
    const aliases = KNOWN_MODELS.filter((m) => !m.id.includes("-"));
    const extra = KNOWN_MODELS.filter(
      (m) => m.id.includes("-") && !apiIds.has(m.id),
    );

    return [...aliases, ...apiModels, ...extra];
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  // 1. Try cache
  const cached = await readCache();
  if (cached) {
    return Response.json({
      models: cached.models,
      source: "cache",
      fetchedAt: cached.fetchedAt,
    });
  }

  // 2. Try API
  const apiModels = await fetchFromAPI();
  if (apiModels && apiModels.length > 0) {
    await writeCache(apiModels);
    return Response.json({
      models: apiModels,
      source: "api",
      fetchedAt: Date.now(),
    });
  }

  // 3. Fallback to built-in
  return Response.json({
    models: KNOWN_MODELS,
    source: "builtin",
    fetchedAt: null,
  });
}

/** Force refresh — clear cache and re-fetch */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    if (existsSync(CACHE_FILE)) await unlink(CACHE_FILE);
  } catch {
    // ignore
  }

  const apiModels = await fetchFromAPI();
  if (apiModels && apiModels.length > 0) {
    await writeCache(apiModels);
    return Response.json({ models: apiModels, source: "api", refreshed: true });
  }

  return Response.json({
    models: KNOWN_MODELS,
    source: "builtin",
    refreshed: false,
  });
}
