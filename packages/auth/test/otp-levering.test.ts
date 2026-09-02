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

describe('sendTwoFactorOtp — stengt (Mons)', () => {
  it('⛔ kaster alltid — e-postkode er ikke andre faktor', async () => {
    process.env.NODE_ENV = 'development';
    process.env.RESEND_API_KEY = '';
    const { sendTwoFactorOtp } = await last();
    await expect(sendTwoFactorOtp('mikkis@twofold.no', '123456')).rejects.toThrow(
      /ikke andre faktor/,
    );
  });

  it('⛔ kaster også i prod', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RESEND_API_KEY = 'test-nokkel';
    const { sendTwoFactorOtp } = await last();
    await expect(sendTwoFactorOtp('mikkis@twofold.no', '999999')).rejects.toThrow(
      /ikke andre faktor/,
    );
  });
});
