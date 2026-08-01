import type { EndwiseEvent, EventMeta, EventName, EventPayload } from './catalog.ts';

export type EventHandler<N extends EventName> = (event: EndwiseEvent<N>) => void | Promise<void>;

export interface EventBus {
  on<N extends EventName>(name: N, handler: EventHandler<N>): () => void;
  emit<N extends EventName>(
    name: N,
    payload: EventPayload<N>,
    meta: Omit<EventMeta, 'occurredAt'> & { occurredAt?: string },
  ): Promise<void>;
}

/**
 * F0-05 — Typet in-process emitter.
 * Bevisst tynn: varige/asynkrone jobber hører hjemme i Vercel Workflows (F0-13),
 * ikke i en kø her. Bussen er for synkron fan-out innenfor én request.
 */
export function createEventBus(options?: {
  onError?: (error: unknown, event: EndwiseEvent) => void;
}): EventBus {
  const handlers = new Map<EventName, Set<EventHandler<EventName>>>();

  return {
    on(name, handler) {
      const set = handlers.get(name) ?? new Set();
      set.add(handler as EventHandler<EventName>);
      handlers.set(name, set);
      return () => {
        set.delete(handler as EventHandler<EventName>);
      };
    },

    async emit(name, payload, meta) {
      const event = {
        name,
        payload,
        meta: { ...meta, occurredAt: meta.occurredAt ?? new Date().toISOString() },
      } as EndwiseEvent;

      const set = handlers.get(name);
      if (!set) return;

      for (const handler of set) {
        try {
          await handler(event);
        } catch (error) {
          if (options?.onError) options.onError(error, event);
          else throw error;
        }
      }
    },
  };
}
