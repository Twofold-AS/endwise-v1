import { describe, expect, it } from 'vitest';
import {
  erStreamUautorisert,
  kanHenteStreamHead,
  kanPolleStreamSince,
  LAST_EVENT_STORAGE_KEY,
  LIVE_POLL_MS,
  liveFamiliesForEvent,
  nextLastEventId,
  parseLastEventId,
  shouldPlayInboundSound,
  streamPollIntervalMs,
  streamSseUrl,
} from '../app/(app)/_lib/live-event.ts';

describe('live event → cache-familier', () => {
  it('message.created oppfrisker innboksen, ikke pakken', () => {
    expect(liveFamiliesForEvent('message.created')).toEqual(['inbox']);
  });

  it('thread.escalated oppfrisker innboksen', () => {
    expect(liveFamiliesForEvent('thread.escalated')).toEqual(['inbox']);
  });

  it('tenant.modules.changed oppfrisker entitlements', () => {
    expect(liveFamiliesForEvent('tenant.modules.changed')).toEqual(['entitlements']);
  });

  it('ukjent event rører ingenting', () => {
    expect(liveFamiliesForEvent('agent.token')).toEqual([]);
    expect(liveFamiliesForEvent('heartbeat')).toEqual([]);
  });
});

describe('inbound-lyd', () => {
  it('spiller bare for message.created — aldri for avsender-kvittering eller pakkebytte', () => {
    expect(shouldPlayInboundSound('message.created')).toBe(true);
    expect(shouldPlayInboundSound('thread.escalated')).toBe(false);
    expect(shouldPlayInboundSound('tenant.modules.changed')).toBe(false);
    expect(shouldPlayInboundSound('agent.done')).toBe(false);
  });
});

describe('Last-Event-ID', () => {
  it('stream-URL tar med lastEventId slik reconnect spiller av det som ble mistet', () => {
    expect(streamSseUrl(0)).toBe('/stream/sse');
    expect(streamSseUrl(42)).toBe('/stream/sse?lastEventId=42');
  });

  it('ignorerer ugyldige id-er og tar den høyeste', () => {
    expect(parseLastEventId(null)).toBe(0);
    expect(parseLastEventId('nei')).toBe(0);
    expect(parseLastEventId('7')).toBe(7);
    expect(nextLastEventId(7, '3')).toBe(7);
    expect(nextLastEventId(7, '12')).toBe(12);
    expect(LAST_EVENT_STORAGE_KEY).toMatch(/lastEventId/);
  });

  it('poller oftere når SSE ikke er live', () => {
    expect(LIVE_POLL_MS.fallback).toBeLessThan(LIVE_POLL_MS.live);
    expect(LIVE_POLL_MS.fallback).toBeGreaterThanOrEqual(5_000);
    expect(LIVE_POLL_MS.live).toBeLessThanOrEqual(15_000);
  });
});

/**
 * Prod: GET /trpc/stream.since 401 hvert 8. s mens session.me er 200.
 * #111 stoppet bare «ingen Better-Auth-bruker». Polleren må også kreve
 * tenantId, og en 401 må slå av refetchInterval — ellers stablet retries
 * mot PgBouncer og frøs siden.
 */
describe('stream-poll: tenant + 401-stopp', () => {
  const tenantId = '65829397-0000-4000-8000-000000000001';

  it('starter ikke stream.since uten sesjon, tenantId eller cursor', () => {
    expect(kanPolleStreamSince({ harSesjon: false, tenantId, cursor: 1, stoppet: false })).toBe(
      false,
    );
    expect(
      kanPolleStreamSince({ harSesjon: true, tenantId: null, cursor: 1, stoppet: false }),
    ).toBe(false);
    expect(kanPolleStreamSince({ harSesjon: true, tenantId: '', cursor: 1, stoppet: false })).toBe(
      false,
    );
    expect(kanPolleStreamSince({ harSesjon: true, tenantId, cursor: null, stoppet: false })).toBe(
      false,
    );
    expect(kanHenteStreamHead({ harSesjon: true, tenantId: null, stoppet: false })).toBe(false);
  });

  it('starter med ekte sesjon og tenantId', () => {
    expect(kanPolleStreamSince({ harSesjon: true, tenantId, cursor: 1, stoppet: false })).toBe(
      true,
    );
    expect(kanHenteStreamHead({ harSesjon: true, tenantId, stoppet: false })).toBe(true);
  });

  it('401/UNAUTHORIZED stopper intervallet — ingen 8s-løkke', () => {
    expect(
      erStreamUautorisert({
        message: 'Du er ikke innlogget.',
        data: { code: 'UNAUTHORIZED', httpStatus: 401 },
      }),
    ).toBe(true);
    expect(erStreamUautorisert(new Error('Du er ikke innlogget.'))).toBe(true);
    expect(erStreamUautorisert({ data: { code: 'UNAUTHORIZED' } })).toBe(true);
    expect(erStreamUautorisert({ shape: { data: { code: 'UNAUTHORIZED' } } })).toBe(true);
    expect(erStreamUautorisert(new Error('Nettet er nede'))).toBe(false);
    expect(erStreamUautorisert(undefined)).toBe(false);

    expect(streamPollIntervalMs({ stoppet: true, live: false })).toBe(false);
    expect(
      streamPollIntervalMs({
        stoppet: false,
        live: false,
        error: { data: { code: 'UNAUTHORIZED' } },
      }),
    ).toBe(false);
    expect(streamPollIntervalMs({ stoppet: false, live: false })).toBe(LIVE_POLL_MS.fallback);
    expect(streamPollIntervalMs({ stoppet: false, live: true })).toBe(LIVE_POLL_MS.live);
    expect(kanPolleStreamSince({ harSesjon: true, tenantId, cursor: 1, stoppet: true })).toBe(
      false,
    );
    expect(kanHenteStreamHead({ harSesjon: true, tenantId, stoppet: true })).toBe(false);
  });
});
