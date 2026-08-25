import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FARGER,
  fullforAvatarValg,
  HUMOR,
  TOM_AVATAR_VALG,
  tilfeldigAvatarValg,
} from '../app/(app)/_avatar/avatar-valg.ts';

/**
 * F6-19 — happy-låsen er OPPHEVET. Opprett og «Ny tilfeldig» tvinger ikke
 * humør til happy. Valgt humør og farge overskrives ikke.
 */
const her = dirname(fileURLToPath(import.meta.url));

describe('AvatarVelger — farge, humør og eksisterende kontroller', () => {
  const velger = readFileSync(resolve(her, '../app/(app)/_avatar/avatar-velger.tsx'), 'utf8');

  it('har ingen medHappy-lås og tvinger ikke humor: happy', () => {
    expect(velger).not.toMatch(/function medHappy/);
    expect(velger).not.toMatch(/medHappy\(/);
    expect(velger).not.toMatch(/Humøret er alltid blidt/);
    expect(velger).not.toMatch(/ALLTID happy/);
    expect(velger).not.toMatch(/humor:\s*['"]happy['"]/);
  });

  it('viser form, farge, humør og tone — uten de fire P0-nedtrekkene', () => {
    expect(velger).toMatch(/FORMER\.map/);
    expect(velger).toMatch(/FARGER\.map/);
    expect(velger).toMatch(/HUMOR\.map/);
    expect(velger).toMatch(/TONER\.map/);
    expect(velger).toMatch(/Ny tilfeldig/);
    expect(velger).toMatch(/size = 48/);
    expect(velger).toMatch(/size=\{size\}/);
    expect(velger).toMatch(/bevegelse="alltid"/);
    expect(velger).not.toMatch(/function Nedtrekk/);
    expect(velger).not.toMatch(/id="humor"/);
    expect(velger).not.toMatch(/grid grid-cols-2 gap-3 lg:grid-cols-4/);
  });

  it('Ny tilfeldig beholder valgt humør og farge', () => {
    expect(velger).toMatch(/tilfeldigAvatarValg\(\{/);
    expect(velger).toMatch(/humor:\s*valg\.humor/);
    expect(velger).toMatch(/farge:\s*valg\.farge/);
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

  it('siste to farger er lilla 270 og rosa 320 — ikke 300/340', () => {
    expect(FARGER.map((f) => f.grader)).toEqual([20, 60, 110, 150, 195, 250, 270, 320]);
    expect(FARGER.at(-2)).toMatchObject({ grader: 270, label: 'Lilla' });
    expect(FARGER.at(-1)).toMatchObject({ grader: 320, label: 'Rosa' });
    expect(FARGER.map((f) => f.grader)).not.toContain(300);
    expect(FARGER.map((f) => f.grader)).not.toContain(340);
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

  it('beholder valgt humør og farge når form regenereres', () => {
    const neste = tilfeldigAvatarValg({ humor: 'thinking', farge: 150, tone: 2 });
    expect(neste.humor).toBe('thinking');
    expect(neste.farge).toBe(150);
    expect(neste.tone).toBe(2);
    expect(neste.form).toBeTruthy();
    expect(neste.humor).not.toBe('happy');
  });
});

describe('opprett-sti tvinger ikke happy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('tom avatar får tilfeldig humør blant de ti — ikke hardkodet happy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const valg = fullforAvatarValg(TOM_AVATAR_VALG);
    expect(valg.humor).not.toBeNull();
    expect(HUMOR.map((h) => h.key)).toContain(valg.humor);
    expect(valg.humor).toBe('idle');
    expect(valg.form).toBeTruthy();
    expect(valg.farge).toBeTruthy();
  });

  it('null-input er samme opprett-sti som tomt valg', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.55);
    const valg = fullforAvatarValg(null);
    expect(valg.humor).not.toBe('happy');
    expect(HUMOR.map((h) => h.key)).toContain(valg.humor);
  });

  it('delvis valg uten humør får tilfeldig humør — farge og form røres ikke', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const valg = fullforAvatarValg({
      form: 'sun',
      humor: null,
      farge: 195,
      tone: 3,
    });
    expect(valg.form).toBe('sun');
    expect(valg.farge).toBe(195);
    expect(valg.tone).toBe(3);
    expect(valg.humor).not.toBeNull();
    expect(valg.humor).not.toBe('happy');
    expect(HUMOR.map((h) => h.key)).toContain(valg.humor);
  });

  it('valgt humør overskrives ikke ved fullfør', () => {
    const valgt = {
      form: 'triangle' as const,
      humor: 'wink' as const,
      farge: 250,
      tone: 1,
    };
    expect(fullforAvatarValg(valgt)).toEqual(valgt);
  });
});
