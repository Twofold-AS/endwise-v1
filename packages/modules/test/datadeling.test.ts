import { describe, expect, it } from 'vitest';
import {
  DELING_OMFANG,
  DELING_RETENSJON_DAGER,
  harAktivtSamtykke,
  modellNokkelErTrygg,
} from '../src/datadeling/index.ts';

describe('F36 / white label F13: datadeling', () => {
  it('samtykke krever signert og ikke trukket', () => {
    expect(DELING_OMFANG).toContain('bilder_ai_tagger');
    expect(DELING_RETENSJON_DAGER).toBe(30);
    expect(
      harAktivtSamtykke({
        delingSamtykke: true,
        signertAt: new Date(),
        trukketTilbakeAt: null,
      }),
    ).toBe(true);
    expect(
      harAktivtSamtykke({
        delingSamtykke: true,
        signertAt: new Date(),
        trukketTilbakeAt: new Date(),
      }),
    ).toBe(false);
    expect(modellNokkelErTrygg('honda-crf-2020')).toBe(true);
    expect(modellNokkelErTrygg('regnr-AB12345')).toBe(false);
  });
});
