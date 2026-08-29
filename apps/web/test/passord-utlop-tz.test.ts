import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formaterKlokkeslett } from '@endwise/auth/tid';
import { describe, expect, it } from 'vitest';

/**
 * F1-16 — reset-utløp vises i Europe/Oslo, ikke UTC.
 * Kvitteringen på /glemt-passord og «Send passordendring» i team
 * bruker samme formatter som e-posten. SMS printer ikke klokke.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('passord-utløp i Europe/Oslo (F1-16)', () => {
  it('et kjent UTC-øyeblikk vises som Europe/Oslo', () => {
    expect(formaterKlokkeslett(new Date('2026-08-29T05:46:00.000Z'))).toBe('07:46');
  });

  it('kvitteringene bruker formaterKlokkeslett, ikke rå toLocaleTimeString', () => {
    const glemt = les('../app/glemt-passord/page.tsx');
    const team = les('../app/(app)/innstillinger/team/_detaljer.tsx');
    for (const kilde of [glemt, team]) {
      expect(kilde).toMatch(/formaterKlokkeslett/);
      expect(kilde).toMatch(/Siste tidspunkt for å tilbakestille via lenken/);
      expect(kilde).not.toMatch(/toLocaleTimeString\(/);
      expect(kilde).not.toMatch(/toISOString\(/);
    }
  });
});
