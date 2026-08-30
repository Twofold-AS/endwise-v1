import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FARGER,
  fullforAvatarValg,
  TOM_AVATAR_VALG,
  tilfeldigAvatarValg,
} from '../app/(app)/_avatar/avatar-valg.ts';

/**
 * Form, humør og tone er ute av velgeren. Bare farge (hue) styres.
 * «Ny tilfeldig» trekker en ny farge og tømmer leftover-feltene.
 */
const her = dirname(fileURLToPath(import.meta.url));

describe('AvatarVelger — bare farge, uten form/humør/tone', () => {
  const velger = readFileSync(resolve(her, '../app/(app)/_avatar/avatar-velger.tsx'), 'utf8');

  it('har ingen form-, humør- eller tone-velger', () => {
    expect(velger).not.toMatch(/FORMER\.map/);
    expect(velger).not.toMatch(/HUMOR\.map/);
    expect(velger).not.toMatch(/TONER\.map/);
    expect(velger).not.toMatch(/<p className="mb-2 text-label text-fg">Form<\/p>/);
    expect(velger).not.toMatch(/<p className="mb-2 text-label text-fg">Humør<\/p>/);
    expect(velger).not.toMatch(/<p className="mb-2 text-label text-fg">Tone<\/p>/);
    expect(velger).not.toMatch(/Endre form, farge og uttrykk/);
    expect(velger).not.toMatch(/velg form, farge og humør/i);
    expect(velger).not.toMatch(/<details/);
    expect(velger).not.toMatch(/foldFormer/);
    expect(velger).not.toMatch(/function Nedtrekk/);
    expect(velger).not.toMatch(/id="humor"/);
    expect(velger).not.toMatch(/humor:\s*['"]happy['"]/);
  });

  it('viser farge og Ny tilfeldig, med gaze på det store ansiktet', () => {
    expect(velger).toMatch(/FARGER\.map/);
    expect(velger).toMatch(/Ny tilfeldig/);
    expect(velger).toMatch(/size = 48/);
    expect(velger).toMatch(/size=\{size\}/);
    expect(velger).toMatch(/bevegelse="alltid"/);
    expect(velger).toMatch(/Velg farge, eller trekk en ny tilfeldig/);
  });

  it('Ny tilfeldig tømmer leftover form/humør/tone', () => {
    expect(velger).toMatch(/tilfeldigAvatarValg\(\)/);
    expect(velger).not.toMatch(/humor:\s*valg\.humor/);
  });

  it('sidebar viser seed+farge — ikke tvunget happy, ikke jobbstatus', () => {
    const rad = readFileSync(resolve(her, '../app/(app)/_shell/bruker-rad.tsx'), 'utf8');
    expect(rad).toMatch(/bevegelse="alltid"/);
    expect(rad).toMatch(/valg=\{profil\.data\?\.avatar\}/);
    expect(rad).not.toMatch(/humor:\s*['"]happy['"]/);
    expect(rad).not.toMatch(/statusHumor/);
  });
});

describe('tilfeldigAvatarValg trekker farge, ikke form eller humør', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('siste to farger er lilla 270 og rosa 320 — ikke 300/340', () => {
    expect(FARGER.map((f) => f.grader)).toEqual([20, 60, 110, 150, 195, 250, 270, 320]);
    expect(FARGER.at(-2)).toMatchObject({ grader: 270, label: 'Lilla' });
    expect(FARGER.at(-1)).toMatchObject({ grader: 320, label: 'Rosa' });
    expect(FARGER.map((f) => f.grader)).not.toContain(300);
    expect(FARGER.map((f) => f.grader)).not.toContain(340);
  });

  it('trekker en farge og tømmer form/humør/tone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const valg = tilfeldigAvatarValg();
    expect(valg.form).toBeNull();
    expect(valg.humor).toBeNull();
    expect(valg.tone).toBeNull();
    expect(valg.farge).toBe(20);
  });

  it('beholder valgt farge når den sendes inn — leftover røres ikke tilbake', () => {
    const neste = tilfeldigAvatarValg({ farge: 150 });
    expect(neste.farge).toBe(150);
    expect(neste.form).toBeNull();
    expect(neste.humor).toBeNull();
    expect(neste.tone).toBeNull();
  });
});

describe('opprett-sti tvinger ikke happy og pinner ikke form', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('tom avatar får tilfeldig farge — ikke form eller humør', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const valg = fullforAvatarValg(TOM_AVATAR_VALG);
    expect(valg.farge).toBe(20);
    expect(valg.form).toBeNull();
    expect(valg.humor).toBeNull();
    expect(valg.tone).toBeNull();
  });

  it('null-input er samme opprett-sti som tomt valg', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.55);
    const valg = fullforAvatarValg(null);
    expect(valg.form).toBeNull();
    expect(valg.humor).toBeNull();
    expect(FARGER.map((f) => f.grader)).toContain(valg.farge);
  });

  it('leftover form/humør/tone tømmes ved fullfør — fargen beholdes', () => {
    const valg = fullforAvatarValg({
      form: 'sun',
      humor: 'wink',
      farge: 195,
      tone: 3,
    });
    expect(valg.form).toBeNull();
    expect(valg.humor).toBeNull();
    expect(valg.tone).toBeNull();
    expect(valg.farge).toBe(195);
  });
});
