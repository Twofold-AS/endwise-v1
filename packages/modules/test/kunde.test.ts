import { describe, expect, it } from 'vitest';
import {
  byggVarsler,
  formaterKjoretoy,
  JOBB_FASER,
  jobbFase,
  jobbFaseKort,
  jobbFremdriftProsent,
  KUNDE_BUTIKK_BLOKKERT,
  KUNDE_VIPPS_AKTIV,
  kundeButikkStatus,
  rensKundeMelding,
  velgAktivJobb,
} from '../src/kunde/index.ts';

describe('F33 / white label F11b: kunde handling', () => {
  it('jobbfase er Mottatt · Under arbeid · Klar', () => {
    expect(JOBB_FASER).toEqual(['Mottatt', 'Under arbeid', 'Klar']);
    expect(jobbFase('draft')).toEqual({ merkelapp: 'Mottatt', steg: 0 });
    expect(jobbFase('confirmed')).toEqual({ merkelapp: 'Mottatt', steg: 0 });
    expect(jobbFase('in_progress')).toEqual({ merkelapp: 'Under arbeid', steg: 1 });
    expect(jobbFase('completed')).toEqual({ merkelapp: 'Klar', steg: 2 });
    expect(jobbFase('cancelled').steg).toBe(-1);
  });

  it('rensKundeMelding feiler lukket mot tomt og for langt', () => {
    expect(rensKundeMelding('  hei  ')).toBe('hei');
    expect(() => rensKundeMelding('   ')).toThrow(/Skriv en melding/);
    expect(() => rensKundeMelding('x'.repeat(2001))).toThrow(/maks 2000/);
  });

  it('F42-04: aktiv jobb, kjøretøytekst og verkstedvarsler uten chat', () => {
    expect(jobbFaseKort({ merkelapp: 'Klar', steg: 2 })).toBe('Ferdig');
    expect(jobbFremdriftProsent(0)).toBe(33);
    expect(jobbFremdriftProsent(1)).toBe(66);
    expect(jobbFremdriftProsent(2)).toBe(100);
    expect(
      formaterKjoretoy({ type: 'mc', make: 'Yamaha', model: 'MT-07', regNumber: 'AB12345' }),
    ).toBe('Yamaha MT-07 · AB12345');
    expect(velgAktivJobb([{ status: 'completed' }, { status: 'in_progress' }])?.status).toBe(
      'in_progress',
    );
    const naa = new Date('2026-11-05T12:00:00+01:00');
    const varsler = byggVarsler(
      [
        {
          id: '1',
          status: 'in_progress',
          tjeneste: 'Service',
          kjoretoy: 'sykkel',
          startsAt: naa,
        },
        {
          id: '2',
          status: 'confirmed',
          tjeneste: 'EU-kontroll',
          kjoretoy: 'MC',
          startsAt: new Date('2026-11-06T10:00:00+01:00'),
        },
      ],
      naa,
    );
    expect(varsler.some((v) => v.tekst === 'Vi jobber nå på din sykkel')).toBe(true);
    expect(varsler.some((v) => v.slags === 'paminnelse')).toBe(true);
    expect(varsler.every((v) => v.href === '/bookinger')).toBe(true);
  });

  it('butikk er stengt og Vipps av (F10-03)', () => {
    expect(KUNDE_BUTIKK_BLOKKERT).toBe(true);
    expect(KUNDE_VIPPS_AKTIV).toBe(false);
    expect(kundeButikkStatus()).toEqual({
      apen: false,
      grunn: 'shop_blokkert',
      vipps: false,
      varer: [],
    });
  });
});
