import { describe, expect, it } from 'vitest';
import { QuickAuthError, QuickError, QuickSsrfError } from '../src/errors.ts';
import { QUICK_PROBE_USER_MESSAGES, quickProbeUserMessage } from '../src/probe-error.ts';

describe('quickProbeUserMessage — distinkte BAD_REQUEST, ingen rå fetch-cause', () => {
  it('401/403 → nøkkel avvist', () => {
    expect(quickProbeUserMessage(new QuickAuthError('Quick avviste token (401/403)', 401))).toBe(
      QUICK_PROBE_USER_MESSAGES.rejected,
    );
    expect(quickProbeUserMessage(new QuickAuthError('x', 403))).toBe(
      QUICK_PROBE_USER_MESSAGES.rejected,
    );
    expect(QUICK_PROBE_USER_MESSAGES.rejected).toMatch(/avviste nøkkelen/i);
  });

  it('timeout → tidsavbrudd', () => {
    expect(quickProbeUserMessage(new QuickError('Tidsavbrudd mot Quick'))).toBe(
      QUICK_PROBE_USER_MESSAGES.timeout,
    );
    const abort = new Error('The operation was aborted');
    abort.name = 'TimeoutError';
    expect(quickProbeUserMessage(abort)).toBe(QUICK_PROBE_USER_MESSAGES.timeout);
    expect(QUICK_PROBE_USER_MESSAGES.timeout).toMatch(/tidsavbrudd/i);
  });

  it('cannot reach → nådde ikke Quick', () => {
    expect(quickProbeUserMessage(new QuickError('Nådde ikke Quick'))).toBe(
      QUICK_PROBE_USER_MESSAGES.unreachable,
    );
    expect(QUICK_PROBE_USER_MESSAGES.unreachable).toMatch(/nådde ikke Quick/i);
  });

  it('HTTP 500 er ikke avvist nøkkel — egen melding om client/info og base-URL', () => {
    const msg = quickProbeUserMessage(new QuickError('Quick svarte 500', 500));
    expect(msg).toBe(QUICK_PROBE_USER_MESSAGES.http500);
    expect(msg).toBe(
      'Quick svarte 500 på client/info — ikke en avvist nøkkel. Sjekk at base-URL er https://q3.quick.no/<slug> uten /api/v2 og uten /Help.',
    );
    expect(msg).not.toBe(QUICK_PROBE_USER_MESSAGES.rejected);
    expect(msg).not.toMatch(/avviste nøkkelen/i);
  });

  it('uventet JSON/status → uventet svar (ikke 500)', () => {
    expect(quickProbeUserMessage(new QuickError('Uventet svar fra Quick (ikke JSON)'))).toBe(
      QUICK_PROBE_USER_MESSAGES.unexpected,
    );
    expect(quickProbeUserMessage(new QuickError('Quick svarte 502', 502))).toBe(
      QUICK_PROBE_USER_MESSAGES.unexpected,
    );
    expect(QUICK_PROBE_USER_MESSAGES.unexpected).toMatch(/uventet svar/i);
  });

  it('mangler nøkkel / URL får egne meldinger', () => {
    expect(quickProbeUserMessage(new QuickError('ApiV2-nøkkel mangler'))).toBe(
      QUICK_PROBE_USER_MESSAGES.noToken,
    );
    expect(quickProbeUserMessage(new QuickError('Quick-URL mangler'))).toBe(
      QUICK_PROBE_USER_MESSAGES.noUrl,
    );
    expect(QUICK_PROBE_USER_MESSAGES.noToken).toMatch(/nøkkel mangler/i);
    expect(QUICK_PROBE_USER_MESSAGES.noUrl).toMatch(/URL mangler/i);
  });

  it('lekker aldri rå fetch-cause (host/IP) og kollapser ikke alt til 401-setningen', () => {
    const raw = new Error('fetch failed: https://169.254.169.254/latest/meta-data/ ECONNREFUSED');
    const msg = quickProbeUserMessage(raw);
    expect(msg).not.toContain('169.254.169.254');
    expect(msg).not.toContain('ECONNREFUSED');
    expect(msg).not.toContain('meta-data');
    expect(msg).toBe(QUICK_PROBE_USER_MESSAGES.unexpected);

    const distinct = new Set([
      QUICK_PROBE_USER_MESSAGES.rejected,
      QUICK_PROBE_USER_MESSAGES.timeout,
      QUICK_PROBE_USER_MESSAGES.unreachable,
      QUICK_PROBE_USER_MESSAGES.unexpected,
      QUICK_PROBE_USER_MESSAGES.http500,
      QUICK_PROBE_USER_MESSAGES.noToken,
      QUICK_PROBE_USER_MESSAGES.noUrl,
    ]);
    expect(distinct.size).toBe(7);
  });

  it('SSRF-melding beholdes (allerede trygg, uten intern host)', () => {
    expect(quickProbeUserMessage(new QuickSsrfError('baseUrl må bruke https'))).toBe(
      'baseUrl må bruke https',
    );
  });
});
