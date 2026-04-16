import { eventBus } from './event-bus';
import { stateStore } from './state-store';
import type { ActivityType, ActivityEntityType } from './types';

/**
 * Activity Recorder — creates an audit trail of system events.
 *
 * Listens to EventBus events and writes rows to the `activities` table.
 * After each write, emits 'activity:created' so downstream consumers
 * (webhook dispatcher, real-time dashboard feed) can react.
 *
 * Call `startActivityRecorder()` once at boot.
 */

let started = false;

async function record(
  type: ActivityType,
  entityType: ActivityEntityType,
  entityId: string,
  actor: string,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const id = stateStore.createActivity({
      type,
      entityType,
      entityId,
      actor,
      description,
      metadata: metadata ?? null,
      createdAt: Date.now(),
    });

    // Notify downstream (webhook dispatcher, dashboard feed)
    await eventBus.emit('activity:created', {
      activityId: id,
      type,
      entityType,
      entityId,
      actor,
      description,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.error(`[activity-recorder] Failed to record ${type}:`, err);
  }
}

export function startActivityRecorder(): void {
  if (started) return;
  started = true;

  // Session events
  eventBus.on('session:created', async (data) => {
    const sessionKey = data.sessionKey as string ?? 'unknown';
    const topicId = data.topicId as number | null;
    await record(
      'session:created',
      'session',
      sessionKey,
      'system',
      `Nova sessao criada para ${sessionKey}`,
      { topicId },
    );
  });

  eventBus.on('session:resumed', async (data) => {
    const sessionKey = data.sessionKey as string ?? 'unknown';
    const topicId = data.topicId as number | null;
    await record(
      'session:resumed',
      'session',
      sessionKey,
      'system',
      `Sessao retomada: ${sessionKey}`,
      { topicId },
    );
  });

  // Message events
  eventBus.on('message:incoming', async (data) => {
    const sessionKey = data.sessionKey as string ?? 'unknown';
    const origin = data.origin as string ?? 'unknown';
    const content = data.content as string ?? '';
    await record(
      'message:sent',
      'message',
      sessionKey,
      origin,
      `Mensagem enviada (${content.length} chars)`,
      { origin, contentPreview: content.slice(0, 100) },
    );
  });

  eventBus.on('message:outgoing', async (data) => {
    const sessionKey = data.sessionKey as string ?? 'unknown';
    const origin = data.origin as string ?? 'unknown';
    const content = data.content as string ?? '';
    await record(
      'message:received',
      'message',
      sessionKey,
      'claude',
      `Resposta do Claude (${content.length} chars)`,
      { origin, contentPreview: content.slice(0, 100) },
    );
  });

  // Cron events
  eventBus.on('cron:fired', async (data) => {
    const jobId = data.jobId as number;
    const name = data.name as string ?? 'unknown';
    await record(
      'cron:fired',
      'cron',
      String(jobId),
      'system',
      `Cron disparado: ${name}`,
      { jobId, name },
    );
  });

  eventBus.on('cron:result', async (data) => {
    const jobId = data.jobId as number;
    const jobName = data.jobName as string ?? 'unknown';
    const status = data.status as string;
    const activityType: ActivityType = status === 'success' ? 'cron:completed' : 'cron:failed';
    await record(
      activityType,
      'cron',
      String(jobId),
      'system',
      `Cron ${status}: ${jobName}`,
      { jobId, jobName, status },
    );
  });

  console.log('[activity-recorder] Started — listening for system events');
}
