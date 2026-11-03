import { describe, expect, it } from 'vitest';
import {
  EIER_OVERFOR_FEIL,
  kanStarteNod,
  kanUtforeNod,
  nesteNodGodkjenning,
  nodUtforEtter,
  rensTillatelser,
} from '../src/eier-overforing/index.ts';

describe('F29 / white label F8c: eier-overføring', () => {
  it('stedfortreder eller Endwise kan starte nød, ikke vanlig ansatt', () => {
    expect(kanStarteNod({ erEndwiseAdmin: true, erStedfortreder: false })).toBe(true);
    expect(kanStarteNod({ erEndwiseAdmin: false, erStedfortreder: true })).toBe(true);
    expect(kanStarteNod({ erEndwiseAdmin: false, erStedfortreder: false })).toBe(false);
  });

  it('to ulike Endwise-admin, ingen selvgodkjenning', () => {
    expect(nesteNodGodkjenning({ aktorId: 'a', godkjenner1: null, godkjenner2: null })).toEqual({
      ok: true,
      felt: 'godkjenner1',
    });
    expect(nesteNodGodkjenning({ aktorId: 'a', godkjenner1: 'a', godkjenner2: null })).toEqual({
      ok: false,
      grunn: EIER_OVERFOR_FEIL,
    });
    expect(nesteNodGodkjenning({ aktorId: 'b', godkjenner1: 'a', godkjenner2: null })).toEqual({
      ok: true,
      felt: 'godkjenner2',
    });
  });

  it('nød krever to godkjenninger og 7 dager', () => {
    const now = new Date('2026-11-10T12:00:00.000Z');
    const etter = nodUtforEtter(new Date('2026-11-03T12:00:00.000Z'));
    expect(etter.getTime()).toBe(now.getTime());
    expect(
      kanUtforeNod({
        status: 'godkjent',
        godkjenner1: 'a',
        godkjenner2: 'b',
        utforEtter: etter,
        now,
      }),
    ).toBe(true);
    expect(
      kanUtforeNod({
        status: 'venter',
        godkjenner1: 'a',
        godkjenner2: 'b',
        utforEtter: etter,
        now,
      }),
    ).toBe(false);
  });

  it('tillatelser renses mot kjente områder', () => {
    expect(rensTillatelser({ bookinger: 'endre', hemmelig: 'endre', kunder: 'nei' })).toEqual({
      bookinger: 'endre',
    });
  });
});
