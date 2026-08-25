import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HUMOR, tilfeldigAvatarValg } from '../app/(app)/_avatar/avatar-valg.ts';

/**
 * F6-19 — happy-låsen er OPPHEVET. Brukeren velger uttrykk, og «Ny tilfeldig»
 * kan trekke alle bibliotekets kuraterte humør — ikke bare happy.
 */
const her = dirname(fileURLToPath(import.meta.url));

describe('AvatarVelger — happy-låsen er borte', () => {
  const velger = readFileSync(resolve(her, '../app/(app)/_avatar/avatar-velger.tsx'), 'utf8');

  it('har ingen medHappy-lås og tvinger ikke humor: happy', () => {
    expect(velger).not.toMatch(/function medHappy/);
    expect(velger).not.toMatch(/medHappy\(/);
    expect(velger).not.toMatch(/Humøret er alltid blidt/);
    expect(velger).not.toMatch(/ALLTID happy/);
  });

  it('viser bibliotekets uttrykk som valg, uten de fire P0-nedtrekkene', () => {
    expect(velger).toMatch(/HUMOR\.map/);
    expect(velger).toMatch(/Ny tilfeldig/);
    expect(velger).toMatch(/size=\{48\}/);
    expect(velger).toMatch(/bevegelse="alltid"/);
    expect(velger).not.toMatch(/function Nedtrekk/);
    expect(velger).not.toMatch(/id="humor"/);
    expect(velger).not.toMatch(/grid grid-cols-2 gap-3 lg:grid-cols-4/);
  });

  it('sidebar viser valgt humor — ikke tvunget happy, ikke jobbstatus', () => {
    const rad = readFileSync(resolve(her, '../app/(app)/_shell/bruker-rad.tsx'), 'utf8');
    expect(rad).toMatch(/bevegelse="alltid"/);
    expect(rad).toMatch(/valg=\{profil\.data\?\.avatar\}/);
    expect(rad).not.toMatch(/humor:\s*['"]happy['"]/);
    expect(rad).not.toMatch(/statusHumor/);
  });
});

describe('tilfeldigAvatarValg trekker uttrykk, ikke bare happy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('vokabularet er bibliotekets ti kuraterte uttrykk', () => {
    expect(HUMOR.map((h) => h.key)).toEqual([
      'idle',
      'happy',
      'wink',
      'smug',
      'sleepy',
      'thinking',
      'surprised',
      'unsure',
      'love',
      'shy',
    ]);
  });

  it('kan trekke sleepy og thinking — ikke tvunget til happy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.45);
    const valg = tilfeldigAvatarValg();
    expect(valg.humor).not.toBe('happy');
    expect(HUMOR.map((h) => h.key)).toContain(valg.humor);
  });

  it('ulike tilfeldige trekk kan gi ulike uttrykk', () => {
    const sett = new Set<string>();
    for (let i = 0; i < HUMOR.length; i++) {
      vi.spyOn(Math, 'random').mockReturnValue((i + 0.1) / HUMOR.length);
      sett.add(tilfeldigAvatarValg().humor ?? '');
      vi.restoreAllMocks();
    }
    expect(sett.size).toBeGreaterThan(1);
  });
});
