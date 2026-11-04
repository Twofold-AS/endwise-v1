import { describe, expect, it } from 'vitest';
import {
  BEDRIFT_ABSOLUTE_SECONDS,
  BEDRIFT_CSRF_HEADER,
  BEDRIFT_IDLE_SECONDS,
  bedriftUtloperAt,
  byggDealerCsp,
  byggSesjonKake,
  erBedriftVinduAktiv,
  forhandlerCookieAttributter,
  harBedriftCsrf,
  kanAapneBedrift,
  landingEtterKode,
} from '../src/kontekst.ts';
import { MAGIC_LINK_APP_LANDING, MAGIC_LINK_ENROLL_STI } from '../src/magic-link.ts';
import { etterMagicLinkVerify } from '../src/magic-link-2fa.ts';

describe('F26 / white label F7: Privat/Bedrift', () => {
  it('Bedrift-vindu er 30 min idle og 10 t absolutt', () => {
    expect(BEDRIFT_IDLE_SECONDS).toBe(30 * 60);
    expect(BEDRIFT_ABSOLUTE_SECONDS).toBe(10 * 60 * 60);
    const now = new Date('2026-11-03T12:00:00Z');
    const ut = bedriftUtloperAt(now, now);
    expect(ut.getTime() - now.getTime()).toBe(30 * 60 * 1000);
  });

  it('utløpt vindu er ikke Bedrift', () => {
    const now = new Date('2026-11-03T12:00:00Z');
    expect(
      erBedriftVinduAktiv({
        kontekst: 'bedrift',
        verifisertAt: now,
        utloperAt: new Date(now.getTime() - 1000),
        now,
      }),
    ).toBe(false);
    expect(
      erBedriftVinduAktiv({
        kontekst: 'privat',
        verifisertAt: now,
        utloperAt: new Date(now.getTime() + 60_000),
        now,
      }),
    ).toBe(false);
  });

  it('landing: kunde → min-side, app-ansatt → 2FA eller home', () => {
    expect(landingEtterKode({ harRolle: false, totpBundet: false, whiteLabel: true })).toBe(
      '/min-side',
    );
    expect(
      landingEtterKode({
        harRolle: true,
        totpBundet: false,
        whiteLabel: true,
        sone: 'forhandler',
      }),
    ).toBe('/min-side');
    expect(
      landingEtterKode({ harRolle: true, totpBundet: false, whiteLabel: true, sone: 'app' }),
    ).toBe('/2fa-oppsett');
    expect(
      landingEtterKode({ harRolle: true, totpBundet: true, whiteLabel: true, sone: 'app' }),
    ).toBe('/home');
    expect(landingEtterKode({ harRolle: true, totpBundet: true, whiteLabel: false })).toBe('/');
  });

  it('Bedrift krever rolle og TOTP', () => {
    expect(kanAapneBedrift({ harRolle: true, totpBundet: true })).toBe(true);
    expect(kanAapneBedrift({ harRolle: true, totpBundet: false })).toBe(false);
    expect(kanAapneBedrift({ harRolle: false, totpBundet: true })).toBe(false);
  });

  it('CSRF-header er krevd og fast', () => {
    expect(harBedriftCsrf(new Headers({ [BEDRIFT_CSRF_HEADER]: '1' }))).toBe(true);
    expect(harBedriftCsrf(new Headers())).toBe(false);
    expect(harBedriftCsrf(new Headers({ [BEDRIFT_CSRF_HEADER]: 'nei' }))).toBe(false);
  });

  it('cookie er Host-lås: Path=/ HttpOnly SameSite=Lax uten Domain', () => {
    const prod = forhandlerCookieAttributter(true);
    expect(prod.path).toBe('/');
    expect(prod.httpOnly).toBe(true);
    expect(prod.secure).toBe(true);
    expect(prod.sameSite).toBe('lax');
    expect(prod.prefix).toBe('__Host-');
    const kake = byggSesjonKake({ token: 'abc', prod: true, maxAgeSekunder: 1800 });
    expect(kake).toMatch(/^__Host-endwise\.session_token=abc/);
    expect(kake).toMatch(/Path=\//);
    expect(kake).toMatch(/HttpOnly/);
    expect(kake).toMatch(/SameSite=Lax/);
    expect(kake).toMatch(/Secure/);
    expect(kake).not.toMatch(/Domain=/);
  });

  it('dealer-CSP har nonce og ingen HTML/JS fra fremmed', () => {
    const csp = byggDealerCsp('abc123');
    expect(csp).toContain("'nonce-abc123'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('magic-link uten WL er uendret; med WL ingen TOTP-mur på kode', () => {
    expect(etterMagicLinkVerify(false)).toEqual({
      handling: 'behold-sesjon',
      dest: MAGIC_LINK_APP_LANDING,
    });
    expect(etterMagicLinkVerify(true).handling).toBe('totp-mur');
    expect(etterMagicLinkVerify(true, { aktiv: true, harRolle: true }).handling).toBe(
      'behold-sesjon',
    );
    expect(etterMagicLinkVerify(false, { aktiv: true, harRolle: true }).dest).toBe(
      MAGIC_LINK_ENROLL_STI,
    );
    expect(etterMagicLinkVerify(false, { aktiv: true, harRolle: false }).dest).toBe('/min-side');
  });
});
