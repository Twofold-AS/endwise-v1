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
 * PR #184 — midlertidig blå booking-widget er fjernet fra Butikk.
 * Widget-fila kan ligge, men skal ikke monteres på /butikk.
 */
describe('F10-03 / F4-03 — booking-widget på Butikk', () => {
  const side = les('../app/(app)/butikk/page.tsx');
  const embed = les('../app/(app)/butikk/_booking-widget.tsx');
  const kasse = les('../app/(app)/butikk/kasse/page.tsx');

  it('monterer ikke den midlertidige booking-widgeten på Butikk', () => {
    expect(side).not.toMatch(/ButikkBookingWidget/);
    expect(side).not.toMatch(/from '\.\/_booking-widget'/);
    expect(embed).toMatch(/from '@endwise\/widget-ui'/);
  });

  it('ligger ikke på kasse', () => {
    expect(kasse).not.toMatch(/EndwiseWidget|ButikkBookingWidget/);
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
});
