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

  it('leftover two_factor-kake etter Fortsett (steg=valg) er venteskjerm, ikke totp', () => {
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

  it('steg=totp + kake er totp; steg=totp uten kake er venteskjerm', () => {
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

  it('kodefeltet er input-only — Logg inn sitter ikke i samme form/boks', () => {
    const form = kilde.match(/<form[^>]*onSubmit=\{onSkrivKodeManuelt\}[\s\S]*?<\/form>/)?.[0];
    expect(form).toBeTruthy();
    expect(form).toContain('signin-magic-kode');
    expect(form).not.toContain('SIGNIN_VALG_LOGG_INN');
    expect(form).not.toContain('StatefulButton');
    expect(form).not.toMatch(/type=["']submit["']/);
  });

  it('Logg inn er fullbredde-stakk rett over Send på nytt', () => {
    const sendIdx = kilde.indexOf('{SIGNIN_VALG_SEND_NYTT}');
    const stakkStart = kilde.lastIndexOf('flex flex-col gap-2 px-1.5', sendIdx);
    const stakk = kilde.slice(
      stakkStart,
      kilde.indexOf('</StatefulButton>', sendIdx) + '</StatefulButton>'.length,
    );
    expect(stakk).toContain('SIGNIN_VALG_LOGG_INN');
    expect(stakk.indexOf('SIGNIN_VALG_LOGG_INN')).toBeLessThan(
      stakk.indexOf('SIGNIN_VALG_SEND_NYTT'),
    );
    expect(stakk).toMatch(/form=["']signin-manuell-kode["']/);
    const logg = stakk.match(
      /<StatefulButton[\s\S]*?SIGNIN_VALG_LOGG_INN[\s\S]*?<\/StatefulButton>/,
    )?.[0];
    const send = stakk.match(
      /<StatefulButton[\s\S]*?SIGNIN_VALG_SEND_NYTT[\s\S]*?<\/StatefulButton>/,
    )?.[0];
    expect(logg).toMatch(/className="w-full"/);
    expect(send).toMatch(/className="w-full"/);
  });

  it('Send på nytt animerer ikke når Logg inn er pending', () => {
    const knapper = [...kilde.matchAll(/<StatefulButton[\s\S]*?<\/StatefulButton>/g)].map(
      (m) => m[0],
    );
    const logg = knapper.find((k) => k.includes('SIGNIN_VALG_LOGG_INN'));
    const send = knapper.find((k) => k.includes('SIGNIN_VALG_SEND_NYTT'));
    expect(logg).toBeTruthy();
    expect(send).toBeTruthy();
    const loggState = logg?.match(/state=\{([^}]+)\}/)?.[1];
    const sendState = send?.match(/state=\{([^}]+)\}/)?.[1];
    expect(loggState).toBeTruthy();
    expect(sendState).toBeTruthy();
    expect(loggState).not.toBe(sendState);
    expect(logg).not.toMatch(/state=\{busy\}/);
    expect(send).not.toMatch(/state=\{busy\}/);
    expect(kilde).toMatch(/onSkrivKodeManuelt[\s\S]*setHandling\('logg-inn'\)/);
    expect(kilde).toMatch(/onSendPaNytt[\s\S]*sendLenke\([^)]*'send-nytt'/);
  });

  it('Fortsett / Send på nytt full-laster venteskjerm så leftover totpKlar ikke snapper', () => {
    expect(kilde).toMatch(/location\.assign\(SIGNIN_VALG_STI\)/);
    expect(kilde).toMatch(/flateEtterMagicLinkLanding/);
    expect(kilde).toMatch(/totpKlar/);
    expect(kilde).not.toMatch(/document\.cookie/);
    expect(kilde).not.toMatch(/lesTotpVindu/);
  });

  it('Bytt konto tømmer HttpOnly-kaker og full-laster epost-flaten', () => {
    expect(kilde).toMatch(/async function byttKonto/);
    expect(kilde).toMatch(/location\.assign\(SIGNIN_STI\)/);
    expect(kilde).toMatch(/signOut/);
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
