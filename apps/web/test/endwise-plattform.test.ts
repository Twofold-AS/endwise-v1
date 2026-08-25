import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { erForhandlerRutePaaPlattform, erPlattformIUi } from '../app/(app)/_lib/plattform.ts';

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

  it('visningsvelgeren er logo + navn + chevron — uten X, pille eller localStorage', () => {
    expect(switcher).toMatch(/ChevronDown/);
    expect(switcher).toMatch(/headerNavn/);
    expect(switcher).not.toMatch(/Minimer visningsvelger/);
    expect(switcher).not.toMatch(/Utvid visningsvelger/);
    expect(switcher).not.toMatch(/endwise\.visningsvelger\.minimer/);
    expect(switcher).not.toMatch(/localStorage/);
    expect(switcher).not.toMatch(/label:\s*'Admin'/);
  });

  it('på plattform vises bare Endwise — aldri Forhandler/Lager/Butikk som sesjonsbytte', () => {
    expect(switcher).toMatch(/c\.key === 'endwise'/);
    expect(switcher).toMatch(/visningsvalg = erPlattform/);
    expect(switcher).toMatch(/Forhandlere/);
    expect(switcher).toMatch(/Dine verksteder/);
    expect(switcher).toMatch(/tenants\.list/);
    expect(switcher).toMatch(/\/endwise\/verksted\/\$\{/);
  });

  it('Forhandlere-inspect bruker router.push, ikke setActive', () => {
    const start = switcher.indexOf('>Forhandlere<');
    expect(start).toBeGreaterThan(-1);
    const inspectBlokk = switcher.slice(start, switcher.indexOf('>Dine verksteder<'));
    expect(inspectBlokk).toMatch(/router\.push/);
    expect(inspectBlokk).toMatch(/endwise\/verksted/);
    expect(inspectBlokk).not.toMatch(/setActive|byttTenant/);
  });

  it('Dine verksteder + setActive kun for ekte verksted-medlemskap', () => {
    expect(switcher).toMatch(/erPlattform && verksteder\.length > 0/);
    expect(switcher).toMatch(/byttTenant\(v\.id/);
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
    const settings = nav.slice(slutt, nav.indexOf('export function contextsForRole'));
    const utenKommentar = settings.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(utenKommentar).not.toMatch(/label:\s*'Team'/);
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
  it('kunder-siden viser ikke e-post/telefon', () => {
    const kunder = les('../app/(app)/endwise/verksted/[slug]/kunder/page.tsx');
    expect(kunder).not.toMatch(/k\.email|k\.phone/);
    expect(kunder).toMatch(/e-post|telefon|persondata/i);
  });

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
    const kopi = les('../app/(app)/_lib/plattform.ts');
    const rolle = les('../app/(app)/_lib/use-org-role.ts');
    expect(layout).toMatch(/erForhandlerRutePaaPlattform/);
    expect(layout).toMatch(/plattformToast/);
    expect(layout).toMatch(/\/endwise\?varsel=plattform/);
    expect(kopi).toMatch(/Endwise er plattformen, ikke et verksted/);
    expect(rolle).toMatch(/slug === 'endwise'|erPlattformIUi/);
  });

  it('Abonnement og Tjenester & priser er ikke nåbare dealer-faktureringssider på plattform', () => {
    expect(erForhandlerRutePaaPlattform('/abonnement')).toBe(true);
    expect(erForhandlerRutePaaPlattform('/tjenester')).toBe(true);
    expect(erForhandlerRutePaaPlattform('/innstillinger/tjenester')).toBe(true);
    expect(erForhandlerRutePaaPlattform('/innstillinger', 'fane=abonnement')).toBe(true);
    expect(erForhandlerRutePaaPlattform('/innstillinger', 'fane=tjenester')).toBe(true);
    expect(erForhandlerRutePaaPlattform('/innstillinger')).toBe(false);
    expect(erForhandlerRutePaaPlattform('/innstillinger/profil')).toBe(false);
    const layout = les('../app/(app)/layout.tsx');
    expect(layout).toMatch(/erForhandlerRutePaaPlattform\(pathname,/);
  });

  it('slug=endwise er plattform i UI uten å vente på kind=platform', () => {
    expect(erPlattformIUi({ slug: 'endwise', kind: 'live' })).toBe(true);
    expect(erPlattformIUi({ kind: 'platform', slug: 'annet' })).toBe(true);
    expect(erPlattformIUi({ erPlattform: true })).toBe(true);
    expect(erPlattformIUi({ slug: 'yamaha-bergen', kind: 'live' })).toBe(false);
  });

  it('sidebar tvinger Endwise-nav på plattform — også når rollen er dealer_admin', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(sidebar).toMatch(/CONTEXTS\.filter\(\(c\) => c\.key === 'endwise'\)/);
    expect(sidebar).toMatch(/erPlattform \? 'endwise'/);
    expect(sidebar).toMatch(/endwise_admin/);
    expect(sidebar).not.toMatch(/contextsForRole\(role, isMechanic, false\)\.filter/);
  });
});

describe('plattform-team er ikke F1-10', () => {
  const team = les('../app/(app)/endwise/team/page.tsx');
  const resend = les('../../../packages/auth/src/senders/resend.ts');

  it('inviterer administrator eller support, aldri eier', () => {
    expect(team).toMatch(/administrator/);
    expect(team).toMatch(/support/);
    expect(team).toMatch(/Hoved-admin/);
    expect(team).toMatch(/Eier kan ikke inviteres/);
    expect(team).toMatch(/Ikke forhandlerens/);
    expect(team).not.toMatch(/jobFunction|job_function/);
  });

  it('e-postkopi er Endwise-support, aldri eier av verksted', () => {
    expect(resend).toMatch(/Du er invitert til Endwise-support/);
    expect(resend).toMatch(/som administrator/);
    expect(resend).not.toMatch(/eier av \$\{input\.forhandler\}.*platform|platform.*eier av/);
  });
});
