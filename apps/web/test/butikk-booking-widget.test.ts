import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV, itemsForRole } from '../app/(app)/_shell/nav.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string): string {
  return readFileSync(resolve(her, rel), 'utf8');
}

/**
 * Mikael 29.08.2026 — midlertidig testplassering av F4-03-widgeten på Butikk.
 * Ingen ny booking. Shop forblir flagg-styrt. Samme /butikk-rute på telefon og PC.
 */
describe('F10-03 / F4-03 — booking-widget på Butikk', () => {
  const side = les('../app/(app)/butikk/page.tsx');
  const embed = les('../app/(app)/butikk/_booking-widget.tsx');
  const kasse = les('../app/(app)/butikk/kasse/page.tsx');

  it('embedder den eksisterende EndwiseWidget fra widget-ui', () => {
    expect(side).toMatch(/ButikkBookingWidget/);
    expect(embed).toMatch(/from '@endwise\/widget-ui'/);
    expect(embed).toMatch(/<EndwiseWidget/);
    expect(embed).toMatch(/Testplassering av booking-widgeten/);
    expect(embed).not.toMatch(/Reserve with Google/i);
  });

  it('ligger på /butikk (Katalog), ikke en ny rute eller kasse', () => {
    expect(side).toMatch(/from '\.\/_booking-widget'/);
    expect(kasse).not.toMatch(/EndwiseWidget|ButikkBookingWidget/);
    expect(embed).not.toMatch(/\/butikk\/book|\/bookinger\/widget/);
  });

  it('skjules når shop-flagget er av, og kaller shop.bookingWidget', () => {
    expect(embed).toMatch(/shopEnabled/);
    expect(embed).toMatch(/if \(!shopEnabled\) return null/);
    expect(embed).toMatch(/trpc\.shop\.bookingWidget/);
    expect(embed).toMatch(/trpc\.services\.list/);
    expect(embed.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/forhandler\.get/);
    expect(embed).toMatch(/enabled: shopEnabled/);
  });

  it('Butikk-nav er uendret: Katalog + kasse, flagg-styrt, ingen Book-pille', () => {
    const butikk = itemsForRole(FORHANDLER_NAV, 'dealer_admin', true).find(
      (i) => i.key === 'butikk',
    );
    expect(butikk?.pills?.map((p) => p.href)).toEqual(['/butikk', '/butikk/kasse']);
    expect(butikk?.pills?.map((p) => p.label)).not.toContain('Book');
    expect(
      itemsForRole(FORHANDLER_NAV, 'dealer_admin', false).some((i) => i.key === 'butikk'),
    ).toBe(false);
  });

  it('finner ikke opp en andre booking og skriver ikke til Quick', () => {
    expect(embed).not.toMatch(/quick\.(push|write)|Reserve with Google|guest-then-convert/i);
    expect(side).not.toMatch(/function BookingPanel|Ny booking-motor/);
    expect(embed).not.toMatch(/Kontor|Gulvet|Saker/);
  });
});
