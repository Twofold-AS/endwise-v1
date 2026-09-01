import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  flateEtterMagicLinkLanding,
  harEnrollVindu,
  harTotpVindu,
  meldingForTotpFeil,
  SIGNIN_STI,
  SIGNIN_TOTP_STI,
  SIGNIN_VALG_BYTT_KONTO,
  SIGNIN_VALG_LOGG_INN,
  SIGNIN_VALG_SEND_NYTT,
  SIGNIN_VALG_SKRIV_KODE,
  SIGNIN_VALG_STI,
  SIGNIN_VENT_TITTEL,
  signInFlateFraQuery,
  skalViseErstattetMelding,
} from '../app/signin/signin-steg.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('signin-steg: venteskjerm etter e-post, TOTP bare med kake', () => {
  it('tom query er e-postflaten; totp uten kake er venteskjerm', () => {
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

  it('kanoniske stier og venteskjerm-tekst', () => {
    expect(SIGNIN_STI).toBe('/signin');
    expect(SIGNIN_VALG_STI).toBe('/signin?steg=valg');
    expect(SIGNIN_TOTP_STI).toBe('/signin?steg=totp');
    expect(SIGNIN_VENT_TITTEL).toBe('Trykk på lenken i e-posten');
    expect(SIGNIN_VALG_SKRIV_KODE).toBe('Skriv kode manuelt');
    expect(SIGNIN_VALG_BYTT_KONTO).toBe('Bytt konto');
    expect(SIGNIN_VALG_LOGG_INN).toBe('Logg inn');
    expect(SIGNIN_VALG_SEND_NYTT).toBe('Send på nytt');
  });

  it('enroll-kake gjenkjennes separat fra two_factor', () => {
    expect(harEnrollVindu('endwise.enroll_2fa=abc')).toBe(true);
    expect(harEnrollVindu('__Secure-endwise.enroll_2fa=abc')).toBe(true);
    expect(harEnrollVindu('__Host-endwise.enroll_2fa=abc')).toBe(true);
    expect(harEnrollVindu('enroll_2fa=abc')).toBe(true);
    expect(harEnrollVindu('endwise.two_factor=abc')).toBe(false);
    expect(harEnrollVindu('')).toBe(false);
  });

  it('klikk-landing: HttpOnly-kake slår venteskjerm og error-query', () => {
    expect(flateEtterMagicLinkLanding({ steg: 'totp', totpKlar: true, enrollKlar: false })).toBe(
      'totp',
    );
    expect(flateEtterMagicLinkLanding({ steg: null, totpKlar: true, enrollKlar: false })).toBe(
      'totp',
    );
    expect(
      flateEtterMagicLinkLanding({
        steg: 'valg',
        feil: 'INVALID_TOKEN',
        totpKlar: true,
        enrollKlar: false,
      }),
    ).toBe('totp');
    expect(
      flateEtterMagicLinkLanding({
        steg: 'valg',
        feil: 'INVALID_TOKEN',
        totpKlar: false,
        enrollKlar: true,
      }),
    ).toBe('enroll');
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

describe('signin-skjema: venteskjerm, ingen dobbel manuell, ingen TOTP-vegg', () => {
  const kilde = readFileSync(resolve(her, '../app/signin/signin-skjema.tsx'), 'utf8');

  it('venteskjerm etter Fortsett — heading og de to valgene', () => {
    expect(kilde).toMatch(/SIGNIN_VENT_TITTEL|Trykk på lenken i e-posten/);
    expect(kilde).toContain('SIGNIN_VALG_SKRIV_KODE');
    expect(kilde).toContain('SIGNIN_VALG_BYTT_KONTO');
    expect(kilde).not.toMatch(/Logg inn med magiclink/);
    expect(kilde).not.toMatch(/Sjekk e-posten/);
  });

  it('Skriv kode manuelt står ett sted — ikke gruppert felt + samme knapp', () => {
    expect(kilde).toContain('setManuell(true)');
    expect(kilde).toContain('SIGNIN_VALG_LOGG_INN');
    expect(kilde).not.toMatch(/XXXX-XXXX-XXXX/);
    expect(kilde).toMatch(/\{!manuell && \(/);
  });

  it('Fortsett går til valg, aldri totp — totp krever server-lest two_factor-kake', () => {
    expect(kilde).toMatch(/setFlate\('valg'\)/);
    expect(kilde).toMatch(/settStegIUrl\('valg'\)/);
    expect(kilde).toMatch(/flateEtterMagicLinkLanding/);
    expect(kilde).toMatch(/totpKlar/);
    expect(kilde).not.toMatch(/document\.cookie/);
    expect(kilde).not.toMatch(/lesTotpVindu/);
  });

  it('venteskjerm fyrer ikke magic-link på mount — bare Fortsett / Send på nytt', () => {
    const effekter = [...kilde.matchAll(/useEffect\(([\s\S]*?)\n {2}\},/g)].map((m) => m[1] ?? '');
    expect(effekter.join('\n')).not.toMatch(/signIn\.magicLink/);
    expect(kilde).toMatch(/async function sendLenke/);
    expect(kilde).toMatch(/SIGNIN_VALG_SEND_NYTT|Send på nytt/);
    expect(kilde).toMatch(/signIn\.magicLink/);
  });

  it('error-query med totp-kake går ikke tilbake til venteskjerm', () => {
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

  it('force-dynamic + cookies — enroll-kake går til /2fa-oppsett', () => {
    expect(side).toMatch(/force-dynamic/);
    expect(side).toMatch(/revalidate\s*=\s*0/);
    expect(side).toMatch(/fetchCache\s*=\s*['"]force-no-store['"]/);
    expect(side).toMatch(/cookies\(/);
    expect(side).toMatch(/harTotpVindu/);
    expect(side).toMatch(/harEnrollVindu/);
    expect(side).toMatch(/totpKlar/);
    expect(side).toMatch(/redirect\((SIGNIN_ENROLL_STI|['"]\/2fa-oppsett['"])/);
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
