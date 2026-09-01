import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  avsenderErKanonisk,
  erEnkelEpost,
  produktAvsender,
  RESEND_FROM_KANONISK,
  stripCrLf,
} from '../src/resend-avsender.ts';
import { byggEnrollIdentifier, byggEnrollSesjon, erEnrollIdentifier } from '../src/enroll.ts';
import { erProduktDestinasjon } from '../src/produkt-destinasjon.ts';
import { krevFerskTotpFraBody, TOTP_STEP_UP_KODE } from '../src/totp-steg.ts';
import { verifiserTotpKode } from '../src/totp-verify.ts';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OPPRINNELIG = { ...process.env };

afterEach(() => {
  process.env = { ...OPPRINNELIG };
});

describe('produktAvsender', () => {
  it('er nøyaktig Endwise <noreply@endwise.no>', () => {
    expect(RESEND_FROM_KANONISK).toBe('Endwise <noreply@endwise.no>');
    expect(RESEND_FROM_KANONISK).not.toMatch(/no-reply@endwise\.no/);
    expect(RESEND_FROM_KANONISK).not.toMatch(/no-reply\.endwise\.no/);
    expect(avsenderErKanonisk(RESEND_FROM_KANONISK)).toBe(true);
    expect(avsenderErKanonisk('Endwise <no-reply@endwise.no>')).toBe(false);
  });

  it('⛔ prod ignorerer RESEND_FROM', () => {
    process.env.NODE_ENV = 'production';
    process.env.RESEND_FROM = 'Hacker <evil@evil.no>';
    expect(produktAvsender()).toBe(RESEND_FROM_KANONISK);
  });

  it('⛔ ikke-prod avviser avvikende RESEND_FROM', () => {
    process.env.NODE_ENV = 'test';
    process.env.RESEND_FROM = 'Endwise <no-reply@endwise.no>';
    expect(() => produktAvsender()).toThrow(/noreply@endwise\.no/);
  });
});

describe('epost-vakt', () => {
  it('avviser flere mottakere og CR/LF', () => {
    expect(erEnkelEpost('a@b.no')).toBe(true);
    expect(erEnkelEpost('a@b.no,c@d.no')).toBe(false);
    expect(erEnkelEpost('a@b.no\nbcc:x@y.no')).toBe(false);
    expect(stripCrLf('Hei\r\nBcc: x')).toBe('Hei Bcc: x');
  });
});

describe('enroll-kake', () => {
  it('identifier er enroll-prefiks, sesjonen har ingen ekte token-kake', () => {
    expect(erEnrollIdentifier(byggEnrollIdentifier('abc'))).toBe(true);
    expect(erEnrollIdentifier('2fa-abc')).toBe(false);
    const sesjon = byggEnrollSesjon({ id: 'u1', email: 'a@b.no' });
    expect(sesjon.session.token.startsWith('enroll-token-')).toBe(true);
    expect(sesjon.user.id).toBe('u1');
  });
});

describe('TOTP step-up', () => {
  it('⛔ uten 6-sifret totp kaster TOTP_STEP_UP_REQUIRED', () => {
    expect(() => krevFerskTotpFraBody({})).toThrow();
    expect(() => krevFerskTotpFraBody({ totp: '12' })).toThrow();
    try {
      krevFerskTotpFraBody({ totp: '' });
    } catch (error) {
      expect((error as { body?: { code?: string } }).body?.code).toBe(TOTP_STEP_UP_KODE);
    }
  });

  it('godtar 6 siffer', () => {
    expect(krevFerskTotpFraBody({ totp: '482913' })).toBe('482913');
  });

  it('verifiserTotpKode matcher HMAC-SHA1 periode 30 vindu ±1', () => {
    const hemmelighet = 'endwise-totp-test-secret';
    const counter = Math.floor(Date.now() / 30_000);
    const teller = Buffer.alloc(8);
    teller.writeBigUInt64BE(BigInt(counter));
    const hmac = createHmac('sha1', hemmelighet).update(teller).digest();
    const offset = hmac[hmac.length - 1]! & 15;
    const trunkert =
      ((hmac[offset]! & 127) << 24) |
      ((hmac[offset + 1]! & 255) << 16) |
      ((hmac[offset + 2]! & 255) << 8) |
      (hmac[offset + 3]! & 255);
    const kode = (trunkert % 1_000_000).toString().padStart(6, '0');
    expect(verifiserTotpKode(hemmelighet, kode)).toBe(true);
    expect(verifiserTotpKode(hemmelighet, '000000')).toBe(false);
  });
});

describe('åpen send er stengt', () => {
  const her = dirname(fileURLToPath(import.meta.url));

  it('sendEmail kaller avsenderErVerifisert og avviser from', () => {
    const kilde = readFileSync(resolve(her, '../src/senders/resend.ts'), 'utf8');
    expect(kilde).toMatch(/avsenderErVerifisert/);
    expect(kilde).toMatch(/avsenderErKanonisk/);
    expect(kilde).toMatch(/from settes ikke av kalleren/);
    expect(kilde).toMatch(/RESEND_FROM_KANONISK/);
    expect(kilde).toMatch(/sendTwoFactorOtp[\s\S]*Promise<never>/);
    expect(kilde).toMatch(/sendPasswordReset[\s\S]*Promise<never>/);
    expect(kilde).not.toMatch(/sett passord/i);
  });

  it('magic-link fyrer bare mot produkt-destinasjon', () => {
    const auth = readFileSync(resolve(her, '../src/auth.ts'), 'utf8');
    expect(auth).toMatch(/erProduktDestinasjon\(db, email\)/);
  });

  it('ingen tRPC tar imot to/from/html/replyTo fra klienten', () => {
    const messages = readFileSync(
      resolve(her, '../../../apps/api/src/trpc/routers/messages.ts'),
      'utf8',
    );
    expect(messages).not.toMatch(/from:\s*z\./);
    expect(messages).not.toMatch(/html:\s*z\./);
    expect(messages).not.toMatch(/replyTo:\s*z\./);
    expect(messages).toMatch(/erKjentKundeKontakt/);
  });

  it('ugyldig e-post er aldri produkt-destinasjon', async () => {
    await expect(erProduktDestinasjon({} as never, 'ikke-en-epost')).resolves.toBe(false);
    await expect(erProduktDestinasjon({} as never, 'a@b.no,c@d.no')).resolves.toBe(false);
  });
});
