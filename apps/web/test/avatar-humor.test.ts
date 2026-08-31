import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Avatar-velgeren er borte', () => {
  it('ingen blobatar-velger-fil, ingen pick-your-face', () => {
    const profil = les('../app/(app)/innstillinger/_profil-fane.tsx');
    expect(profil).not.toMatch(/AvatarVelger/);
    expect(profil).not.toMatch(/Ny tilfeldig/);
    expect(profil).toMatch(/bevegelse="alltid"/);
    expect(profil).toMatch(/Organisasjon/);
  });

  it('sidebar er stille — ikke peker-følge', () => {
    const rad = les('../app/(app)/_shell/bruker-rad.tsx');
    expect(rad).toMatch(/bevegelse="stille"/);
    expect(rad).not.toMatch(/bevegelse="alltid"/);
    expect(rad).toMatch(/valg=\{profil\.data\?\.avatar\}/);
  });

  it('dealer setter farge fra 12 svatsjer', () => {
    const svatsj = les('../app/(app)/_avatar/farge-svatser.tsx');
    expect(svatsj).toMatch(/COLORS\.map/);
    expect(svatsj).toMatch(/team\.setFarge/);
    expect(svatsj).not.toMatch(/hue|grader|0–359/);
    const ansatte = les('../app/(app)/organisasjon/_ansatte.tsx');
    expect(ansatte).toMatch(/FargeSvatser/);
  });
});
