import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F6-19 — mekaniker-/ansattflater viser blobatar med status-humor, og
 * tilgjengelighetstekst ved siden av. Status overstyrer KUN humor.
 */
const her = dirname(fileURLToPath(import.meta.url));

describe('mekanikerlista viser blobatar med status-humor', () => {
  const side = readFileSync(resolve(her, '../app/(app)/mekanikere/page.tsx'), 'utf8');

  it('er ikke lenger en Placeholder', () => {
    expect(side).not.toMatch(/Placeholder/);
    expect(side).toMatch(/mechanics\.oversikt/);
    expect(side).toMatch(/<Avatar/);
    expect(side).toMatch(/statusHumor/);
    expect(side).toMatch(/statusLabel/);
  });

  it('identitet kommer fra persistente valg — status overstyrer bare humor', () => {
    expect(side).toMatch(/humor:\s*m\.statusHumor/);
    expect(side).toMatch(/seed=\{m\.id\}/);
  });
});

describe('andre ansattflater med initialer viser blobatar', () => {
  const meg = readFileSync(resolve(her, '../app/(app)/min-dag/meg/page.tsx'), 'utf8');
  const profil = readFileSync(resolve(her, '../app/(app)/min-dag/profil/page.tsx'), 'utf8');
  const detaljer = readFileSync(resolve(her, '../app/(app)/innboks/_detaljer.tsx'), 'utf8');

  it('Meg viser blobatar + statuslabel, ikke initialer', () => {
    expect(meg).toMatch(/<Avatar/);
    expect(meg).toMatch(/statusHumor/);
    expect(meg).toMatch(/statusLabel/);
    expect(meg).not.toMatch(/\.slice\(0,\s*1\)\.toUpperCase\(\)/);
  });

  it('min-dag/profil viser blobatar i stedet for initialer', () => {
    expect(profil).toMatch(/<Avatar/);
    expect(profil).toMatch(/statusHumor/);
    expect(profil).not.toMatch(/\.slice\(0,\s*1\)\.toUpperCase\(\)/);
  });

  it('Detaljer-panelet overstyrer humor med status, og beholder norsk label', () => {
    expect(detaljer).toMatch(/statusHumor/);
    expect(detaljer).toMatch(/statusLabel/);
    expect(detaljer).toMatch(/humor:\s*data\.statusHumor/);
  });
});
