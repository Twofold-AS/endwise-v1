import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ENDWISE_NAV, landingForRole, shellForBruker } from '../app/(app)/_shell/nav.ts';
import { visDemoHint } from '../lib/vis-demo-hint.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael 02.09 — uenrollert session.me er ikke twoFactorRequired', () => {
  it('session.me returnerer twoFactorRequired: false for uenrollert', () => {
    const me = les('../../api/src/trpc/routers/session.ts');
    expect(me).toMatch(/twoFactorRequired:\s*sessionMeTwoFactorRequired/);
    expect(me).not.toMatch(/twoFactorRequired:\s*true/);
  });

  it('createRequestContext svelger TWO_FACTOR og velger aktiv org (endwise først)', () => {
    const ctx = utenKommentarer(les('../../api/src/context.ts'));
    expect(ctx).toMatch(/velgAktivOrganisasjon/);
    expect(ctx).not.toMatch(/if \(error instanceof TwoFactorRequiredError\) throw error/);
    expect(ctx).toMatch(/TwoFactorRequiredError/);
  });

  it('handleTrpc mapper ikke TWO_FACTOR_REQUIRED til FORBIDDEN som tømmer UI', () => {
    const trpc = utenKommentarer(les('../../api/src/http/trpc.ts'));
    expect(trpc).not.toMatch(/TwoFactorRequiredError/);
    expect(trpc).not.toMatch(/code: 'FORBIDDEN'/);
  });

  it('SSE behandler ikke 2FA-feil som utlogget', () => {
    const sse = les('../../stream/src/app.ts');
    expect(sse).toMatch(/SessionExpiredError|TwoFactorRequiredError/);
    expect(sse).not.toMatch(/manglende 2FA \(F1-11\) ser like ut/);
  });
});

describe('Mikael 02.09 — visDemoHint er av overalt på /signin', () => {
  it('er false i preview, prod og lokal dev', () => {
    expect(visDemoHint({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })).toBe(false);
    expect(visDemoHint({ NODE_ENV: 'production', VERCEL_ENV: 'production' })).toBe(false);
    expect(visDemoHint({ NODE_ENV: 'development' })).toBe(false);
  });

  it('/signin nevner ikke seed, demo-konto eller demo-passord', () => {
    const side = utenKommentarer(les('../app/signin/page.tsx'));
    const skjema = utenKommentarer(les('../app/signin/signin-skjema.tsx'));
    expect(`${side}\n${skjema}`).not.toMatch(/pnpm db:seed/);
    expect(`${side}\n${skjema}`).not.toMatch(/[Dd]emo-konto|[Dd]emo-passord|demo accounts/i);
  });
});

describe('Mikael 02.09 — Skriv kode manuelt er sekundær', () => {
  it('er hvit/secondary som Bytt konto, ikke StatefulButton-primær', () => {
    const kilde = utenKommentarer(les('../app/signin/signin-skjema.tsx'));
    const start = kilde.indexOf('{!manuell && (');
    const slutt = kilde.indexOf('SIGNIN_VALG_SKRIV_KODE', start);
    const blokk = kilde.slice(start, slutt + 'SIGNIN_VALG_SKRIV_KODE'.length);
    expect(blokk).toContain('SIGNIN_VALG_SKRIV_KODE');
    expect(blokk).not.toMatch(/StatefulButton/);
    expect(blokk).toMatch(/border-border/);
    expect(kilde).toMatch(/StatefulButton[\s\S]*Fortsett/);
    expect(kilde).toMatch(/SIGNIN_VALG_SEND_NYTT/);
  });
});

describe('Mikael 02.09 — /2fa-oppsett copy og enable-feil', () => {
  it('nevner Microsoft Authenticator og Google Authenticator, ikke 1Password', () => {
    const side = les('../app/2fa-oppsett/page.tsx');
    expect(side).toMatch(/Microsoft Authenticator/);
    expect(side).toMatch(/Google Authenticator/);
    expect(side).not.toMatch(/1Password|Authy/);
  });

  it('enable med ekte sesjon mapper ikke «Kunne ikke bekrefte handlingen.»', () => {
    const side = les('../app/2fa-oppsett/page.tsx');
    expect(side).toMatch(/norskTotpEnableFeil/);
    expect(side).not.toMatch(/Kunne ikke bekrefte handlingen/);
  });
});

describe('Mikael 02.09 — Endwise-admin landing og nav', () => {
  it('endwise_admin og endwise_support lander på /endwise med Endwise-nav', () => {
    expect(landingForRole('endwise_admin', false)).toBe('/endwise');
    expect(landingForRole('endwise_support', false)).toBe('/endwise');
    expect(shellForBruker({ role: 'endwise_admin' })).toBe('endwise');
    expect(shellForBruker({ role: 'endwise_support' })).toBe('endwise_partner');
    expect(ENDWISE_NAV.map((i) => i.label)).toEqual([
      'Oversikt',
      'Innboks',
      'Forhandlere',
      'Team',
      'Hjelpeartikler',
      'Flagg',
    ]);
  });

  it('/ og finishSignIn setter aktiv org (endwise først) før session.me', () => {
    const rot = les('../app/page.tsx');
    const signin = les('../app/signin/signin-skjema.tsx');
    expect(rot).toMatch(/organization\.setActive|organization\.list/);
    expect(rot).toMatch(/slug === ['"]endwise['"]/);
    expect(signin).toMatch(/slug === ['"]endwise['"]/);
    expect(signin).toMatch(/organization\.setActive/);
  });

  it('dealer-ruter på plattform peker mot /endwise, ikke Verkstedet', () => {
    const vakt = les('../app/(app)/layout.tsx');
    expect(vakt).toMatch(/erForhandlerRutePaaPlattform/);
    expect(vakt).toMatch(/\/endwise/);
    expect(shellForBruker({ role: 'dealer_admin' })).toBe('forhandler');
  });
});

describe('Mikael 02.09 — desktop-sidebar er skinne, overlay bare telefon', () => {
  it('md+ er persistent rail, telefon er overlay', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(sidebar).toMatch(/md:flex/);
    expect(sidebar).toMatch(/md:static/);
    expect(sidebar).toMatch(/md:w-\[248px\]/);
    expect(sidebar).toMatch(/fixed inset-0/);
    expect(sidebar).toMatch(/hidden/);
    expect(shell).toMatch(/md:hidden/);
  });
});

describe('Mikael 02.09 — Ronny sentrert, Galaxy på Oppgrader', () => {
  it('Ronny + tekst er absolutt midtstilt i stripen på PC og telefon', () => {
    const stripe = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    expect(stripe).toMatch(/data-workshop-cluster/);
    expect(stripe).toMatch(
      /data-workshop-cluster[\s\S]{0,240}absolute inset-0[\s\S]{0,120}items-center[\s\S]{0,80}justify-center/,
    );
    expect(stripe).toMatch(/leading-none[\s\S]{0,80}La KI-Ronny ta styringen/);
    expect(stripe).toMatch(/La KI-Ronny ta styringen/);
    expect(stripe).not.toMatch(/flex-1 truncate/);
    expect(stripe).not.toMatch(/md:justify-start|md:justify-end|md:items-start|md:items-end/);
    expect(stripe).not.toMatch(/data-workshop-cluster[\s\S]{0,240}justify-start/);
    expect(stripe).not.toMatch(/data-workshop-cluster[\s\S]{0,240}items-start|data-workshop-cluster[\s\S]{0,240}items-end/);
  });

  it('Oppgrader bruker Galaxy inne i knappen, ikke Grainient', () => {
    const pille = utenKommentarer(les('../app/(app)/_shell/oppgrader-pille.tsx'));
    expect(pille).toMatch(/<Galaxy/);
    expect(pille).toMatch(/#111/);
    expect(pille).not.toMatch(/Grainient/);
    expect(pille).not.toMatch(/ShaderGradient/);
  });
});
