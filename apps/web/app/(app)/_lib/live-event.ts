/**
 * Hvilke cache-familier et SSE-event skal oppfriske.
 * Selve innholdet hentes gjennom tRPC/RLS. Her avgjør vi bare hva som er
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

export function harLiveTenant(input: {
  harSesjon: boolean;
  tenantId: string | null | undefined;
}): boolean {
  return input.harSesjon && typeof input.tenantId === 'string' && input.tenantId.length > 0;
}

export function kanHenteStreamHead(input: {
  harSesjon: boolean;
  tenantId: string | null | undefined;
  stoppet: boolean;
}): boolean {
  return harLiveTenant(input) && !input.stoppet;
}

export function kanPolleStreamSince(input: {
  harSesjon: boolean;
  tenantId: string | null | undefined;
  cursor: number | null;
  stoppet: boolean;
}): boolean {
  return kanHenteStreamHead(input) && input.cursor != null;
}

function kodeFraFeil(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const o = error as Record<string, unknown>;
  if (typeof o.data === 'object' && o.data && 'code' in o.data) {
    const kode = (o.data as { code?: unknown }).code;
    if (typeof kode === 'string') return kode;
  }
  if (typeof o.shape === 'object' && o.shape && 'data' in o.shape) {
    const data = (o.shape as { data?: { code?: unknown } }).data;
    if (typeof data?.code === 'string') return data.code;
  }
  if (typeof o.code === 'string') return o.code;
  return null;
}

function meldingFraFeil(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return error == null ? '' : String(error);
}

/** 401 fra stream.head / stream.since. Stopper polleren — ikke innlogging. */
export function erStreamUautorisert(error: unknown): boolean {
  if (error == null) return false;
  if (kodeFraFeil(error) === 'UNAUTHORIZED') return true;
  if (typeof error === 'object' && error && 'data' in error) {
    const status = (error as { data?: { httpStatus?: unknown } }).data?.httpStatus;
    if (status === 401) return true;
  }
  const msg = meldingFraFeil(error);
  return (
    msg === 'UNAUTHORIZED' || msg.includes('UNAUTHORIZED') || msg.includes('Du er ikke innlogget')
  );
}

export function streamPollIntervalMs(input: {
  stoppet: boolean;
  live: boolean;
  error?: unknown;
}): number | false {
  if (input.stoppet || erStreamUautorisert(input.error)) return false;
  return input.live ? LIVE_POLL_MS.live : LIVE_POLL_MS.fallback;
}

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
