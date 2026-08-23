import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Endwise som plattform-org + Se verkstedet (URL, ikke setActive).
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('plattform-org i Bytt visning', () => {
  const switcher = utenKommentarer(les('../app/(app)/_shell/context-switcher.tsx'));
  const nav = les('../app/(app)/_shell/nav.ts');

  it('header er Endwise + Plattform, ikke «nå: Forhandler»', () => {
    expect(switcher).toMatch(/headerNavn = inspect \? dealerName : erPlattform \? 'Endwise'/);
    expect(switcher).toMatch(/erPlattform \? 'Plattform'/);
    expect(switcher).not.toMatch(/nå: Forhandler/);
  });

  it('på plattform vises bare Endwise, deretter Dine verksteder', () => {
    expect(switcher).toMatch(/c\.key === 'endwise'/);
    expect(switcher).toMatch(/Dine verksteder/);
    expect(switcher).toMatch(/Forhandler/);
  });

  it('inspect-modus er Tilbake til Endwise via router.push, ikke setActive', () => {
    expect(switcher).toMatch(/Tilbake til Endwise/);
    expect(switcher).toMatch(/router\.push\(inspectTilbakeHref/);
    expect(switcher).toMatch(/Forlater lesing/);
  });

  it('Endwise-kontekst har label Endwise og hint om forhandlere/innboks/flagg', () => {
    expect(nav).toMatch(/label:\s*'Endwise'/);
    expect(nav).toMatch(/hint:\s*'Forhandlere, innboks, flagg'/);
    expect(nav).toMatch(/landing:\s*'\/endwise'/);
  });

  it('Team ligger i ENDWISE_NAV etter Innboks, ikke som Admin-tab', () => {
    const start = nav.indexOf('export const ENDWISE_NAV');
    const slutt = nav.indexOf('export const ENDWISE_SETTINGS_NAV');
    const blokk = nav.slice(start, slutt);
    const innboks = blokk.indexOf("key: 'endwise-innboks'");
    const team = blokk.indexOf("key: 'endwise-team'");
    const forhandlere = blokk.indexOf("key: 'endwise-forhandlere'");
    expect(team).toBeGreaterThan(innboks);
    expect(forhandlere).toBeGreaterThan(team);
    expect(blokk).toMatch(/href:\s*'\/endwise\/team'/);
    expect(nav).not.toMatch(/label:\s*'Admin'/);
  });

  it('plattform-roller lander på /endwise, aldri /dashboard', () => {
    expect(nav).toMatch(
      /role === 'endwise_admin' \|\| role === 'endwise_support'\) return '\/endwise'/,
    );
    const signin = les('../app/signin/signin-skjema.tsx');
    expect(signin).toMatch(/o\.slug === 'endwise'/);
    expect(signin).toMatch(/session\.me/);
  });
});

describe('Se verkstedet er URL-lesing', () => {
  it('layout har advarselsbanner og ingen setActive', () => {
    const layout = utenKommentarer(les('../app/(app)/endwise/verksted/[slug]/layout.tsx'));
    expect(layout).toMatch(/bg-warn-soft/);
    expect(layout).toMatch(/text-warn/);
    expect(layout).toMatch(/h-row/);
    expect(layout).toMatch(/Du ser/);
    expect(layout).toMatch(/kun lesing/);
    expect(layout).toMatch(/Tilbake til Endwise/);
    expect(layout).not.toMatch(/setActive|impersonat/i);
  });

  it('sidebar remap-er FORHANDLER_NAV under /endwise/verksted/[slug]', () => {
    const sidebar = les('../app/(app)/_shell/sidebar.tsx');
    expect(sidebar).toMatch(/remapHrefTilInspect/);
    expect(sidebar).toMatch(/FORHANDLER_NAV/);
    expect(sidebar).toMatch(/inspect \? null/);
  });

  it('stale Forhandler-kontekst på plattform redirecter med toast', () => {
    const layout = les('../app/(app)/layout.tsx');
    expect(layout).toMatch(/erForhandlerRutePaaPlattform/);
    expect(layout).toMatch(/Endwise er plattformen, ikke et verksted/);
    expect(layout).toMatch(/\/endwise\?varsel=plattform/);
  });
});

describe('plattform-team er ikke F1-10', () => {
  const team = les('../app/(app)/endwise/team/page.tsx');
  const resend = les('../../packages/auth/src/senders/resend.ts');

  it('inviterer administrator eller support, aldri eier', () => {
    expect(team).toMatch(/administrator/);
    expect(team).toMatch(/support/);
    expect(team).toMatch(/Hoved-admin/);
    expect(team).toMatch(/Eier kan ikke inviteres/);
    expect(team).not.toMatch(/leder|selger|mekaniker/);
  });

  it('e-postkopi er Endwise-support, aldri eier av verksted', () => {
    expect(resend).toMatch(/Du er invitert til Endwise-support/);
    expect(resend).toMatch(/som administrator/);
    expect(resend).not.toMatch(/eier av \$\{input\.forhandler\}.*platform|platform.*eier av/);
  });
});
