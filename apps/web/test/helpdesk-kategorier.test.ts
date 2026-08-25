import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  filtrerHelpdesk,
  HELPDESK_KATEGORI_LABEL,
  HELPDESK_KATEGORIER,
} from '../app/(app)/support/_kategorier.ts';

/**
 * F5-51 — helpdesk-kategorier. Slack #endwise-v1 ba om Brukerguide og
 * Oppdateringer i tillegg til de eksisterende (booking · kunder · lager ·
 * integrasjoner · fakturering). Ingen ny Admin-fane.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F5-51 — faste helpdesk-kategorier', () => {
  it('har Brukerguide og Oppdateringer pluss de fem eksisterende, på norsk', () => {
    expect([...HELPDESK_KATEGORIER]).toEqual([
      'brukerguide',
      'oppdateringer',
      'booking',
      'kunder',
      'lager',
      'integrasjoner',
      'fakturering',
    ]);
    expect(HELPDESK_KATEGORI_LABEL.brukerguide).toBe('Brukerguide');
    expect(HELPDESK_KATEGORI_LABEL.oppdateringer).toBe('Oppdateringer');
    expect(HELPDESK_KATEGORI_LABEL.booking).toBe('Booking');
    expect(HELPDESK_KATEGORI_LABEL.kunder).toBe('Kunder');
    expect(HELPDESK_KATEGORI_LABEL.lager).toBe('Lager');
    expect(HELPDESK_KATEGORI_LABEL.integrasjoner).toBe('Integrasjoner');
    expect(HELPDESK_KATEGORI_LABEL.fakturering).toBe('Fakturering');
  });

  it('web-enumet matcher @endwise/db 1:1', () => {
    const skjema = les('../../../packages/db/src/schema/helpdesk.ts');
    for (const k of HELPDESK_KATEGORIER) {
      expect(skjema).toContain(`'${k}'`);
      expect(skjema).toContain(`${k}: '${HELPDESK_KATEGORI_LABEL[k]}'`);
    }
  });

  it('filtrerHelpdesk beholder alle eller én kategori', () => {
    const rader = [
      { id: '1', category: 'brukerguide' },
      { id: '2', category: 'oppdateringer' },
      { id: '3', category: 'lager' },
    ];
    expect(filtrerHelpdesk(rader, 'alle').map((a) => a.id)).toEqual(['1', '2', '3']);
    expect(filtrerHelpdesk(rader, 'brukerguide').map((a) => a.id)).toEqual(['1']);
    expect(filtrerHelpdesk(rader, 'oppdateringer').map((a) => a.id)).toEqual(['2']);
  });

  it('forhandler-helpdesk filtrerer på kategoriene — ingen ny Admin-fane', () => {
    const support = les('../app/(app)/support/page.tsx');
    const labels = les('../app/(app)/support/_kategorier.ts');
    const admin = les('../app/(app)/endwise/helpdesk/page.tsx');
    const nav = les('../app/(app)/_shell/nav.ts');
    expect(support).toMatch(/HELPDESK_KATEGORIER/);
    expect(labels).toMatch(/brukerguide: 'Brukerguide'/);
    expect(labels).toMatch(/oppdateringer: 'Oppdateringer'/);
    expect(admin).toMatch(/HELPDESK_KATEGORIER/);
    expect(admin).toMatch(/category/);
    expect(nav).toMatch(/href: '\/endwise\/helpdesk'/);
    expect(nav.match(/endwise-helpdesk/g)?.length).toBe(1);
    expect(nav).not.toMatch(/Admin helpdesk|helpdesk-admin/i);
  });
});
