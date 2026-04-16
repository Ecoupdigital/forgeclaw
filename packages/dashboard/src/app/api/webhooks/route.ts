import { randomBytes } from "node:crypto";
import { requireApiAuth } from "@/lib/auth";
import * as core from "@/lib/core";

/**
 * GET /api/webhooks
 * Returns all configured webhooks.
 * Response: { webhooks: Webhook[], source: 'core' | 'empty' }
 *
 * POST /api/webhooks
 * Create a new webhook.
 * Body: { url: string, events: string[], enabled?: boolean }
 * Response 201: { webhook: Webhook }
 * Response 400: { error: string }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const webhooks = core.listWebhooks();
    return Response.json({
      webhooks: webhooks ?? [],
      source: webhooks ? "core" : "empty",
    });
  } catch (err) {
    console.warn("[api/webhooks] Error:", err);
    return Response.json({ webhooks: [], source: "empty" });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      url?: string;
      events?: string[];
      enabled?: boolean;
    };

    // Validate URL
    if (!body.url || typeof body.url !== "string") {
      return Response.json(
        { error: "Campo 'url' e obrigatorio" },
        { status: 400 },
      );
    }

    try {
      new URL(body.url);
    } catch {
      return Response.json(
        { error: "URL invalida" },
        { status: 400 },
      );
    }

    // Validate events
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return Response.json(
        { error: "Campo 'events' deve ser um array nao vazio de tipos de evento" },
        { status: 400 },
      );
    }

    // Generate HMAC secret
    const secret = randomBytes(32).toString("hex");

    const id = core.createWebhook({
      url: body.url,
      events: body.events,
      secret,
      enabled: body.enabled !== false,
      createdAt: Date.now(),
    });

    if (id === null) {
      return Response.json(
        { error: "Falha ao criar webhook (DB indisponivel)" },
        { status: 500 },
      );
    }

    const webhook = core.getWebhook(id);
    return Response.json({ webhook }, { status: 201 });
  } catch (err) {
    console.warn("[api/webhooks] POST error:", err);
    return Response.json(
      { error: "Falha ao criar webhook" },
      { status: 500 },
    );
  }
}
