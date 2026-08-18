import { describe, expect, it } from 'vitest';
import { createStreamRedactor } from '../src/index.ts';

/**
 * F6-18 — L4 for STRØMMENDE svar.
 *
 * Poenget med hele fila: `filterOutput()` er testet mot hele tekster og virker
 * der. Denne testen finnes fordi strømming er en helt annen feilmodus — et
 * fødselsnummer delt over to tokens treffer ingen regex, og teksten er ute i
 * nettleseren før noen kunne filtrert den.
 *
 * Hjelperen under strømmer tegn for tegn, altså verst tenkelige oppdeling.
 */
function stromTegnForTegn(tekst: string): string {
  const r = createStreamRedactor();
  let ut = '';
  for (const tegn of tekst) ut += r.push(tegn);
  return ut + r.flush();
}

/** Strømmer i biter av gitt lengde. */
function stromIBiter(tekst: string, storrelse: number): string {
  const r = createStreamRedactor();
  let ut = '';
  for (let i = 0; i < tekst.length; i += storrelse) {
    ut += r.push(tekst.slice(i, i + storrelse));
  }
  return ut + r.flush();
}

describe('createStreamRedactor (L4 strømmende)', () => {
  it('slipper vanlig tekst gjennom uendret', () => {
    const tekst = 'Bremsene bak bør sjekkes. Jeg foreslår Liten service.';
    expect(stromTegnForTegn(tekst)).toBe(tekst);
  });

  it('⛔ fjerner fødselsnummer selv når det kommer ett tegn om gangen', () => {
    const tekst = 'Kunden oppga 12345678901 som personnummer, men det trenger vi ikke.';
    const ut = stromTegnForTegn(tekst);
    expect(ut).not.toContain('12345678901');
    expect(ut).toContain('[FØDSELSNUMMER FJERNET]');
  });

  it('⛔ fjerner API-nøkkel uansett hvor bitene brekker', () => {
    const tekst = 'Nøkkelen er sk-abcdefghijklmnopqrstuvwxyz012345 og den er hemmelig.';
    // Alle oppdelinger fra 1 til 17 tegn — grensen skal ikke kunne treffes.
    for (let storrelse = 1; storrelse <= 17; storrelse += 1) {
      const ut = stromIBiter(tekst, storrelse);
      expect(ut, `bitstørrelse ${storrelse}`).not.toContain('sk-abcdefghijklmnopqrstuvwxyz');
      expect(ut, `bitstørrelse ${storrelse}`).toContain('[API-NØKKEL FJERNET]');
    }
  });

  it('⛔ fjerner DB-URL, som ikke har noen øvre lengde', () => {
    const tekst = 'Koble til postgresql://bruker:passord@db.example.com:5432/endwise for å se.';
    const ut = stromTegnForTegn(tekst);
    expect(ut).not.toContain('passord');
    expect(ut).toContain('[DB-URL FJERNET]');
  });

  it('gir NØYAKTIG samme resultat som om teksten kom i ett stykke', () => {
    const tekst =
      'Se sk-aaaaaaaaaaaaaaaaaaaaaaaa og 98765432109 og postgres://a:b@c/d — alt sammen.';
    const ettStykke = createStreamRedactor();
    const forventet = ettStykke.push(tekst) + ettStykke.flush();
    expect(stromTegnForTegn(tekst)).toBe(forventet);
    expect(stromIBiter(tekst, 3)).toBe(forventet);
    expect(stromIBiter(tekst, 7)).toBe(forventet);
  });

  it('⚠️ tolker ikke tolv sifre som fødselsnummer, heller ikke på bitgrensen', () => {
    // Regelen er ELLEVE sifre. Kjørte vi regexen på en avkuttet buffer, ville
    // `\b` truffet midt i tallet og gjort 12 sifre om til et «fødselsnummer».
    const tekst = `Ordrenummer ${'1'.repeat(12)} er registrert.`;
    for (let storrelse = 1; storrelse <= 9; storrelse += 1) {
      expect(stromIBiter(tekst, storrelse), `bitstørrelse ${storrelse}`).toBe(tekst);
    }
  });

  it('teller treff, og teller det samme treffet bare én gang', () => {
    const r = createStreamRedactor();
    for (const tegn of 'a 12345678901 b') r.push(tegn);
    r.flush();
    expect(r.antallTreff).toBe(1);
  });

  it('flush tømmer resten når svaret er kortere enn holdback-vinduet', () => {
    const r = createStreamRedactor();
    const sendt = r.push('Kort svar.');
    // Alt holdes tilbake — teksten er kortere enn vinduet.
    expect(sendt).toBe('');
    expect(r.flush()).toBe('Kort svar.');
  });
});
