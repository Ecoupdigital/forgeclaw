import * as core from "@/lib/core";
import { requireApiAuth } from "@/lib/auth";

/**
 * PUT /api/topics/[id]/agent — vincular ou desvincular agente de um topic
 * Body: { agentId: number | null }
 * Response 200: { success: true }
 * Response 400: { error: string }
 * Response 404: { error: string }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId) || topicId <= 0) {
    return Response.json({ error: "invalid topic id" }, { status: 400 });
  }

  const body = (await request.json()) as { agentId?: number | null };

  // agentId pode ser null (desvincular) ou number (vincular)
  const agentId = body.agentId ?? null;

  if (agentId !== null) {
    if (!Number.isFinite(agentId) || agentId <= 0) {
      return Response.json({ error: "invalid agentId" }, { status: 400 });
    }
    // Verificar que o agente existe
    const agent = core.getAgent(agentId);
    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }
  }

  // Verificar que o topic existe
  const topic = core.getTopic(topicId);
  if (!topic) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  const success = core.updateTopicAgent(topicId, agentId);
  if (!success) {
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  return Response.json({ success: true, agentId });
}
