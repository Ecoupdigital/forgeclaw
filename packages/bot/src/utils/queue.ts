export interface QueuedMessage {
  text: string;
  chatId: number;
  topicId: number | null;
  messageId: number;
  timestamp: number;
}

const MAX_QUEUE_SIZE = 5;

export class MessageQueue {
  private queues = new Map<string, QueuedMessage[]>();
  private processing = new Map<string, boolean>();

  /**
   * Enqueue a message for a session key.
   * Returns false if the queue is full.
   */
  enqueue(sessionKey: string, message: QueuedMessage): boolean {
    const queue = this.queues.get(sessionKey) ?? [];
    if (queue.length >= MAX_QUEUE_SIZE) {
      return false;
    }
    queue.push(message);
    this.queues.set(sessionKey, queue);
    return true;
  }

  /**
   * Dequeue the next message for a session key.
   */
  dequeue(sessionKey: string): QueuedMessage | undefined {
    const queue = this.queues.get(sessionKey);
    if (!queue || queue.length === 0) return undefined;
    const msg = queue.shift();
    if (queue.length === 0) {
      this.queues.delete(sessionKey);
    }
    return msg;
  }

  /**
   * Get the current queue size for a session key.
   */
  size(sessionKey: string): number {
    return this.queues.get(sessionKey)?.length ?? 0;
  }

  /**
   * Check if a session key is currently processing a message.
   */
  isProcessing(sessionKey: string): boolean {
    return this.processing.get(sessionKey) ?? false;
  }

  /**
   * Set the processing state for a session key.
   */
  setProcessing(sessionKey: string, value: boolean): void {
    if (value) {
      this.processing.set(sessionKey, true);
    } else {
      this.processing.delete(sessionKey);
    }
  }
}

export const messageQueue = new MessageQueue();
