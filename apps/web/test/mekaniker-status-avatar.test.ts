import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F6-19 — mekaniker-/ansattflater viser blobatar med status-humor, og
 * tilgjengelighetstekst ved siden av. Status overstyrer KUN humor.
 * Sidebar og profil viser det valgte uttrykket.
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

describe('Team › lista er den ekte ansattlista', () => {
  const liste = readFileSync(resolve(her, '../app/(app)/innstillinger/team/_liste.tsx'), 'utf8');
  const mek = readFileSync(
    resolve(her, '../app/(app)/innstillinger/team/_mekanikere-pille.tsx'),
    'utf8',
  );
  const inviter = readFileSync(
    resolve(her, '../app/(app)/innstillinger/team/_inviter.tsx'),
    'utf8',
  );
  const hub = readFileSync(resolve(her, '../app/(app)/innstillinger/team/page.tsx'), 'utf8');

  it('viser blobatar + status-humor, ikke initialer', () => {
    expect(liste).toMatch(/<Avatar/);
    expect(liste).toMatch(/statusHumor/);
    expect(liste).toMatch(/seed=\{rad\.userId\}/);
    expect(liste).not.toMatch(/\.slice\(0,\s*1\)\.toUpperCase\(\)/);
    expect(mek).toMatch(/statusLabel/);
  });

  it('invitasjoner er uten avatar — lista eier ansiktene', () => {
    expect(inviter).not.toMatch(/<Avatar/);
    expect(hub).toMatch(/<Inviter/);
    expect(hub).toMatch(/TeamListe|MekanikerePille/);
  });
});

describe('sidebar og profil viser valgt humor, ikke jobbstatus', () => {
  const rad = readFileSync(resolve(her, '../app/(app)/_shell/bruker-rad.tsx'), 'utf8');
  const meg = readFileSync(resolve(her, '../app/(app)/min-dag/meg/page.tsx'), 'utf8');
  const profil = readFileSync(resolve(her, '../app/(app)/min-dag/profil/page.tsx'), 'utf8');

  it('sidebar tvinger ikke happy og overstyrer ikke med status', () => {
    expect(rad).toMatch(/bevegelse="alltid"/);
    expect(rad).toMatch(/valg=\{profil\.data\?\.avatar\}/);
    expect(rad).not.toMatch(/humor:\s*['"]happy['"]/);
    expect(rad).not.toMatch(/statusHumor/);
  });

  it('Meg viser valgt ansikt og status som tekst', () => {
    expect(meg).toMatch(/<Avatar/);
    expect(meg).toMatch(/valg=\{m\.avatar\}/);
    expect(meg).toMatch(/statusLabel/);
    expect(meg).not.toMatch(/humor:\s*m\.statusHumor/);
    expect(meg).not.toMatch(/\.slice\(0,\s*1\)\.toUpperCase\(\)/);
  });

  it('min-dag/profil viser valgt ansikt og status som tekst', () => {
    expect(profil).toMatch(/<Avatar/);
    expect(profil).toMatch(/valg=\{m\.avatar\}/);
    expect(profil).toMatch(/statusLabel/);
    expect(profil).not.toMatch(/humor:\s*m\.statusHumor/);
    expect(profil).not.toMatch(/\.slice\(0,\s*1\)\.toUpperCase\(\)/);
  });
});

describe('Detaljer-panelet overstyrer humor med status, og beholder norsk label', () => {
  const detaljer = readFileSync(resolve(her, '../app/(app)/innboks/_detaljer.tsx'), 'utf8');

  it('mekanikerkortet har status-humor + label', () => {
    expect(detaljer).toMatch(/statusHumor/);
    expect(detaljer).toMatch(/statusLabel/);
    expect(detaljer).toMatch(/humor:\s*data\.statusHumor/);
  });
});
