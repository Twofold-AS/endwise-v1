import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import {
  erTeamFane,
  parseTeamFane,
  TEAM_FANER,
  teamHref,
} from '../app/(app)/innstillinger/team/_faner.ts';

/**
 * Mikael — Team-polish: Organisasjon, piller Ansatte + Opprett ansatt,
 * detaljpane uten scroll, Slett sist. Ingen Admin-tab. Ingen Kontor/Gulvet.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Team-piller som Innstillinger ?fane=', () => {
  it('har Ansatte · Mekanikere · Selgere · Support · Opprett ansatt — Ansatte er default', () => {
    expect(TEAM_FANER.map((f) => f.id)).toEqual([
      'alle',
      'mekanikere',
      'selgere',
      'support',
      'opprett',
    ]);
    expect(TEAM_FANER.map((f) => f.label)).toEqual([
      'Ansatte',
      'Mekanikere',
      'Selgere',
      'Support',
      'Opprett ansatt',
    ]);
    expect(parseTeamFane(null)).toBe('alle');
    expect(parseTeamFane('selgere')).toBe('selgere');
    expect(parseTeamFane('opprett')).toBe('opprett');
    expect(parseTeamFane('ukjent')).toBe('alle');
    expect(erTeamFane('mekanikere')).toBe(true);
    expect(teamHref('support')).toBe('/innstillinger/team?fane=support');
    expect(teamHref('opprett')).toBe('/innstillinger/team?fane=opprett');
  });

  it('Team-siden leser ?fane= og filtrerer på eksisterende jobbfunksjon', () => {
    const side = les('../app/(app)/innstillinger/team/page.tsx');
    const liste = les('../app/(app)/innstillinger/team/_liste.tsx');
    expect(side).toMatch(/parseTeamFane/);
    expect(side).toMatch(/\?fane=/);
    expect(side).toMatch(/role="tablist"/);
    expect(liste).toMatch(/funksjon === 'selger'/);
    expect(liste).toMatch(/funksjon === 'support'/);
    expect(liste).toMatch(/funksjon === 'mekaniker'/);
    expect(liste).toMatch(/Ingen selgere ennå|Ingen i denne gruppen/);
    expect(side).not.toMatch(/Kontor|Gulvet/);
    expect(side).not.toMatch(/label:\s*'Admin'/);
  });

  it('Mekanikere-pillen gjenbruker occupancy-flaten, ikke en kobber-feature', () => {
    const mek = les('../app/(app)/innstillinger/team/_mekanikere-pille.tsx');
    expect(mek).toMatch(/mechanics\.oversikt/);
    expect(mek).toMatch(/statusLabel/);
    expect(mek).toMatch(/jobberIDag/);
    expect(mek).toMatch(/capacity/);
    expect(mek).toMatch(/Detaljer/);
    expect(mek).toMatch(/ArrowUpRight/);
    expect(mek).not.toMatch(/kobber|copper/i);
  });

  it('Ansatte/Selgere/Support-radene viser occupancy-status, ærlig uten belegg', () => {
    const liste = les('../app/(app)/innstillinger/team/_liste.tsx');
    expect(liste).toMatch(/StatusMerke/);
    expect(liste).toMatch(/statusLabel/);
    const status = les('../app/(app)/innstillinger/team/_status.tsx');
    expect(status).toMatch(/Ingen status/);
    expect(status).not.toMatch(/bg-success.*Ingen/);
  });
});

describe('Opprett ansatt — e-post valgfri, egen pille', () => {
  const inviter = les('../app/(app)/innstillinger/team/_inviter.tsx');
  const side = les('../app/(app)/innstillinger/team/page.tsx');
  const velger = les('../app/(app)/innstillinger/team/_kompetanse-velger.tsx');

  it('har én handling på Opprett-pillen, ikke modal på lista', () => {
    expect(inviter).toMatch(/Opprett ansatt/);
    expect(inviter).toMatch(/valgfri/);
    expect(inviter).toMatch(/invitasjoner\.opprett/);
    expect(inviter).toMatch(/team\.opprettUtenInvitasjon/);
    expect(inviter).toMatch(/KompetanseVelger/);
    expect(inviter).toMatch(/Samtidige jobber/);
    expect(inviter).toMatch(/capacity/);
    expect(velger).toMatch(/competence\.listSkills/);
    expect(velger).toMatch(/NIVA_VALG/);
    expect(inviter).not.toMatch(/Ny ansatt/);
    expect(inviter).not.toMatch(/Send invitasjon/);
    expect(inviter).not.toMatch(/Legg til uten invitasjon/);
    expect(side).not.toMatch(/LeggTilUtenInvitasjon/);
    expect(side).not.toMatch(/_legg-til/);
    expect(side).toMatch(/fane === 'opprett'/);
  });

  it('ingen «Inviter ansatt»-streng', () => {
    expect(inviter).not.toMatch(/Inviter ansatt/);
    expect(side).not.toMatch(/Inviter ansatt/);
    expect(les('../app/(app)/innstillinger/team/_liste.tsx')).not.toMatch(/Inviter ansatt/);
    expect(les('../app/(app)/innstillinger/team/_mekanikere-pille.tsx')).not.toMatch(
      /Inviter ansatt/,
    );
  });

  it('med e-post kalles invitasjon, uten e-post kalles opprett uten invitasjon', () => {
    expect(inviter).toMatch(/epost\.trim\(\)/);
    expect(inviter).toMatch(/opprettInvitasjon\.mutate/);
    expect(inviter).toMatch(/opprettLokal\.mutate/);
  });
});

describe('Detaljpane som Innboks — fast høyde uten indre scroll', () => {
  const detaljer = utenKommentarer(les('../app/(app)/innstillinger/team/_detaljer.tsx'));
  const liste = les('../app/(app)/innstillinger/team/_liste.tsx');
  const innboks = utenKommentarer(les('../app/(app)/innboks/_detaljer.tsx'));
  const slot = utenKommentarer(les('../app/(app)/innboks/_detaljer-slot.tsx'));

  it('listen er kompakt og åpner Detaljer med ArrowUpRight', () => {
    expect(liste).toMatch(/Detaljer/);
    expect(liste).toMatch(/ArrowUpRight/);
    expect(liste).toMatch(/onVelg/);
    expect(detaljer).toMatch(/aria-label="Detaljer om den ansatte"/);
    expect(detaljer).toMatch(/w-\[320px\]/);
    expect(detaljer).toMatch(/PanelRightClose/);
  });

  it('panelet viser person, planlagte jobber, e-post, passord, 2FA, kompetanse, timeplan og Slett sist', () => {
    expect(detaljer).toMatch(/Planlagte jobber/);
    expect(detaljer).not.toMatch(/Jobber hen gjør|Jobben hen gjør/);
    expect(detaljer).toMatch(/team\.jobber/);
    expect(detaljer).toMatch(/E-postendring|Ny e-post/);
    expect(detaljer).toMatch(/team\.endreEpost/);
    expect(detaljer).toMatch(/Send passordendring/);
    expect(detaljer).toMatch(/team\.sendPassordendring/);
    expect(detaljer).toMatch(/Slå av 2FA/);
    expect(detaljer).toMatch(/team\.slaAv2faStart/);
    expect(detaljer).toMatch(/team\.slaAv2fa/);
    expect(detaljer).toMatch(/Slett/);
    expect(detaljer).toMatch(/team\.fjern/);
    expect(detaljer).toMatch(/Kompetanse/);
    expect(detaljer).toMatch(/statusLabel/);
    expect(detaljer).toMatch(/Timeplan/);
    expect(detaljer).toMatch(/MekanikerKompetanse|competence\.listAllMechanicSkills/);
    const slett = detaljer.lastIndexOf('SlettAnsatt');
    const komp = detaljer.lastIndexOf('KompetanseSeksjon');
    const tid = detaljer.lastIndexOf('TimeplanSeksjon');
    expect(slett).toBeGreaterThan(komp);
    expect(slett).toBeGreaterThan(tid);
    expect(detaljer).toMatch(/bg-danger[\s\S]*text-white/);
  });

  it('rolle og e-post er lukkede nedtrekk, ikke alltid-åpne skjema', () => {
    expect(detaljer).toMatch(/<details/);
    expect(detaljer).toMatch(/<summary/);
    expect(detaljer).toMatch(/Rolle/);
    expect(detaljer).toMatch(/E-postendring/);
  });

  it('team- og innboks-detalj har overflow-hidden, ikke overflow-y-auto', () => {
    expect(detaljer).toMatch(/overflow-hidden/);
    expect(detaljer).not.toMatch(/overflow-y-auto/);
    expect(innboks).toMatch(/overflow-hidden/);
    expect(innboks).not.toMatch(/overflow-y-auto/);
    expect(slot).toMatch(/overflow-hidden/);
    expect(slot).not.toMatch(/overflow-y-auto/);
  });

  it('passord og 2FA krever bekreftelse, 2FA krever kode, 2FA vises bare når den er på', () => {
    expect(detaljer).toMatch(/twoFactorEnabled/);
    expect(detaljer).toMatch(/Bekreft/);
    expect(detaljer).toMatch(/kode|engangskode/i);
    expect(detaljer).not.toMatch(/slaAv2fa\(\{\s*userId/);
  });
});

describe('Sidebar Kompetanse og Timeplan står — bunnknappene på Team er borte', () => {
  it('Organisasjon-dropdown har Team, Kompetanse og Timeplan', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(org?.label).toBe('Organisasjon');
    expect(org?.children?.map((c) => c.label)).toEqual(['Team', 'Kompetanse', 'Timeplan']);
    expect(org?.children?.map((c) => c.href)).toEqual([
      '/innstillinger/team',
      '/mekanikere/kompetanse',
      '/mekanikere/kapasitet',
    ]);
  });

  it('Team-siden lenker ikke lenger Mekanikere/Kompetanse/Timeplan som bunnrader', () => {
    const side = les('../app/(app)/innstillinger/team/page.tsx');
    expect(side).not.toMatch(/href: '\/mekanikere\/kompetanse'/);
    expect(side).not.toMatch(/href: '\/mekanikere\/kapasitet'/);
    expect(side).not.toMatch(/title: 'Mekanikere'/);
  });

  it('fullside-rutene Kompetanse og Timeplan finnes fortsatt', () => {
    expect(les('../app/(app)/mekanikere/kompetanse/page.tsx')).toMatch(/Kompetanse/);
    expect(les('../app/(app)/mekanikere/kapasitet/page.tsx')).toMatch(/Timeplan/);
  });
});
