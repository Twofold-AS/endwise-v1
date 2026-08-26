import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F5-55 / F1-10 — UI-lås for lokal kunde og ansatt uten invitasjon.
 * Ingen ny pakke, ingen Mekaniker-pille, ingen Kontor/Gulvet.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F5-55 — Ny kunde på kundesiden', () => {
  const side = les('../app/(app)/kunder/page.tsx');
  const skjema = les('../app/(app)/kunder/_ny-kunde.tsx');

  it('har Ny kunde-knapp på sida, ikke bare i navet', () => {
    expect(side).toMatch(/Ny kunde/);
    expect(side).toMatch(/\/kunder\?ny=1/);
    expect(side).toMatch(/Opprett kunden her/);
    expect(side).not.toMatch(/Kunder opprettes når en booking kommer inn, eller synkes fra Quick/);
  });

  it('skjemaet kaller customers.create og er på norsk', () => {
    expect(skjema).toMatch(/customers\.create/);
    expect(skjema).toMatch(/Opprett kunde/);
    expect(skjema).toMatch(/Bare navnet er påkrevd/);
    expect(skjema).not.toMatch(/Kontor|Gulvet/);
  });
});

describe('F1-10 — Opprett ansatt (e-post valgfri)', () => {
  const team = les('../app/(app)/innstillinger/team/page.tsx');
  const inviter = les('../app/(app)/innstillinger/team/_inviter.tsx');
  const samtale = les('../app/(app)/innboks/_ny-samtale.tsx');

  it('Team har Opprett ansatt — med e-post sender, uten e-post oppretter lokalt', () => {
    expect(team).toMatch(/OpprettAnsatt/);
    expect(team).not.toMatch(/LeggTilUtenInvitasjon/);
    expect(inviter).toMatch(/Opprett ansatt/);
    expect(inviter).not.toMatch(/Inviter ansatt/);
    expect(inviter).toMatch(/valgfri/);
    expect(inviter).toMatch(/invitasjoner\.opprett/);
    expect(inviter).toMatch(/team\.opprettUtenInvitasjon/);
    expect(inviter).toMatch(/mekaniker/);
    expect(inviter).toMatch(/selger/);
    expect(inviter).toMatch(/support/);
    expect(inviter).not.toMatch(/Kontor|Gulvet/);
    expect(inviter).not.toMatch(/Ny ansatt/);
  });

  it('Ny samtale-piller forblir Kunde · Intern · Support — ingen Mekaniker-pille', () => {
    expect(samtale).toMatch(/label: 'Kunde'/);
    expect(samtale).toMatch(/label: 'Intern'/);
    expect(samtale).toMatch(/label: 'Support'/);
    expect(samtale).toMatch(/Ingen fjerde Mekaniker-pille/);
    expect(samtale).not.toMatch(/label: 'Mekaniker'/);
    const piller = samtale.match(/label: '(Kunde|Intern|Support|Mekaniker)'/g) ?? [];
    expect(piller).toEqual(["label: 'Kunde'", "label: 'Intern'", "label: 'Support'"]);
  });
});
