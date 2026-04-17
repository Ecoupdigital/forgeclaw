import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

/**
 * GET /api/agents — lista todos os agentes
 * Response 200: { agents: AgentConfig[] }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const agents = core.listAgents();
    if (agents) {
      return Response.json({ agents, source: "core" });
    }
  } catch (err) {
    console.warn("[api/agents] Core unavailable:", err);
  }
  return Response.json({ agents: [], source: "empty" });
}

/**
 * POST /api/agents — cria um novo agente
 * Body: { name: string, systemPrompt?: string, memoryMode?: 'global'|'filtered', memoryDomainFilter?: string[], defaultRuntime?: 'claude-code'|'codex'|null }
 * Response 201: { id: number, agent: AgentConfig }
 * Response 400: { error: string }
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    name?: string;
    systemPrompt?: string | null;
    memoryMode?: "global" | "filtered";
    memoryDomainFilter?: string[];
    defaultRuntime?: "claude-code" | "codex" | null;
  };

  // Validacao
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  if (body.memoryMode && !["global", "filtered"].includes(body.memoryMode)) {
    return Response.json({ error: "memoryMode must be 'global' or 'filtered'" }, { status: 400 });
  }

  if (body.memoryMode === "filtered" && (!body.memoryDomainFilter || body.memoryDomainFilter.length === 0)) {
    return Response.json({ error: "memoryDomainFilter is required when memoryMode is 'filtered'" }, { status: 400 });
  }

  if (body.defaultRuntime !== undefined && body.defaultRuntime !== null && !["claude-code", "codex"].includes(body.defaultRuntime)) {
    return Response.json({ error: "defaultRuntime must be 'claude-code', 'codex', or null" }, { status: 400 });
  }

  const now = Date.now();
  const id = core.createAgent({
    name: body.name.trim(),
    systemPrompt: body.systemPrompt ?? null,
    memoryMode: body.memoryMode ?? "global",
    memoryDomainFilter: body.memoryDomainFilter ?? [],
    defaultRuntime: body.defaultRuntime ?? null,
    createdAt: now,
    updatedAt: now,
  });

  if (id === null) {
    return Response.json({ error: "Failed to create agent" }, { status: 500 });
  }

  const agent = core.getAgent(id);
  return Response.json({ id, agent }, { status: 201 });
}
