import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Lokal leveranse av engangskoden.
 * Denne testen finnes fordi bekvemmeligheten «skriv koden i loggen så vi kan
 * teste lokalt» er nøyaktig den typen snarvei som overlever inn i produksjon
 * hvis ingen holder den fast. Her holdes den fast: koden skal i loggen **kun**
 * når vi ikke er i prod og Resend mangler.
 */

const OPPRINNELIG = { ...process.env };

async function last() {
  vi.resetModules();
  return import('../src/senders/resend.ts');
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...OPPRINNELIG };
});

describe('sendTwoFactorOtp — leveringsvei', () => {
  it('DEV uten Resend: koden skrives til serverloggen, ingen e-post', async () => {
    process.env.NODE_ENV = 'development';
    process.env.RESEND_API_KEY = '';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendTwoFactorOtp } = await last();
    await sendTwoFactorOtp('mikkis@twofold.no', '123456');

    const utskrift = warn.mock.calls.flat().join('\n');
    expect(utskrift).toContain('123456');
    expect(utskrift).toContain('KUN DEV');
  });

  /**
   * Den viktigste testen i fila. En feilsatt `NODE_ENV` skal ikke alene være
   * nok til at engangskoder havner i en driftslogg — derfor krever
   * dev-leveransen ogsÅ at Resend-nøkkelen mangler.
   */
  it('⛔ DEV MED Resend konfigurert: koden skrives IKKE til loggen', async () => {
    process.env.NODE_ENV = 'development';
    process.env.RESEND_API_KEY = 'test-nokkel';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendTwoFactorOtp } = await last();
    // Resend-kallet feiler (nøkkelen er tull) — det er greit. Poenget er at
    // koden ikke skal ha vært innom loggen før forsøket.
    await sendTwoFactorOtp('mikkis@twofold.no', '654321').catch(() => {});

    expect(warn.mock.calls.flat().join('\n')).not.toContain('654321');
  });

  it('⛔ PRODUKSJON uten Resend: kaster — feiler LUKKET, ingen logg-fallback', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RESEND_API_KEY = '';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendTwoFactorOtp } = await last();
    await expect(sendTwoFactorOtp('mikkis@twofold.no', '999999')).rejects.toThrow();
    expect(warn.mock.calls.flat().join('\n')).not.toContain('999999');
  });
});
