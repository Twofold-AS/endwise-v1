import { describe, expect, it } from 'vitest';
import { canvasControls, ENDWISE_FRAMER_COMPONENT } from '../src/code-source.ts';
import {
  DEFAULT_API_BASE,
  normalizeConfig,
  parseMode,
  validatePublishableKey,
  WIDGET_MODES,
} from '../src/config.ts';

describe('Framer-plugin config (F4-01/F4-09)', () => {
  it('godtar bare pk_ og avviser hemmelige nøkler', () => {
    expect(validatePublishableKey('pk_live_abc123')).toBeNull();
    expect(validatePublishableKey('sk_live_abc123')).toBe('secret');
    expect(validatePublishableKey('sk_test_abc')).toBe('secret');
    expect(validatePublishableKey('secret_abc')).toBe('secret');
    expect(validatePublishableKey('tenant-uuid')).toBe('not-publishable');
    expect(validatePublishableKey('')).toBe('empty');
  });

  it('har Booking | AI | Tracking | Webshop og default API på endwise.no', () => {
    expect(WIDGET_MODES).toEqual(['booking', 'ai', 'tracking', 'webshop']);
    expect(parseMode('webshop')).toBe('webshop');
    expect(parseMode('tull')).toBe('booking');
    expect(DEFAULT_API_BASE).toBe('https://endwise.no');
  });

  it('normaliserer uten å sende tenantId', () => {
    const ut = normalizeConfig({
      publishableKey: 'pk_live_dealer1',
      apiBase: 'https://endwise.no/',
      dealerLabel: 'Oslo MC',
      mode: 'ai',
    });
    expect(ut.ok).toBe(true);
    if (!ut.ok) return;
    expect(ut.config.apiBase).toBe('https://endwise.no');
    expect(ut.config.dealerLabel).toBe('Oslo MC');
    expect(ut.config.mode).toBe('ai');
    expect(JSON.stringify(ut.config)).not.toMatch(/tenantId|sk_/);
  });

  it('Code Component har Property Controls for alle modi og lekker ikke secrets', () => {
    expect(ENDWISE_FRAMER_COMPONENT).toMatch(/addPropertyControls/);
    expect(ENDWISE_FRAMER_COMPONENT).toMatch(/"booking", "ai", "tracking", "webshop"/);
    expect(ENDWISE_FRAMER_COMPONENT).toMatch(/pk_/);
    expect(ENDWISE_FRAMER_COMPONENT).toMatch(/rejectSecret/);
    expect(ENDWISE_FRAMER_COMPONENT).toMatch(/\/widget\/init/);
    expect(ENDWISE_FRAMER_COMPONENT).toMatch(/\/widget\/events/);
    expect(ENDWISE_FRAMER_COMPONENT).toMatch(/\/widget\/shop\/catalog/);
    expect(ENDWISE_FRAMER_COMPONENT).not.toMatch(/tenantId/);
    expect(ENDWISE_FRAMER_COMPONENT).not.toMatch(/sk_live_/);
    const controls = canvasControls({
      publishableKey: 'pk_live_x',
      apiBase: 'https://endwise.no',
      dealerLabel: 'Test',
      mode: 'booking',
      trackEvents: true,
    });
    expect(controls.publishableKey.startsWith('pk_')).toBe(true);
    expect(JSON.stringify(controls)).not.toMatch(/sk_|tenantId/);
  });
});
