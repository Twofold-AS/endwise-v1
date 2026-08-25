import { describe, expect, it } from 'vitest';
import {
  LAST_EVENT_STORAGE_KEY,
  LIVE_POLL_MS,
  liveFamiliesForEvent,
  nextLastEventId,
  parseLastEventId,
  shouldPlayInboundSound,
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
