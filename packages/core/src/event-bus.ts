type EventHandler = (data: Record<string, unknown>) => void | Promise<void>;

export type EventName =
  | 'message:incoming'
  | 'message:outgoing'
  | 'stream:chunk'
  | 'stream:done'
  | 'session:created'
  | 'session:resumed'
  | 'cron:fired'
  | 'cron:result'
  | 'activity:created';

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(event: EventName, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: EventName, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  once(event: EventName, handler: EventHandler): void {
    const wrapper: EventHandler = async (data) => {
      this.off(event, wrapper);
      await handler(data);
    };
    this.on(event, wrapper);
  }

  async emit(event: EventName, data: Record<string, unknown>): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const promises = [...handlers].map(async (handler) => {
      try {
        await handler(data);
      } catch (err) {
        console.error(`[event-bus] Handler error on "${event}":`, err);
      }
    });

    await Promise.allSettled(promises);
  }

  removeAllListeners(event?: EventName): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  listenerCount(event: EventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

export const eventBus = new EventBus();
export { EventBus };
