import { describe, expect, it } from 'vitest';
import { splSlots } from '../app/%5Fkunde/_lib/bencho/spl-matte.ts';
import {
  kjoretoyKortNavn,
  kjoretoyTrefferSok,
  medDemoFyll,
} from '../app/%5Fkunde/_lib/kjoretoy-kort-data.ts';

const mt07 = {
  id: 'a',
  type: 'mc',
  merke: 'Yamaha',
  modell: 'MT-07',
  aarsmodell: '2021',
  regnr: 'EK12345',
  faseSteg: 1,
};

describe('kundesidens kjøretøy-kort (context-meter)', () => {
  it('tittel er kjøretøyets navn, ellers «Finner ingen eierskap»', () => {
    expect(kjoretoyKortNavn(mt07)).toBe('Yamaha MT-07');
    expect(kjoretoyKortNavn({ ...mt07, merke: null })).toBe('MT-07');
    expect(kjoretoyKortNavn({ ...mt07, merke: null, modell: null })).toBe('MC');
    expect(kjoretoyKortNavn({ ...mt07, merke: null, modell: null, type: 'boat' })).toBe('Båt');
    expect(kjoretoyKortNavn(null)).toBe('Finner ingen eierskap');
  });

  it('demo-fyll topper opp til tre kort uten å duplisere regnr', () => {
    expect(medDemoFyll([])).toHaveLength(3);
    expect(medDemoFyll([mt07])).toHaveLength(3);
    const utenDuplikat = medDemoFyll([mt07]);
    expect(utenDuplikat.filter((k) => k.regnr === 'EK12345')).toHaveLength(1);
    const fire = [mt07, { ...mt07, id: 'b' }, { ...mt07, id: 'c' }, { ...mt07, id: 'd' }];
    expect(medDemoFyll(fire)).toHaveLength(4);
  });

  it('søk treffer modell, merke og regnr', () => {
    expect(kjoretoyTrefferSok(mt07, '')).toBe(true);
    expect(kjoretoyTrefferSok(mt07, 'mt')).toBe(true);
    expect(kjoretoyTrefferSok(mt07, 'yamaha')).toBe(true);
    expect(kjoretoyTrefferSok(mt07, 'ek12345')).toBe(true);
    expect(kjoretoyTrefferSok(mt07, 'polaris')).toBe(false);
  });
});

describe('kundesidens step-player', () => {
  it('aktiv slot er 36px pill, resten 8px prikker med 8px gap (Bencho-mål)', () => {
    const slots = splSlots(3, 1);
    expect(slots).toEqual([
      { x: 0, w: 8 },
      { x: 16, w: 36 },
      { x: 60, w: 8 },
    ]);
    expect(splSlots(3, 0)[0]).toEqual({ x: 0, w: 36 });
  });
});
