import { createHmac } from 'node:crypto';
import { eventBus } from './event-bus';
import { stateStore } from './state-store';

/**
 * Webhook Dispatcher — delivers HTTP POST notifications when activities occur.
 *
 * Features:
 * - HMAC-SHA256 signature in X-ForgeClaw-Signature header
 * - Retry with exponential backoff (3 attempts: 1s, 4s, 16s)
 * - Basic circuit breaker: disables webhook after 5 consecutive failures
 * - All deliveries logged in webhook_delivery_logs table
 * - Fire-and-forget from the event handler (never blocks the EventBus)
 *
 * Call `startWebhookDispatcher()` once at boot.
 */

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1_000;
const CIRCUIT_BREAKER_THRESHOLD = 5;

/** Track consecutive failures per webhook to implement circuit breaker. */
const failureCounts = new Map<number, number>();

let started = false;

function computeSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

async function deliverWithRetry(
  webhookId: number,
  url: string,
  secret: string,
  eventType: string,
  payload: string,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const signature = computeSignature(payload, secret);

    let statusCode: number | null = null;
    let responseBody: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ForgeClaw-Signature': `sha256=${signature}`,
          'X-ForgeClaw-Event': eventType,
          'User-Agent': 'ForgeClaw-Webhook/1.0',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = response.status;

      // Read response body (limit to 4KB to avoid memory issues)
      try {
        const text = await response.text();
        responseBody = text.slice(0, 4096);
      } catch {
        responseBody = null;
      }

      // Log this delivery attempt
      stateStore.createWebhookDeliveryLog({
        webhookId,
        eventType,
        payload: payload.slice(0, 10_000), // Limit stored payload
        statusCode,
        responseBody,
        attempt,
        createdAt: Date.now(),
      });

      // Success: 2xx status code
      if (statusCode >= 200 && statusCode < 300) {
        // Reset failure counter on success
        failureCounts.delete(webhookId);
        return;
      }

      // 4xx errors (except 429) are not retryable
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        console.warn(
          `[webhook-dispatcher] Webhook ${webhookId} returned ${statusCode}, not retrying`,
        );
        incrementFailure(webhookId);
        return;
      }
    } catch (err) {
      // Network error or timeout
      const errorMsg = err instanceof Error ? err.message : String(err);

      stateStore.createWebhookDeliveryLog({
        webhookId,
        eventType,
        payload: payload.slice(0, 10_000),
        statusCode: null,
        responseBody: `Error: ${errorMsg}`,
        attempt,
        createdAt: Date.now(),
      });
    }

    // Wait before retry (exponential backoff: 1s, 4s, 16s)
    if (attempt < MAX_ATTEMPTS) {
      const delay = BASE_DELAY_MS * Math.pow(4, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // All attempts exhausted
  console.error(
    `[webhook-dispatcher] Webhook ${webhookId} failed after ${MAX_ATTEMPTS} attempts`,
  );
  incrementFailure(webhookId);
}

function incrementFailure(webhookId: number): void {
  const count = (failureCounts.get(webhookId) ?? 0) + 1;
  failureCounts.set(webhookId, count);

  if (count >= CIRCUIT_BREAKER_THRESHOLD) {
    console.warn(
      `[webhook-dispatcher] Circuit breaker: disabling webhook ${webhookId} after ${count} consecutive failures`,
    );
    try {
      stateStore.updateWebhook(webhookId, { enabled: false });
    } catch (err) {
      console.error('[webhook-dispatcher] Failed to disable webhook:', err);
    }
    failureCounts.delete(webhookId);
  }
}

export function startWebhookDispatcher(): void {
  if (started) return;
  started = true;

  eventBus.on('activity:created', async (data) => {
    const eventType = data.type as string;
    if (!eventType) return;

    try {
      const webhooks = stateStore.getEnabledWebhooksForEvent(eventType);
      if (webhooks.length === 0) return;

      const payload = JSON.stringify({
        event: eventType,
        timestamp: Date.now(),
        data: {
          activityId: data.activityId,
          entityType: data.entityType,
          entityId: data.entityId,
          actor: data.actor,
          description: data.description,
          metadata: data.metadata,
        },
      });

      // Fire-and-forget: don't await (prevents blocking the EventBus)
      for (const webhook of webhooks) {
        deliverWithRetry(
          webhook.id,
          webhook.url,
          webhook.secret,
          eventType,
          payload,
        ).catch((err) => {
          console.error(
            `[webhook-dispatcher] Unhandled error for webhook ${webhook.id}:`,
            err,
          );
        });
      }
    } catch (err) {
      console.error('[webhook-dispatcher] Failed to process activity:created:', err);
    }
  });

  console.log('[webhook-dispatcher] Started — listening for activity:created events');
}

/**
 * Reset the failure count for a webhook (e.g., after manual re-enable from dashboard).
 */
export function resetWebhookCircuitBreaker(webhookId: number): void {
  failureCounts.delete(webhookId);
}
