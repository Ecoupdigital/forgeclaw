import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, type EventName } from '../src/event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on/emit', () => {
    it('deve chamar handler quando evento e emitido', async () => {
      const handler = vi.fn();
      bus.on('message:incoming', handler);
      await bus.emit('message:incoming', { text: 'hello' });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ text: 'hello' });
    });

    it('deve suportar multiplos handlers para mesmo evento', async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('message:incoming', h1);
      bus.on('message:incoming', h2);

      await bus.emit('message:incoming', { x: 1 });

      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
    });

    it('deve nao falhar ao emitir evento sem listeners', async () => {
      await expect(bus.emit('stream:done', {})).resolves.toBeUndefined();
    });
  });

  describe('off', () => {
    it('deve remover handler especifico', async () => {
      const handler = vi.fn();
      bus.on('message:incoming', handler);
      bus.off('message:incoming', handler);

      await bus.emit('message:incoming', {});
      expect(handler).not.toHaveBeenCalled();
    });

    it('deve nao falhar ao remover handler inexistente', () => {
      expect(() => bus.off('message:incoming', vi.fn())).not.toThrow();
    });
  });

  describe('once', () => {
    it('deve chamar handler apenas uma vez', async () => {
      const handler = vi.fn();
      bus.once('session:created', handler);

      await bus.emit('session:created', { id: '1' });
      await bus.emit('session:created', { id: '2' });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ id: '1' });
    });
  });

  describe('error isolation', () => {
    it('deve continuar executando outros handlers quando um falha', async () => {
      const errorHandler = vi.fn(() => { throw new Error('boom'); });
      const goodHandler = vi.fn();

      bus.on('message:incoming', errorHandler);
      bus.on('message:incoming', goodHandler);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await bus.emit('message:incoming', {});
      consoleSpy.mockRestore();

      expect(errorHandler).toHaveBeenCalledOnce();
      expect(goodHandler).toHaveBeenCalledOnce();
    });
  });

  describe('removeAllListeners', () => {
    it('deve remover todos os listeners de um evento', async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('message:incoming', h1);
      bus.on('message:outgoing', h2);

      bus.removeAllListeners('message:incoming');

      await bus.emit('message:incoming', {});
      await bus.emit('message:outgoing', {});

      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();
    });

    it('deve remover todos os listeners quando sem argumento', async () => {
      bus.on('message:incoming', vi.fn());
      bus.on('message:outgoing', vi.fn());

      bus.removeAllListeners();

      expect(bus.listenerCount('message:incoming')).toBe(0);
      expect(bus.listenerCount('message:outgoing')).toBe(0);
    });
  });

  describe('listenerCount', () => {
    it('deve retornar contagem correta de listeners', () => {
      expect(bus.listenerCount('message:incoming')).toBe(0);

      const h = vi.fn();
      bus.on('message:incoming', h);
      expect(bus.listenerCount('message:incoming')).toBe(1);

      bus.off('message:incoming', h);
      expect(bus.listenerCount('message:incoming')).toBe(0);
    });
  });
});
