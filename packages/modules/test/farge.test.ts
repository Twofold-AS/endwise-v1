import { describe, expect, it } from 'vitest';
import { BLOUB_FARGE_IDER, fargeFraHue, nesteFarge } from '../src/profil/farge.ts';
import { lesAvatar } from '../src/profil/index.ts';

describe('nesteFarge — én per ansatt, sykler etter 12', () => {
  it('gir første ledige i palettrekkefølge', () => {
    expect(nesteFarge([])).toBe('encre');
    expect(nesteFarge(['encre'])).toBe('brun');
    expect(nesteFarge(['encre', 'brun', 'rouge'])).toBe('orange');
  });

  it('sykler når alle 12 er i bruk', () => {
    expect(nesteFarge([...BLOUB_FARGE_IDER])).toBe('encre');
    expect(nesteFarge([...BLOUB_FARGE_IDER, 'encre'])).toBe('brun');
  });
});

describe('lesAvatar — ColorId er kilden', () => {
  it('foretrekker avatarColor over leftover hue', () => {
    expect(lesAvatar({ avatarColor: 'violet', avatarHue: 20 }).farge).toBe('violet');
  });

  it('mapper gammel hue når color mangler', () => {
    expect(lesAvatar({ avatarHue: 250 }).farge).toBe('bleu');
    expect(fargeFraHue(20)).toBe('rouge');
  });

  it('tom rad gir null — ikke en hue', () => {
    expect(lesAvatar(null).farge).toBeNull();
  });
});
