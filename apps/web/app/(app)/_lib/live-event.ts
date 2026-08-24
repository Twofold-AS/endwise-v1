/**
 * F6-02 — Hvilke cache-familier et SSE-event skal oppfriske.
 *
 * Selve innholdet hentes gjennom tRPC/RLS. Her avgjør vi bare HVA som er
 * blitt gammelt. Holdes utenfor React så det kan testes uten å mounte appen.
 */

export const LIVE_DOMAIN_EVENTS = [
  'message.created',
  'thread.escalated',
  'tenant.modules.changed',
  'agent.start',
  'agent.token',
  'agent.tool_call',
  'agent.tool_result',
  'agent.done',
  'agent.error',
] as const;

export type LiveDomainEvent = (typeof LIVE_DOMAIN_EVENTS)[number];

export type LiveFamily = 'inbox' | 'entitlements';

export const LIVE_POLL_MS = { live: 15_000, fallback: 8_000 } as const;

export const LAST_EVENT_STORAGE_KEY = 'endwise.stream.lastEventId';

export function liveFamiliesForEvent(type: string): LiveFamily[] {
  if (type === 'message.created' || type === 'thread.escalated') return ['inbox'];
  if (type === 'tenant.modules.changed') return ['entitlements'];
  return [];
}

/** Mottaker-varsel. Avsenderen får aldri `message.created` (server hopper over forfatteren). */
export function shouldPlayInboundSound(type: string): boolean {
  return type === 'message.created';
}

export function parseLastEventId(raw: string | null | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function streamSseUrl(lastEventId: number): string {
  return lastEventId > 0 ? `/stream/sse?lastEventId=${lastEventId}` : '/stream/sse';
}

export function nextLastEventId(
  current: number,
  incoming: string | number | null | undefined,
): number {
  const n =
    typeof incoming === 'number'
      ? incoming
      : parseLastEventId(incoming == null ? null : String(incoming));
  return n > current ? n : current;
}
