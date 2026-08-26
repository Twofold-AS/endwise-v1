import { describe, expect, it } from 'vitest';
import {
  kanEndreJobbfunksjon,
  kanHaKallenavn,
  kanTildeles,
  landingForJobbfunksjon,
  resolveJobbfunksjon,
  visningForTraadtype,
  visningsnavn,
} from '../src/profil/index.ts';

/**
 * F7-06 — KALLENAVN-GRENSEN.
 *
 * Testen finnes fordi regelen er lett å bryte ved et uhell: den brytes ikke ved
 * at noen skriver «vis kallenavn til kunden», men ved at noen glemmer å si
 * hvilken visning de vil ha. Derfor tester vi defaulten like hardt som regelen.
 */
describe('visningsnavn — kallenavn vises aldri utad', () => {
  const ola = { navn: 'Ola Mekaniker', kallenavn: 'Skiftenøkkelen' };

  it('bruker kallenavn i intern visning', () => {
    expect(visningsnavn(ola, 'intern')).toBe('Skiftenøkkelen');
  });

  it('bruker EKTE navn i offisiell visning', () => {
    expect(visningsnavn(ola, 'offisiell')).toBe('Ola Mekaniker');
  });

  it('⛔ DEFAULT er ekte navn — en glemt parameter skal ikke lekke', () => {
    expect(visningsnavn(ola)).toBe('Ola Mekaniker');
  });

  it('faller tilbake til ekte navn når kallenavnet er tomt eller bare mellomrom', () => {
    expect(visningsnavn({ navn: 'Ola', kallenavn: '   ' }, 'intern')).toBe('Ola');
    expect(visningsnavn({ navn: 'Ola', kallenavn: null }, 'intern')).toBe('Ola');
    expect(visningsnavn({ navn: 'Ola' }, 'intern')).toBe('Ola');
  });
});

describe('visningForTraadtype', () => {
  it('kundetråd er ALDRI intern', () => {
    expect(visningForTraadtype('customer_dealer')).toBe('offisiell');
  });

  it('mekaniker- og supporttråd er intern', () => {
    expect(visningForTraadtype('mechanic_dealer')).toBe('intern');
    expect(visningForTraadtype('dealer_admin')).toBe('intern');
  });

  it('ukjent trådtype behandles som kundevendt', () => {
    expect(visningForTraadtype('noe_nytt_vi_ikke_har_sett')).toBe('offisiell');
  });
});

describe('kanHaKallenavn — alle innloggede roller, inkl. forhandler-admin', () => {
  it('tillater forhandler-admin, ansatte, mekaniker-roller og Endwise', () => {
    expect(kanHaKallenavn('dealer_admin')).toBe(true);
    expect(kanHaKallenavn('dealer_staff')).toBe(true);
    expect(kanHaKallenavn('endwise_admin')).toBe(true);
    expect(kanHaKallenavn('endwise_support')).toBe(true);
    expect(kanHaKallenavn('owner')).toBe(true);
  });

  it('uten rolle: nei', () => {
    expect(kanHaKallenavn(null)).toBe(false);
    expect(kanHaKallenavn(undefined)).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * F1-13 — JOBBFUNKSJON
 * ══════════════════════════════════════════════════════════════════════════ */

describe('resolveJobbfunksjon — to dimensjoner, aldri blandet', () => {
  it('rollen vinner: en dealer_admin er ALLTID leder', () => {
    expect(resolveJobbfunksjon({ rolle: 'dealer_admin' })).toBe('leder');
    expect(resolveJobbfunksjon({ rolle: 'endwise_admin' })).toBe('leder');
    expect(resolveJobbfunksjon({ rolle: 'owner' })).toBe('leder');
  });

  it('⛔ en lagret funksjon kan IKKE degradere en leder', () => {
    // Scenario: hun var support, ble forfremmet, og raden ble stående.
    // Uten denne regelen hadde hun landet i innboksen uten sidebar.
    expect(resolveJobbfunksjon({ rolle: 'dealer_admin', lagret: 'support' })).toBe('leder');
  });

  it('lagret funksjon gjelder for dealer_staff', () => {
    expect(resolveJobbfunksjon({ rolle: 'dealer_staff', lagret: 'support' })).toBe('support');
    expect(resolveJobbfunksjon({ rolle: 'dealer_staff', lagret: 'selger' })).toBe('selger');
  });

  it('uten lagret verdi utledes den: mekanikerprofil → mekaniker, ellers selger', () => {
    expect(resolveJobbfunksjon({ rolle: 'dealer_staff', harMekanikerprofil: true })).toBe(
      'mekaniker',
    );
    expect(resolveJobbfunksjon({ rolle: 'dealer_staff', harMekanikerprofil: false })).toBe(
      'selger',
    );
    expect(resolveJobbfunksjon({ rolle: 'dealer_staff' })).toBe('selger');
  });

  it('⛔ «leder» lagret på en dealer_staff gir IKKE lederfunksjon', () => {
    // Ville vært å gi lederens landingsvisning uten lederens rettigheter.
    expect(resolveJobbfunksjon({ rolle: 'dealer_staff', lagret: 'leder' })).toBe('selger');
  });
});

describe('landingForJobbfunksjon', () => {
  it('hver funksjon lander der jobben begynner', () => {
    expect(landingForJobbfunksjon('leder')).toBe('/dashboard');
    expect(landingForJobbfunksjon('selger')).toBe('/dashboard');
    expect(landingForJobbfunksjon('support')).toBe('/innboks');
    expect(landingForJobbfunksjon('mekaniker')).toBe('/min-dag');
  });
});

describe('kanEndreJobbfunksjon — kun ledelse', () => {
  it('leder kan', () => {
    expect(kanEndreJobbfunksjon('dealer_admin')).toBe(true);
    expect(kanEndreJobbfunksjon('endwise_admin')).toBe(true);
  });

  it('⛔ dealer_staff kan IKKE — heller ikke på seg selv', () => {
    expect(kanEndreJobbfunksjon('dealer_staff')).toBe(false);
    expect(kanEndreJobbfunksjon(null)).toBe(false);
    expect(kanEndreJobbfunksjon(undefined)).toBe(false);
  });
});

describe('kanTildeles — «leder» kan ikke velges fra en liste', () => {
  it('godtar de tre tildelbare', () => {
    expect(kanTildeles('selger')).toBe(true);
    expect(kanTildeles('support')).toBe(true);
    expect(kanTildeles('mekaniker')).toBe(true);
  });

  it('⛔ avviser «leder» og ukjente verdier', () => {
    expect(kanTildeles('leder')).toBe(false);
    expect(kanTildeles('dealer_admin')).toBe(false);
    expect(kanTildeles('')).toBe(false);
  });
});

describe('funksjon gir ALDRI rettigheter', () => {
  it('selger og support har samme tilgangsforutsetning (begge dealer_staff)', () => {
    // Testen er en påstand om modellen: den eneste forskjellen mellom dem er
    // landingen. Legger noen inn en rettighetsforskjell, må denne endres —
    // og da skal man stoppe opp og lese kommentaren i `profil/index.ts`.
    expect(landingForJobbfunksjon('selger')).not.toBe(landingForJobbfunksjon('support'));
    expect(kanEndreJobbfunksjon('dealer_staff')).toBe(false);
    expect(kanHaKallenavn('dealer_staff')).toBe(true); // begge arver kallenavn
  });
});
