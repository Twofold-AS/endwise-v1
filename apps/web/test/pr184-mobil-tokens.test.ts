import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const FLATER = [
  '../app/(app)/_shell/phone-home-dealer.tsx',
  '../app/(app)/_shell/pulse-kort.tsx',
  '../app/(app)/_shell/cards.tsx',
  '../app/(app)/_shell/timeplan-stripe.tsx',
  '../app/(app)/innboks/_inbox-sidebar.tsx',
  '../app/(app)/innboks/[id]/page.tsx',
  '../app/(app)/innboks/_samtale-detaljer.tsx',
  '../app/(app)/innboks/_detaljer.tsx',
  '../app/(app)/innboks/_detaljer-slot.tsx',
  '../app/(app)/kunder/page.tsx',
  '../app/(app)/kunder/[id]/page.tsx',
  '../app/(app)/kunder/_delt.tsx',
  '../app/(app)/kunder/_registrer-kjoretoy.tsx',
  '../app/(app)/saker/page.tsx',
  '../app/(app)/jobber/_dagsliste.tsx',
  '../app/(app)/bookinger/ny/page.tsx',
  '../app/(app)/lager/page.tsx',
  '../app/(app)/butikk/page.tsx',
  '../app/(app)/organisasjon/page.tsx',
  '../app/(app)/organisasjon/forhandleren/_kort.tsx',
  '../../../packages/ui/src/flate/side.tsx',
  '../../../packages/ui/src/flate/filter-chips.tsx',
];

const TEKST_UNDER_13 = /text-\[(?:1[0-2]|[1-9])px\]/;

describe('PR #184 mobil-tokens', () => {
  it('typografi.css importeres og Board-alias finnes', () => {
    const tema = les('../../../packages/ui/src/theme.css');
    expect(tema).toMatch(/typography\.css/);
    expect(tema).toMatch(/mobil\.css/);
    const mobil = les('../../../packages/ui/src/styles/mobil.css');
    expect(mobil).toMatch(/@utility text-body-medium/);
    expect(mobil).toMatch(/@utility text-title-1-semibold/);
    expect(mobil).toMatch(/font-size: 17px/);
    expect(mobil).toMatch(/font-size: 24px/);
    expect(mobil).toMatch(/font-size: 13px/);
  });

  it('Board-aksent er ink og skygger er av', () => {
    const mobil = les('../../../packages/ui/src/styles/mobil.css');
    expect(mobil).toMatch(/--color-accent-500: #141414/);
    expect(mobil).toMatch(/--shadow-card: 0 0 #0000/);
    const tema = les('../../../packages/ui/src/theme.css');
    expect(tema).toMatch(/--shadow-card: none/);
    expect(tema).toMatch(/--color-accent-500: var\(--ew-ink-utility\)/);
  });

  it('mobil-skala: muted #616161, høyder 48/44/40, kort 24, stadium-badge', () => {
    const tokens = les('../../../packages/widget-tokens/src/tokens.css');
    expect(tokens).toMatch(/--ew-fg-muted: #616161/);
    expect(tokens).toMatch(/--ew-control-h: 40px/);
    expect(tokens).toMatch(/--ew-row-h: 44px/);
    expect(tokens).toMatch(/--ew-row-h-store: 48px/);
    expect(tokens).toMatch(/--ew-badge-radius: 9999px/);
    const mobil = les('../../../packages/ui/src/styles/mobil.css');
    expect(mobil).toMatch(/border-radius: 24px/);
    expect(mobil).toMatch(/padding: 16px/);
    expect(mobil).toMatch(/min-width: 768px/);
  });

  it('FilterChips valgt er hvit + ink-kant, ikke fylt ink', () => {
    const chips = utenKommentarer(les('../../../packages/ui/src/flate/filter-chips.tsx'));
    expect(chips).toMatch(/border border-fg bg-bg text-fg/);
    expect(chips).not.toMatch(/aktiv \? 'bg-fg text-bg'/);
    expect(chips).toMatch(/flex-wrap/);
  });

  it('Side/Seksjon/ListeRad brukes på de ekte mobilrutene', () => {
    // Hjem er Claude-designet: egen komposisjon med sr-only h1, ikke Side-header.
    expect(les('../app/(app)/_shell/phone-home-dealer.tsx')).toMatch(/sr-only/);
    expect(les('../app/(app)/butikk/page.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/lager/page.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/lager/page.tsx')).toMatch(/ListeRad/);
    expect(les('../app/(app)/butikk/page.tsx')).toMatch(/ListeRad/);
    expect(les('../app/(app)/kunder/page.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/kunder/[id]/page.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/saker/page.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/bookinger/ny/page.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/organisasjon/page.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/innboks/_inbox-sidebar.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/innboks/[id]/page.tsx')).toMatch(/<Side/);
    expect(les('../app/(app)/jobber/_dagsliste.tsx')).toMatch(/ListeRad/);
    expect(les('../app/(app)/innboks/_samtale-detaljer.tsx')).toMatch(/Drawer/);
    expect(les('../app/(app)/kunder/_registrer-kjoretoy.tsx')).toMatch(/Drawer/);
  });

  it('Ny jobb bruker Board-felt, ikke native input', () => {
    const jobb = utenKommentarer(les('../app/(app)/bookinger/ny/page.tsx'));
    expect(jobb).toMatch(/FeltInput/);
    expect(jobb).toMatch(/FeltTall/);
    expect(jobb).toMatch(/FeltTekst/);
    expect(jobb).not.toMatch(/<input/);
    expect(jobb).not.toMatch(/<select/);
    expect(jobb).not.toMatch(/<textarea/);
  });

  it('Butikk uten blå widget, org uten hub-liste, hero uten midlertidig-tekst', () => {
    expect(utenKommentarer(les('../app/(app)/butikk/page.tsx'))).not.toMatch(/ButikkBookingWidget/);
    expect(utenKommentarer(les('../app/(app)/organisasjon/forhandleren/_kort.tsx'))).not.toMatch(
      /OrgHubSeksjoner/,
    );
    expect(les('../app/_markeds/produkt-ramme.tsx')).not.toMatch(/Midlertidig plassholder/);
  });

  it('samtale: Detaljer er outline-pille + Drawer, bobler er myke', () => {
    const pille = utenKommentarer(les('../app/(app)/innboks/_samtale-detaljer.tsx'));
    expect(pille).toMatch(/border-fg bg-bg/);
    expect(pille).toMatch(/useState\(false\)/);
    expect(pille).toMatch(/placement="bottom"/);
    const samtale = utenKommentarer(les('../app/(app)/innboks/[id]/page.tsx'));
    expect(samtale).toMatch(/SamtaleDetaljerPille/);
    expect(samtale).toMatch(/bg-surface-2/);
    expect(samtale).not.toMatch(/bg-accent-soft/);
    const slot = utenKommentarer(les('../app/(app)/innboks/_detaljer-slot.tsx'));
    expect(slot).not.toMatch(/bg-fg px-3/);
  });

  it('ingen tekst under 13px i de listede mobilflatene', () => {
    for (const fil of FLATER) {
      const kilde = utenKommentarer(les(fil));
      expect(kilde, fil).not.toMatch(TEKST_UNDER_13);
    }
  });

  it('ingen #0066ff på CTA/felt i mobilflatene', () => {
    for (const fil of FLATER) {
      const kilde = utenKommentarer(les(fil));
      expect(kilde, fil).not.toMatch(/#0066ff|#0066cc|#407ff2/i);
    }
  });

  it('dagsbuen er dempet grå/ink, ikke blå', () => {
    const pulse = les('../app/(app)/_shell/phone-home-pulse.ts');
    expect(pulse).toMatch(/PULSE_DAG_FYLL_INK = '#616161'/);
    expect(utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'))).toMatch(
      /PULSE_DAG_FYLL_SOFT/,
    );
  });
});
