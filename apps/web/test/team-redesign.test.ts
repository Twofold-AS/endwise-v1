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
 * Mikael — Team-redesign: piller, én invitasjon, detaljpane som Innboks.
 * Ingen Admin-tab. Ingen Kontor/Gulvet. Sidebar Kompetanse/Timeplan står.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Team-piller som Innstillinger ?fane=', () => {
  it('har Alle · Mekanikere · Selgere · Support — Alle er default', () => {
    expect(TEAM_FANER.map((f) => f.id)).toEqual(['alle', 'mekanikere', 'selgere', 'support']);
    expect(TEAM_FANER.map((f) => f.label)).toEqual(['Alle', 'Mekanikere', 'Selgere', 'Support']);
    expect(parseTeamFane(null)).toBe('alle');
    expect(parseTeamFane('selgere')).toBe('selgere');
    expect(parseTeamFane('ukjent')).toBe('alle');
    expect(erTeamFane('mekanikere')).toBe(true);
    expect(teamHref('support')).toBe('/innstillinger/team?fane=support');
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
    expect(mek).not.toMatch(/kobber|copper/i);
  });
});

describe('Én Inviter ansatt — e-post valgfri', () => {
  const inviter = les('../app/(app)/innstillinger/team/_inviter.tsx');
  const side = les('../app/(app)/innstillinger/team/page.tsx');

  it('har én handling, ikke Ny ansatt og ikke to knapper', () => {
    expect(inviter).toMatch(/Inviter ansatt/);
    expect(inviter).toMatch(/valgfri/);
    expect(inviter).toMatch(/invitasjoner\.opprett/);
    expect(inviter).toMatch(/team\.opprettUtenInvitasjon/);
    expect(inviter).not.toMatch(/Ny ansatt/);
    expect(inviter).not.toMatch(/Send invitasjon/);
    expect(inviter).not.toMatch(/Legg til uten invitasjon/);
    expect(side).not.toMatch(/LeggTilUtenInvitasjon/);
    expect(side).not.toMatch(/_legg-til/);
  });

  it('med e-post kalles invitasjon, uten e-post kalles opprett uten invitasjon', () => {
    expect(inviter).toMatch(/epost\.trim\(\)/);
    expect(inviter).toMatch(/opprettInvitasjon\.mutate/);
    expect(inviter).toMatch(/opprettLokal\.mutate/);
  });
});

describe('Detaljpane som Innboks', () => {
  const detaljer = les('../app/(app)/innstillinger/team/_detaljer.tsx');
  const liste = les('../app/(app)/innstillinger/team/_liste.tsx');

  it('listen er kompakt og åpner Detaljer per ansatt', () => {
    expect(liste).toMatch(/Detaljer/);
    expect(liste).toMatch(/onVelg/);
    expect(detaljer).toMatch(/aria-label="Detaljer om den ansatte"/);
    expect(detaljer).toMatch(/w-\[320px\]/);
    expect(detaljer).toMatch(/PanelRightClose/);
  });

  it('panelet viser person, jobber, e-post, passord, 2FA, slett, kompetanse og timeplan', () => {
    expect(detaljer).toMatch(/Jobber hen gjør/);
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
    expect(detaljer).toMatch(/Timeplan/);
    expect(detaljer).toMatch(/MekanikerKompetanse|competence\.listAllMechanicSkills/);
  });

  it('passord og 2FA krever bekreftelse, 2FA krever kode, 2FA vises bare når den er på', () => {
    expect(detaljer).toMatch(/twoFactorEnabled/);
    expect(detaljer).toMatch(/Bekreft/);
    expect(detaljer).toMatch(/kode|engangskode/i);
    expect(detaljer).not.toMatch(/slaAv2fa\(\{\s*userId/);
  });
});

describe('Sidebar Kompetanse og Timeplan står — bunnknappene på Team er borte', () => {
  it('Ansatte-dropdown har Team, Kompetanse og Timeplan', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
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
