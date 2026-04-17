import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

/**
 * GET /api/agents/[id] — retorna um agente + topics vinculados
 * Response 200: { agent: AgentConfig, topics: TopicInfo[] }
 * Response 404: { error: string }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const agentId = Number(id);
  if (!Number.isFinite(agentId) || agentId <= 0) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const agent = core.getAgent(agentId);
  if (!agent) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const topics = core.listTopicsByAgent(agentId) ?? [];
  return Response.json({ agent, topics });
}

/**
 * PUT /api/agents/[id] — atualiza um agente
 * Body: Partial<{ name, systemPrompt, memoryMode, memoryDomainFilter, defaultRuntime }>
 * Response 200: { success: true, agent: AgentConfig }
 * Response 404: { error: string }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const agentId = Number(id);
  if (!Number.isFinite(agentId) || agentId <= 0) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const existing = core.getAgent(agentId);
  if (!existing) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    systemPrompt?: string | null;
    memoryMode?: "global" | "filtered";
    memoryDomainFilter?: string[];
    defaultRuntime?: "claude-code" | "codex" | null;
  };

  // Validacao
  if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length === 0)) {
    return Response.json({ error: "name cannot be empty" }, { status: 400 });
  }

  if (body.memoryMode && !["global", "filtered"].includes(body.memoryMode)) {
    return Response.json({ error: "memoryMode must be 'global' or 'filtered'" }, { status: 400 });
  }

  // Se memoryMode='filtered', verificar que tem tags (considerar estado final, nao apenas o body)
  const finalMemoryMode = body.memoryMode ?? existing.memoryMode;
  const finalFilter = body.memoryDomainFilter ?? existing.memoryDomainFilter;
  if (finalMemoryMode === "filtered" && finalFilter.length === 0) {
    return Response.json({ error: "memoryDomainFilter is required when memoryMode is 'filtered'" }, { status: 400 });
  }

  const success = core.updateAgent(agentId, {
    ...(body.name !== undefined ? { name: body.name.trim() } : {}),
    ...(body.systemPrompt !== undefined ? { systemPrompt: body.systemPrompt } : {}),
    ...(body.memoryMode !== undefined ? { memoryMode: body.memoryMode } : {}),
    ...(body.memoryDomainFilter !== undefined ? { memoryDomainFilter: body.memoryDomainFilter } : {}),
    ...(body.defaultRuntime !== undefined ? { defaultRuntime: body.defaultRuntime } : {}),
  });

  if (!success) {
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  const agent = core.getAgent(agentId);
  return Response.json({ success: true, agent });
}

/**
 * DELETE /api/agents/[id] — deleta agente (desvincula topics automaticamente)
 * Response 200: { success: true }
 * Response 404: { error: string }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const agentId = Number(id);
  if (!Number.isFinite(agentId) || agentId <= 0) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const existing = core.getAgent(agentId);
  if (!existing) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const success = core.deleteAgent(agentId);
  if (!success) {
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }

  return Response.json({ success: true });
}
