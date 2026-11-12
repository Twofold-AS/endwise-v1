import { describe, expect, it } from 'vitest';
import {
  avgjorBeOmKode,
  beOmKodeSvar,
  byggVarsler,
  formaterKjoretoy,
  JOBB_FASER,
  jobbFase,
  jobbFaseKort,
  jobbFremdriftProsent,
  KUNDE_BUTIKK_BLOKKERT,
  KUNDE_KODE_FEIL,
  KUNDE_KODE_FOR_MANGE,
  KUNDE_KODE_SENDT,
  KUNDE_VIPPS_AKTIV,
  kundeButikkStatus,
  kundeKodeFeilMelding,
  rensKundeMelding,
  ukjentKundeMelding,
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

  it('beOmKode: ukjent e-post hos denne forhandleren — ingen sending', () => {
    expect(
      avgjorBeOmKode({
        tillatt: true,
        tenantId: 'tenant-bergen',
        harIdent: true,
        kundeEpost: null,
      }),
    ).toEqual({ handling: 'stopp', grunn: 'ukjent-kunde' });
    expect(
      avgjorBeOmKode({
        tillatt: true,
        tenantId: 'tenant-bergen',
        harIdent: true,
        kundeEpost: '   ',
      }),
    ).toEqual({ handling: 'stopp', grunn: 'ukjent-kunde' });
    expect(
      avgjorBeOmKode({
        tillatt: true,
        tenantId: null,
        harIdent: true,
        kundeEpost: 'ola@kunde.no',
      }),
    ).toEqual({ handling: 'stopp', grunn: 'ukjent-kunde' });
    expect(
      avgjorBeOmKode({
        tillatt: true,
        tenantId: 'tenant-bergen',
        harIdent: false,
        kundeEpost: 'ola@kunde.no',
      }),
    ).toEqual({ handling: 'stopp', grunn: 'ukjent-kunde' });
    expect(beOmKodeSvar({ handling: 'stopp', grunn: 'ukjent-kunde' })).toEqual({
      sendt: false,
      grunn: 'ukjent-kunde',
    });
  });

  it('beOmKode: kjent kunde får sending, rate-limit og feil stopper', () => {
    expect(
      avgjorBeOmKode({
        tillatt: true,
        tenantId: 'tenant-bergen',
        harIdent: true,
        kundeEpost: ' Kari@Bergen.no ',
      }),
    ).toEqual({ handling: 'send', epost: 'kari@bergen.no' });
    expect(beOmKodeSvar({ handling: 'send', epost: 'kari@bergen.no' })).toEqual({ sendt: true });
    expect(
      avgjorBeOmKode({
        tillatt: false,
        tenantId: 'tenant-bergen',
        harIdent: true,
        kundeEpost: 'kari@bergen.no',
      }),
    ).toEqual({ handling: 'stopp', grunn: 'for-mange' });
    expect(beOmKodeSvar({ handling: 'stopp', grunn: 'for-mange' })).toEqual({
      sendt: false,
      grunn: 'for-mange',
    });
    expect(beOmKodeSvar({ handling: 'stopp', grunn: 'feil' })).toEqual({
      sendt: false,
      grunn: 'feil',
    });
  });

  it('ukjent kunde får ærlig norsk melding med forhandlernavn', () => {
    expect(ukjentKundeMelding('Bergen Motorsykkel')).toBe(
      'Vi finner ingen kunde med denne e-posten hos Bergen Motorsykkel.',
    );
    expect(ukjentKundeMelding('Bergen Motorsykkel', 'epost')).toBe(
      'Vi finner ingen kunde med denne e-posten hos Bergen Motorsykkel.',
    );
    expect(ukjentKundeMelding('Bergen Motorsykkel', 'telefon')).toBe(
      'Vi finner ingen kunde med dette nummeret hos Bergen Motorsykkel.',
    );
    expect(ukjentKundeMelding('   ')).toBe(
      'Vi finner ingen kunde med denne e-posten hos denne forhandleren.',
    );
    expect(kundeKodeFeilMelding('ukjent-kunde', 'Bergen', 'epost')).toBe(
      'Vi finner ingen kunde med denne e-posten hos Bergen.',
    );
    expect(kundeKodeFeilMelding('for-mange', 'Bergen', 'epost')).toBe(KUNDE_KODE_FOR_MANGE);
    expect(kundeKodeFeilMelding('feil', 'Bergen', 'telefon')).toBe(KUNDE_KODE_FEIL);
    expect(KUNDE_KODE_SENDT).toBe('Vi har sendt en kode til e-posten din.');
    expect(KUNDE_KODE_SENDT).not.toMatch(/Hvis kontoen finnes/);
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
