import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HELPDESK_MIN, hjelpeartikkelLagreHint } from '../app/(app)/endwise/helpdesk/lagre-hint.ts';

/**
 * F5-23 — Opprett/Lagre på /endwise/helpdesk var disabled uten forklaring
 * når tittel/ingress/brødtekst var under server-Zod-minima.
 * Hintet speiler `artikkelFelter` i helpdesk-ruta. Første felt som feiler.
 */
describe('hjelpeartikkelLagreHint', () => {
  const ok = {
    title: 'abc',
    summary: '0123456789',
    body: '0123456789',
  };

  it('er stille når alle felt møter server-minima', () => {
    expect(hjelpeartikkelLagreHint(ok)).toBeNull();
  });

  it('teller trimmet lengde, ikke rå mellomrom', () => {
    expect(
      hjelpeartikkelLagreHint({
        title: '  ab  ',
        summary: ok.summary,
        body: ok.body,
      }),
    ).toBe('Overskrift må være minst 3 tegn');
    expect(
      hjelpeartikkelLagreHint({
        title: '  abc  ',
        summary: ok.summary,
        body: ok.body,
      }),
    ).toBeNull();
  });

  it('viser bare første felt som feiler — overskrift før ingress før brødtekst', () => {
    expect(hjelpeartikkelLagreHint({ title: '', summary: '', body: '' })).toBe(
      'Overskrift må være minst 3 tegn',
    );
    expect(hjelpeartikkelLagreHint({ title: 'abc', summary: 'kort', body: '' })).toBe(
      'Ingress må være minst 10 tegn',
    );
    expect(hjelpeartikkelLagreHint({ title: 'abc', summary: '0123456789', body: 'kort' })).toBe(
      'Brødtekst må være minst 10 tegn',
    );
  });

  it('speiler server-Zod-minima (3 / 10 / 10)', () => {
    expect(HELPDESK_MIN).toEqual({ title: 3, summary: 10, body: 10 });
  });
});

describe('F5-23: /endwise/helpdesk forklarer hvorfor Opprett er låst', () => {
  const her = dirname(fileURLToPath(import.meta.url));
  const side = readFileSync(resolve(her, '../app/(app)/endwise/helpdesk/page.tsx'), 'utf8');
  const rute = readFileSync(resolve(her, '../../api/src/trpc/routers/helpdesk.ts'), 'utf8');
  const utenKommentarer = side.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('klienten bruker samme minima som server-Zod', () => {
    expect(rute).toMatch(/title:\s*z\.string\(\)\.trim\(\)\.min\(3\)/);
    expect(rute).toMatch(/summary:\s*z\.string\(\)\.trim\(\)\.min\(10\)/);
    expect(rute).toMatch(/body:\s*z\.string\(\)\.trim\(\)\.min\(10\)/);
    expect(utenKommentarer).toMatch(/hjelpeartikkelLagreHint/);
    expect(utenKommentarer).toMatch(/HELPDESK_MIN/);
  });

  it('viser muted hint under handlingene og peker knappen dit', () => {
    expect(utenKommentarer).toMatch(/id=["']helpdesk-lagre-hint["']/);
    expect(utenKommentarer).toMatch(/aria-describedby=\{lagreHint \? ['"]helpdesk-lagre-hint['"]/);
    expect(utenKommentarer).toMatch(/title=\{lagreHint/);
    expect(utenKommentarer).toMatch(/text-fg-muted/);
  });

  it('viser live tegntelling på ingress mot 10-tegnsminimumet', () => {
    expect(utenKommentarer).toMatch(/summary\.trim\(\)\.length\s*}\/\{HELPDESK_MIN\.summary/);
  });

  it('rører ikke prosedyrer, RLS eller bildelisten', () => {
    expect(side).toMatch(/endwiseAdminProcedure|helpdesk\.(opprett|oppdater|alle)/);
    expect(utenKommentarer).toMatch(/const BILDER = \['\/images\/hero\.jpg'/);
    expect(utenKommentarer).not.toMatch(/CREATE POLICY|ENABLE ROW LEVEL SECURITY/);
  });
});
