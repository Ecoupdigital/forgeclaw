import { requireApiAuth } from "@/lib/auth";
import * as core from "@/lib/core";

/**
 * GET /api/webhooks/:id/logs?limit=50
 *
 * Returns delivery logs for a specific webhook.
 * Response: { logs: WebhookDeliveryLog[], source: 'core' | 'empty' }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) {
    return Response.json({ error: "ID invalido" }, { status: 400 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

  try {
    const logs = core.listWebhookDeliveryLogs(id, limit);
    return Response.json({
      logs: logs ?? [],
      source: logs ? "core" : "empty",
    });
  } catch (err) {
    console.warn("[api/webhooks/:id/logs] Error:", err);
    return Response.json({ logs: [], source: "empty" });
  }
}
