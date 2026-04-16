import { requireApiAuth } from "@/lib/auth";
import * as core from "@/lib/core";

/**
 * PUT /api/webhooks/:id
 * Update a webhook.
 * Body: { url?: string, events?: string[], enabled?: boolean }
 * Response 200: { ok: true }
 * Response 404: { error: string }
 *
 * DELETE /api/webhooks/:id
 * Delete a webhook and its delivery logs (CASCADE).
 * Response 200: { ok: true }
 */
export async function PUT(
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

  try {
    const body = (await request.json()) as {
      url?: string;
      events?: string[];
      enabled?: boolean;
    };

    // Validate URL if provided
    if (body.url !== undefined) {
      if (typeof body.url !== "string") {
        return Response.json({ error: "URL invalida" }, { status: 400 });
      }
      try {
        new URL(body.url);
      } catch {
        return Response.json({ error: "URL invalida" }, { status: 400 });
      }
    }

    const ok = core.updateWebhook(id, {
      url: body.url,
      events: body.events,
      enabled: body.enabled,
    });

    if (!ok) {
      return Response.json(
        { error: "Webhook nao encontrado" },
        { status: 404 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.warn("[api/webhooks/:id] PUT error:", err);
    return Response.json(
      { error: "Falha ao atualizar webhook" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

  try {
    core.deleteWebhook(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.warn("[api/webhooks/:id] DELETE error:", err);
    return Response.json(
      { error: "Falha ao deletar webhook" },
      { status: 500 },
    );
  }
}
