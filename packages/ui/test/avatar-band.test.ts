import { readFileSync } from 'node:fs';
import { _layout, blobatar } from 'blobatar';
import { describe, expect, it } from 'vitest';
import { skalFølgePeker } from '../src/components/avatar.tsx';

/**
 * Seeden eier ansiktet. Form- og tone-bånd er ute — velgeren pinner
 * dem ikke lenger, og `Avatar` sender dem ikke til biblioteket.
 */

describe('F6-19 — avatarens seed', () => {
  it('samme seed gir samme ansikt — det er hele poenget', () => {
    expect(blobatar('kunde-1', { normalize: false })).toBe(
      blobatar('kunde-1', { normalize: false }),
    );
  });

  it('ulik seed gir ulikt ansikt', () => {
    expect(blobatar('kunde-1', { normalize: false })).not.toBe(
      blobatar('kunde-2', { normalize: false }),
    );
  });

  it('⛔ seeden normaliseres IKKE — «Ola» og «ola» er to ulike IDer', () => {
    expect(blobatar('Ola', { normalize: false })).not.toBe(blobatar('ola', { normalize: false }));
  });

  it('hue alene endrer paletten, ikke silhuetten', () => {
    const uten = _layout('kunde-1', { normalize: false });
    const medHue = _layout('kunde-1', { hue: 150, normalize: false });
    expect(medHue.shape).toBe(uten.shape);
    expect(JSON.stringify(medHue.palette)).not.toBe(JSON.stringify(uten.palette));
  });
});

describe('Avatar — leftover form/humor/tone rører ikke ansiktet', () => {
  const kilde = readFileSync(new URL('../src/components/avatar.tsx', import.meta.url), 'utf8');

  it('importerer ikke expression-positurer og har ingen FORM_BAND / TONE_BAND', () => {
    expect(kilde).not.toMatch(/from ['"]blobatar\/expression['"]/);
    expect(kilde).not.toMatch(/FORM_BAND/);
    expect(kilde).not.toMatch(/TONE_BAND/);
    expect(kilde).not.toMatch(/traits:\s*\{[^}]*shape/);
    expect(kilde).not.toMatch(/expression:/);
  });

  it('bruker blobatar gaze på det store alltid-ansiktet', () => {
    expect(kilde).toMatch(/from ['"]@blobatar\/react\/gaze['"]/);
    expect(kilde).toMatch(/useGaze/);
    expect(kilde).toMatch(/lookAt:\s*skalFølgePeker/);
  });
});

describe('skalFølgePeker — gaze bare på profil-header', () => {
  it('ja for alltid + minst 48px', () => {
    expect(skalFølgePeker('alltid', 48)).toBe(true);
    expect(skalFølgePeker('alltid', 56)).toBe(true);
    expect(skalFølgePeker('alltid', 64)).toBe(true);
  });

  it('nei for lister, hover og det lille sidebar-ansiktet', () => {
    expect(skalFølgePeker('stille', 32)).toBe(false);
    expect(skalFølgePeker('stille', 56)).toBe(false);
    expect(skalFølgePeker('hover', 48)).toBe(false);
    expect(skalFølgePeker('alltid', 22)).toBe(false);
    expect(skalFølgePeker('alltid', 28)).toBe(false);
  });
});
