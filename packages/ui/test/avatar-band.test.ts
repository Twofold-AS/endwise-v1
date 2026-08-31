import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { skalFølgePeker } from '../src/components/avatar.tsx';
import {
  COLORS,
  fargeFraHue,
  fargeFraSeed,
  hexForFarge,
  losFarge,
  staffFargeStil,
} from '../src/lib/bloub-farge.ts';
import { BLOUB_HVILE } from '../src/lib/bloub-hvile.ts';

const kilde = readFileSync(new URL('../src/components/avatar.tsx', import.meta.url), 'utf8');

describe('Avatar — bloub, ikke blobatar', () => {
  it('importerer ikke @blobatar/react', () => {
    expect(kilde).not.toMatch(/@blobatar\/react/);
    expect(kilde).not.toMatch(/from ['"]blobatar/);
    expect(kilde).toMatch(/BloubBot/);
    expect(kilde).toMatch(/shape="cercle"/);
    expect(kilde).toMatch(/still=\{still\}/);
  });

  it('hvile er store øyne, ikke neutre', () => {
    expect(BLOUB_HVILE).toBe('surpris');
    expect(BLOUB_HVILE).not.toBe('neutre');
  });
});

describe('ColorId-palett', () => {
  it('har de 12 faste bloub-fargene', () => {
    expect(COLORS.map((c) => c.id)).toEqual([
      'encre',
      'brun',
      'rouge',
      'orange',
      'ambre',
      'vert',
      'turquoise',
      'bleu',
      'violet',
      'rose',
      'gris',
      'creme',
    ]);
  });

  it('mapper leftover hue til paletten, ikke vilkårlig HSL', () => {
    expect(fargeFraHue(20)).toBe('rouge');
    expect(fargeFraHue(150)).toBe('vert');
    expect(fargeFraHue(250)).toBe('bleu');
    expect(hexForFarge('bleu')).toBe('#3b93f0');
  });

  it('samme seed gir samme farge når valg mangler', () => {
    expect(fargeFraSeed('kunde-1')).toBe(fargeFraSeed('kunde-1'));
    expect(fargeFraSeed('kunde-1')).not.toBe(fargeFraSeed('kunde-2'));
    expect(losFarge(null, 'kunde-1')).toBe(fargeFraSeed('kunde-1'));
    expect(losFarge('violet')).toBe('violet');
  });

  it('staffFargeStil bruker palett-hex, ikke en annen palett eller invertert tekst', () => {
    const stil = staffFargeStil('bleu');
    expect(stil.borderColor).toBe('#3b93f0');
    expect(stil.backgroundColor).toBe('#3b93f02e');
    expect(stil).not.toHaveProperty('color');
  });
});

describe('skalFølgePeker — gaze bare på profil-header', () => {
  it('ja for alltid + minst 48px', () => {
    expect(skalFølgePeker('alltid', 48)).toBe(true);
    expect(skalFølgePeker('alltid', 56)).toBe(true);
  });

  it('nei for lister, hover og det lille sidebar-ansiktet', () => {
    expect(skalFølgePeker('stille', 32)).toBe(false);
    expect(skalFølgePeker('hover', 48)).toBe(false);
    expect(skalFølgePeker('alltid', 22)).toBe(false);
  });
});
