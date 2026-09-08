import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  flateEtterMagicLinkLanding,
  harEnrollVindu,
  harTotpVindu,
  meldingForTotpFeil,
  SIGNIN_FORTSETT,
  SIGNIN_FYLL_KODE,
  SIGNIN_IKKE_DEG,
  SIGNIN_KODE_INGRESS,
  SIGNIN_STI,
  SIGNIN_TITTEL,
  SIGNIN_TOTP_STI,
  SIGNIN_VALG_STI,
  SIGNIN_VILKAR,
  SIGNIN_VILKAR_STI,
  signInFlateFraQuery,
  skalViseErstattetMelding,
} from '../app/signin/signin-steg.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('signin-steg: kode-steg etter e-post, TOTP bare med kake', () => {
  it('tom query er e-postflaten; totp uten kake er kode-steg', () => {
    expect(signInFlateFraQuery(null)).toBe('epost');
    expect(signInFlateFraQuery('valg')).toBe('valg');
    expect(signInFlateFraQuery('sendt')).toBe('valg');
    expect(signInFlateFraQuery('totp')).toBe('valg');
    expect(signInFlateFraQuery('totp', { totpKlar: false })).toBe('valg');
    expect(signInFlateFraQuery('totp', { totpKlar: true })).toBe('totp');
  });

  it('two_factor-kake gjenkjennes, two_factor_enabled gjør det ikke', () => {
    expect(harTotpVindu('endwise.two_factor=abc')).toBe(true);
    expect(harTotpVindu('__Secure-endwise.two_factor=abc')).toBe(true);
    expect(harTotpVindu('__Host-endwise.two_factor=abc')).toBe(true);
    expect(harTotpVindu('foo.bar.two_factor=abc')).toBe(true);
    expect(harTotpVindu('two_factor=abc')).toBe(true);
    expect(harTotpVindu('endwise.session=x')).toBe(false);
    expect(harTotpVindu('two_factor_enabled=1')).toBe(false);
    expect(harTotpVindu('')).toBe(false);
  });

  it('TOTP-feil er norsk — aldri «TOTP not enabled»', () => {
    expect(meldingForTotpFeil({ code: 'TOTP_NOT_ENABLED', message: 'TOTP not enabled' })).toMatch(
      /Autentikator er ikke satt opp/,
    );
    expect(meldingForTotpFeil({ message: 'TOTP not enabled' })).not.toMatch(/TOTP not enabled/);
    expect(meldingForTotpFeil({ message: 'wrong' })).toMatch(/app-kode/);
  });

  it('kanoniske stier og Mobbin-copy', () => {
    expect(SIGNIN_STI).toBe('/signin');
    expect(SIGNIN_VALG_STI).toBe('/signin?steg=valg');
    expect(SIGNIN_TOTP_STI).toBe('/signin?steg=totp');
    expect(SIGNIN_TITTEL).toBe('Velkommen tilbake');
    expect(SIGNIN_KODE_INGRESS).toBe('Vi har sendt en midlertidig kode til');
    expect(SIGNIN_IKKE_DEG).toBe('Ikke deg?');
    expect(SIGNIN_FYLL_KODE).toBe('Fyll inn kode');
    expect(SIGNIN_FORTSETT).toBe('Fortsett');
    expect(SIGNIN_VILKAR).toMatch(/vilkårene/);
    expect(SIGNIN_VILKAR_STI).toBe('/vilkar');
  });

  it('enroll-kake gjenkjennes separat fra two_factor', () => {
    expect(harEnrollVindu('endwise.enroll_2fa=abc')).toBe(true);
    expect(harEnrollVindu('__Secure-endwise.enroll_2fa=abc')).toBe(true);
    expect(harEnrollVindu('__Host-endwise.enroll_2fa=abc')).toBe(true);
    expect(harEnrollVindu('enroll_2fa=abc')).toBe(true);
    expect(harEnrollVindu('endwise.two_factor=abc')).toBe(false);
    expect(harEnrollVindu('')).toBe(false);
  });

  it('leftover two_factor-kake etter Fortsett (steg=valg) er kode-steg, ikke totp', () => {
    expect(flateEtterMagicLinkLanding({ steg: 'valg', totpKlar: true, enrollKlar: false })).toBe(
      'valg',
    );
    expect(
      flateEtterMagicLinkLanding({
        steg: 'valg',
        feil: 'INVALID_TOKEN',
        totpKlar: true,
        enrollKlar: false,
      }),
    ).toBe('valg');
    expect(flateEtterMagicLinkLanding({ steg: null, totpKlar: true, enrollKlar: false })).toBe(
      'epost',
    );
  });

  it('steg=totp + kake er totp; steg=totp uten kake er kode-steg', () => {
    expect(flateEtterMagicLinkLanding({ steg: 'totp', totpKlar: true, enrollKlar: false })).toBe(
      'totp',
    );
    expect(
      flateEtterMagicLinkLanding({
        steg: 'totp',
        totpKlar: false,
        enrollKlar: false,
      }),
    ).toBe('valg');
    expect(
      flateEtterMagicLinkLanding({
        feil: 'INVALID_TOKEN',
        totpKlar: false,
        enrollKlar: false,
      }),
    ).toBe('valg');
  });

  it('leftover enroll-kake er aldri 307 /2fa-oppsett — TOTP er senere opt-in', () => {
    expect(flateEtterMagicLinkLanding({ steg: 'valg', totpKlar: false, enrollKlar: true })).toBe(
      'valg',
    );
    expect(flateEtterMagicLinkLanding({ steg: null, totpKlar: false, enrollKlar: true })).toBe(
      'epost',
    );
    expect(
      flateEtterMagicLinkLanding({
        steg: 'valg',
        feil: 'INVALID_TOKEN',
        totpKlar: false,
        enrollKlar: true,
      }),
    ).toBe('valg');
    expect(flateEtterMagicLinkLanding({ steg: 'totp', totpKlar: false, enrollKlar: true })).toBe(
      'valg',
    );
  });

  it('forbrukt lenke uten kake viser erstattet-melding, ikke stille venteskjerm', () => {
    expect(
      skalViseErstattetMelding({
        steg: 'totp',
        totpKlar: false,
        enrollKlar: false,
      }),
    ).toBe(true);
    expect(
      skalViseErstattetMelding({
        feil: 'INVALID_TOKEN',
        totpKlar: false,
        enrollKlar: false,
      }),
    ).toBe(true);
    expect(skalViseErstattetMelding({ steg: 'valg', totpKlar: false, enrollKlar: false })).toBe(
      false,
    );
    expect(skalViseErstattetMelding({ steg: 'totp', totpKlar: true, enrollKlar: false })).toBe(
      false,
    );
  });
});

describe('signin-skjema: Mobbin e-post + 5-sifret kode, ingen TOTP-vegg', () => {
  const kilde = readFileSync(resolve(her, '../app/signin/signin-skjema.tsx'), 'utf8');
  const merke = readFileSync(resolve(her, '../app/_auth/merke.tsx'), 'utf8');
  const felt = readFileSync(resolve(her, '../app/_auth/felter.tsx'), 'utf8');

  it('innhold på lerret uten ytterkort, horisontalt sentrert, litt over midten', () => {
    expect(kilde).toMatch(/items-center justify-center/);
    expect(kilde).toMatch(/pb-\[14vh\]/);
    expect(kilde).not.toMatch(/pt-8 pb-16/);
    expect(kilde).not.toMatch(/rounded-\[24px\]/);
    expect(kilde).not.toMatch(/border-\[var\(--ew-border-strong\)\]/);
    expect(kilde).not.toMatch(/data-auth-kort/);
    expect(kilde).not.toMatch(/bg-card/);
    expect(kilde).toMatch(/text-\[32px\].*font-\[650\]/);
    expect(kilde).toMatch(/SIGNIN_TITTEL|Velkommen tilbake/);
    expect(kilde).not.toMatch(/Logg inn på Endwise/);
    expect(kilde).not.toMatch(/Logg inn på['"]/);
  });

  it('logo har mer luft over og under', () => {
    expect(kilde).toMatch(/mt-8 mb-10/);
  });

  it('Fortsett har mer vertikal padding enn h-control', () => {
    expect(kilde).toMatch(/AUTH_FORTSETT = 'h-auto w-full py-4'/);
    expect(kilde).toMatch(/className=\{AUTH_FORTSETT\}/);
  });

  it('logo er token-aware (mask + bg-fg), ikke svart Image', () => {
    expect(kilde).toMatch(/AuthMerke/);
    expect(kilde).not.toMatch(/next\/image/);
    expect(kilde).not.toMatch(/logo\/logo\.svg/);
    expect(merke).toMatch(/maskImage:\s*['"]url\(\/logo\/logo\.svg\)['"]/);
    expect(merke).toMatch(/bg-fg/);
  });

  it('felt er Mobbin-fyll #f0f0f0 / 16px, 2px hvit kant i fokus', () => {
    expect(felt).toMatch(/bg-inset/);
    expect(felt).toMatch(/rounded-\[16px\]/);
    expect(felt).toMatch(/min-h-\[52px\]/);
    expect(felt).toMatch(/border-2/);
    expect(felt).toMatch(/focus:border-white/);
    expect(felt).toMatch(/0_0_0_2px_#ffffff/);
    expect(felt).toMatch(/focus-visible:border-white/);
    expect(felt).not.toMatch(/outline-\[3px\]/);
    expect(felt).not.toMatch(/h-control rounded-control border border-border bg-bg/);
  });

  it('Fortsett har pil, ikke konvolutt — spinner via StatefulButton loading', () => {
    expect(kilde).toMatch(/ArrowRight/);
    expect(kilde).not.toMatch(/\bMail\b/);
    expect(kilde).toMatch(/SIGNIN_FORTSETT/);
    expect(kilde).toMatch(/loadingText=/);
    expect(kilde).toMatch(/<StatefulButton[\s\S]*state=\{knappState\('fortsett'\)\}/);
    expect(kilde).toMatch(/<StatefulButton[\s\S]*state=\{knappState\('logg-inn'\)\}/);
  });

  it('vilkår-linje peker på eksisterende /vilkar', () => {
    expect(kilde).toMatch(/SIGNIN_VILKAR/);
    expect(kilde).toMatch(/SIGNIN_VILKAR_STI/);
    expect(kilde).toMatch(/Vilkår/);
  });

  it('kode-steg: heading, e-post, Ikke deg, ett 5-sifret felt — ikke OTP-bokser', () => {
    expect(kilde).toMatch(/data-auth-kode-steg/);
    expect(kilde).toMatch(/SIGNIN_KODE_INGRESS/);
    expect(kilde).toMatch(/SIGNIN_IKKE_DEG/);
    expect(kilde).toMatch(/SIGNIN_FYLL_KODE/);
    expect(kilde).toMatch(/maxLength=\{5\}/);
    expect(kilde).toMatch(/erMagicLinkKode/);
    expect(kilde).not.toMatch(/otp-slot|OTPInput|InputOTP/);
    expect(kilde).not.toMatch(/ABCD-EFGH/);
    expect(kilde).not.toMatch(/Skriv kode manuelt/);
    expect(kilde).not.toMatch(/Trykk på lenken i e-posten/);
  });

  it('kodefelt og Fortsett sitter i samme form — spinner på verify', () => {
    const form = kilde.match(/data-auth-kode-steg[\s\S]*?<\/form>/)?.[0];
    expect(form).toBeTruthy();
    expect(form).toContain('signin-magic-kode');
    expect(form).toContain('SIGNIN_FORTSETT');
    expect(form).toContain('StatefulButton');
    expect(form).toMatch(/type=["']submit["']/);
    expect(form).toMatch(/knappState\('logg-inn'\)/);
  });

  it('Fortsett / kode-steg full-laster så leftover totpKlar ikke snapper', () => {
    expect(kilde).toMatch(/location\.assign\(SIGNIN_VALG_STI\)/);
    expect(kilde).toMatch(/flateEtterMagicLinkLanding/);
    expect(kilde).toMatch(/totpKlar/);
    expect(kilde).not.toMatch(/document\.cookie/);
    expect(kilde).not.toMatch(/lesTotpVindu/);
  });

  it('Ikke deg tømmer HttpOnly-kaker og full-laster epost-flaten', () => {
    expect(kilde).toMatch(/async function byttKonto/);
    expect(kilde).toMatch(/location\.assign\(SIGNIN_STI\)/);
    expect(kilde).toMatch(/signOut/);
    expect(kilde).toMatch(/SIGNIN_IKKE_DEG/);
  });

  it('kode-steg fyrer ikke magic-link på mount — bare Fortsett på e-post', () => {
    const effekter = [...kilde.matchAll(/useEffect\(([\s\S]*?)\n {2}\},/g)].map((m) => m[1] ?? '');
    expect(effekter.join('\n')).not.toMatch(/signIn\.magicLink/);
    expect(kilde).toMatch(/async function sendLenke/);
    expect(kilde).toMatch(/signIn\.magicLink/);
  });

  it('error-query med totp-kake går ikke tilbake til kode-steg', () => {
    expect(kilde).not.toMatch(/if \(feilQuery\) \{\s*setFlate\('valg'\)/);
    expect(kilde).toMatch(/flateEtterMagicLinkLanding/);
  });

  it('ingen engelsk TOTP-feil og primærknapp er ikke Feil kode', () => {
    expect(kilde).toMatch(/meldingForTotpFeil/);
    expect(kilde).not.toMatch(/TOTP not enabled/);
    expect(kilde).not.toMatch(/errorText=["']Feil kode["']/);
    expect(kilde).toMatch(/errorText=["']Prøv igjen["']/);
  });

  it('manuell kode treffer samme verify-sti som e-postlenka', () => {
    expect(kilde).toMatch(/magicLinkVerifySti/);
    expect(kilde).toMatch(/normaliserMagicLinkKode/);
    expect(kilde).toMatch(/callbackURL:\s*['"]\/signin['"]/);
    expect(kilde).not.toMatch(/searchParams\.get\(['"]next['"]\)/);
    expect(kilde).not.toMatch(/type=["']password["']/);
    expect(kilde).not.toMatch(/verifyOtp|sendOtp/);
  });

  it('stale-lenke viser erstattet-melding, ikke trykk på linken først', () => {
    expect(kilde).toMatch(/meldingForMagicLinkFeil/);
    expect(kilde).toMatch(/skalViseErstattetMelding/);
    expect(kilde).not.toMatch(/trykk på linken først/i);
    expect(kilde).not.toMatch(/Innloggingslenken må åpnes først/);
  });
});

describe('signin-side: server leser HttpOnly-kaker etter verify', () => {
  const side = readFileSync(resolve(her, '../app/signin/page.tsx'), 'utf8');

  it('force-dynamic + cookies — ingen 307 /2fa-oppsett av leftover enroll-kake', () => {
    expect(side).toMatch(/force-dynamic/);
    expect(side).toMatch(/revalidate\s*=\s*0/);
    expect(side).toMatch(/fetchCache\s*=\s*['"]force-no-store['"]/);
    expect(side).toMatch(/cookies\(/);
    expect(side).toMatch(/searchParams/);
    expect(side).toMatch(/harTotpVindu/);
    expect(side).toMatch(/totpKlar/);
    expect(side).not.toMatch(/redirect\(SIGNIN_ENROLL_STI/);
  });
});

describe('auth-sider er ukachebare (ikke prerender på branch-alias)', () => {
  const nextCfg = readFileSync(resolve(her, '../next.config.ts'), 'utf8');
  const proxy = readFileSync(resolve(her, '../proxy.ts'), 'utf8');
  const oppsett = `${readFileSync(resolve(her, '../app/2fa-oppsett/page.tsx'), 'utf8')}\n${readFileSync(resolve(her, '../app/2fa-oppsett/layout.tsx'), 'utf8')}`;

  it('next.config og proxy setter Cache-Control no-store på /signin /2fa-oppsett /api/auth', () => {
    expect(nextCfg).toMatch(/private, no-store, no-cache, must-revalidate/);
    expect(nextCfg).toMatch(/\/signin/);
    expect(nextCfg).toMatch(/\/2fa-oppsett/);
    expect(nextCfg).toMatch(/\/api\/auth/);
    expect(proxy).toMatch(/private, no-store, no-cache, must-revalidate/);
    expect(proxy).toMatch(/Vercel-CDN-Cache-Control|CDN-Cache-Control/);
    expect(proxy).toMatch(/\/signin/);
    expect(proxy).toMatch(/\/2fa-oppsett/);
    expect(proxy).toMatch(/\/api\/auth/);
  });

  it('/2fa-oppsett er force-dynamic, ikke prerender', () => {
    expect(oppsett).toMatch(/force-dynamic/);
    expect(oppsett).toMatch(/revalidate\s*=\s*0/);
    expect(oppsett).toMatch(/fetchCache\s*=\s*['"]force-no-store['"]/);
  });
});
