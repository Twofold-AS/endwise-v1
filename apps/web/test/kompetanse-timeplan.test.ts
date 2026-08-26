import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { nivaTekst, sertStatus, tilNokkel } from '../app/(app)/mekanikere/kompetanse/_niva';

/**
 * P2 — Organisasjon › Kompetanse og Timeplan er ekte flater, ikke Placeholder.
 * Last og lagring går mot eksisterende tabeller (skills / mechanic_skills /
 * mechanics.capacity / bookings).
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Organisasjon › Kompetanse er katalog, ikke per-mekaniker', () => {
  const side = utenKommentarer(les('../app/(app)/mekanikere/kompetanse/page.tsx'));
  const katalog = utenKommentarer(les('../app/(app)/mekanikere/kompetanse/_katalog.tsx'));
  const mek = utenKommentarer(les('../app/(app)/mekanikere/kompetanse/_mekaniker.tsx'));
  const niva = les('../app/(app)/mekanikere/kompetanse/_niva.ts');

  it('er ikke lenger en Placeholder, og viser katalogen', () => {
    expect(side).not.toMatch(/Placeholder/);
    expect(side).toMatch(/competence\.listSkills/);
    expect(side).toMatch(/Ferdighetskatalog/);
    expect(side).not.toMatch(/Per mekaniker/);
    expect(side).not.toMatch(/mechanics\.oversikt/);
    expect(side).not.toMatch(/listAllMechanicSkills/);
    expect(side).not.toMatch(/MekanikerKompetanse/);
  });

  it('laster katalog og kompetanse, lagrer via setMechanicSkill / upsertSkill', () => {
    expect(katalog).toMatch(/competence\.upsertSkill/);
    expect(mek).toMatch(/competence\.setMechanicSkill/);
    expect(mek).toMatch(/competence\.removeMechanicSkill/);
    expect(mek).toMatch(/Lagre/);
  });

  it('viser nivå som ord, og sert. t.o.m. som på Min kompetanse', () => {
    expect(niva).toMatch(/Under opplæring/);
    expect(niva).toMatch(/Selvstendig/);
    expect(niva).toMatch(/Spesialist/);
    expect(niva).toMatch(/sert\. t\.o\.m\./);
    expect(mek).toMatch(/nivaTekst/);
    expect(mek).toMatch(/sertStatus/);
  });

  it('nøkkel og nivåord følger registeret', () => {
    expect(tilNokkel('EU-kontroll MC')).toBe('eu-kontroll-mc');
    expect(nivaTekst(1)).toBe('Under opplæring');
    expect(nivaTekst(5)).toBe('Spesialist');
    const utlopt = sertStatus(new Date(Date.now() - 86_400_000).toISOString());
    expect(utlopt?.tone).toBe('text-danger');
    expect(utlopt?.tekst).toMatch(/utløpt/);
  });

  it('rører ikke Tjenester & priser eller Prislisten som fakturamodell', () => {
    expect(side).not.toMatch(/Tjenester & priser/);
    expect(side).not.toMatch(/stripe/i);
  });
});

describe('Organisasjon › Timeplan er ekte liste + redigering', () => {
  const side = utenKommentarer(les('../app/(app)/mekanikere/kapasitet/page.tsx'));

  it('er ikke lenger en Placeholder', () => {
    expect(side).not.toMatch(/Placeholder/);
    expect(side).toMatch(/mechanics\.oversikt/);
    expect(side).toMatch(/bookings\.calendar/);
  });

  it('laster kapasitet og dagens jobber, lagrer via updateCapacity', () => {
    expect(side).toMatch(/mechanics\.updateCapacity/);
    expect(side).toMatch(/capacity/);
    expect(side).toMatch(/Lagre/);
    expect(side).toMatch(/Ingen jobber denne dagen/);
  });

  it('gjenbruker Timeplan-språket fra Min dag, ikke en ny modell', () => {
    expect(side).toMatch(/dagListe|weekday/);
    expect(side).toMatch(/fmtTime/);
    expect(side).toMatch(/STATUS_LABEL/);
    expect(side).toMatch(/Samtidige jobber/);
    expect(side).not.toMatch(/Kontor/);
    expect(side).not.toMatch(/Gulvet/);
  });
});

describe('tRPC-skrivestier for Kompetanse og Timeplan', () => {
  const competence = les('../../api/src/trpc/routers/competence.ts');
  const mechanics = les('../../api/src/trpc/routers/mechanics.ts');

  it('kompetanse-skriving er adminProcedure', () => {
    expect(competence).toMatch(/listAllMechanicSkills/);
    expect(competence).toMatch(/setMechanicSkill: adminProcedure/);
    expect(competence).toMatch(/upsertSkill: adminProcedure/);
  });

  it('kapasitet-skriving er adminProcedure mot mechanics.capacity', () => {
    expect(mechanics).toMatch(/updateCapacity: adminProcedure/);
    expect(mechanics).toMatch(/updateMechanicCapacity/);
  });
});
