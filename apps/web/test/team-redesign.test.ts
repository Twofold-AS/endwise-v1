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
 * listekolonne scroller, pane-kropp scroller, Slett shrink-0 nederst.
 * Ingen Admin-tab. Ingen Kontor/Gulvet.
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

describe('Detaljpane — Hvem, Kompetanse og høyde under topbar', () => {
  const detaljer = utenKommentarer(les('../app/(app)/innstillinger/team/_detaljer.tsx'));
  const side = utenKommentarer(les('../app/(app)/innstillinger/team/page.tsx'));
  const liste = les('../app/(app)/innstillinger/team/_liste.tsx');
  const innboks = utenKommentarer(les('../app/(app)/innboks/_detaljer.tsx'));
  const slot = utenKommentarer(les('../app/(app)/innboks/_detaljer-slot.tsx'));
  const chrome = utenKommentarer(les('../app/(app)/innboks/_chrome.tsx'));
  const hvem = detaljer.slice(
    detaljer.indexOf('function Hvem'),
    detaljer.indexOf('function Jobber'),
  );
  const komp = detaljer.slice(
    detaljer.indexOf('function KompetanseSeksjon'),
    detaljer.indexOf('function TimeplanSeksjon'),
  );

  it('listen er kompakt og åpner Detaljer med ArrowUpRight', () => {
    expect(liste).toMatch(/Detaljer/);
    expect(liste).toMatch(/ArrowUpRight/);
    expect(liste).toMatch(/onVelg/);
    expect(detaljer).toMatch(/aria-label="Detaljer om den ansatte"/);
    expect(detaljer).toMatch(/w-\[320px\]/);
    expect(detaljer).toMatch(/PanelRightClose/);
  });

  it('Hvem er én identitetsblokk: avatar+aktivitet+navn, e-post, rolle, Endre-expand og passord', () => {
    expect(hvem.length).toBeGreaterThan(80);
    expect(hvem).toMatch(/<Avatar/);
    expect(hvem).toMatch(/StatusMerke/);
    expect(hvem).toMatch(/rad\.navn/);
    expect(hvem).toMatch(/E-post/);
    expect(hvem).toMatch(/Rolle/);
    expect(hvem).toMatch(/>\s*Endre\s*</);
    expect(hvem).toMatch(/Avbryt/);
    expect(hvem).toMatch(/team\.endreEpost/);
    expect(hvem).toMatch(/team\.setFunction/);
    expect(hvem).toMatch(/<PassordEndring/);
    expect(detaljer).toMatch(/Send passordendring/);
    expect(detaljer).toMatch(/team\.sendPassordendring/);
    expect(hvem).not.toMatch(/<details/);
    expect(hvem).not.toMatch(/<summary/);
    expect(detaljer).not.toMatch(/tittel="Send passordendring"/);
    expect(detaljer).not.toMatch(/tittel="E-post"/);
    expect(detaljer).not.toMatch(/E-postendring/);
  });

  it('Kompetanse har ikke navn, avatar eller ledig — det bor bare i Hvem', () => {
    expect(komp.length).toBeGreaterThan(40);
    expect(komp).not.toMatch(/rad\.navn/);
    expect(komp).not.toMatch(/statusLabel/);
    expect(komp).not.toMatch(/StatusMerke/);
    expect(komp).not.toMatch(/<Avatar/);
    expect(komp).toMatch(/skjulIdentitet|Ingen ferdigheter/);
    expect(komp).toMatch(/MekanikerKompetanse|competence\.listAllMechanicSkills/);
    expect(hvem).toMatch(/StatusMerke/);
  });

  it('panelet har planlagte jobber, 2FA, timeplan og Slett sist fylt rød', () => {
    expect(detaljer).toMatch(/Planlagte jobber/);
    expect(detaljer).not.toMatch(/Jobber hen gjør|Jobben hen gjør/);
    expect(detaljer).toMatch(/team\.jobber/);
    expect(detaljer).toMatch(/Slå av 2FA/);
    expect(detaljer).toMatch(/team\.slaAv2faStart/);
    expect(detaljer).toMatch(/team\.slaAv2fa/);
    expect(detaljer).toMatch(/Slett/);
    expect(detaljer).toMatch(/team\.fjern/);
    expect(detaljer).toMatch(/Timeplan/);
    expect(detaljer).toMatch(
      /Hvem[\s\S]*KompetanseSeksjon[\s\S]*TimeplanSeksjon[\s\S]*SlettAnsatt/,
    );
    expect(detaljer).toMatch(/bg-danger[\s\S]*text-white/);
  });

  it('Team-lista scroller i egen kolonne; pane-kroppen scroller; Slett er shrink-0', () => {
    const ytterst =
      side.match(/function TeamSide[\s\S]*?return \(\s*<div className="([^"]+)"/)?.[1] ?? '';
    expect(ytterst).not.toMatch(/overflow-hidden/);
    expect(side).toMatch(/min-h-0 flex-1 overflow-y-auto/);
    expect(side).toMatch(
      /role="tablist"[^>]*shrink-0|className="[^"]*shrink-0[^"]*"[^>]*role="tablist"/,
    );
    expect(detaljer).toMatch(/h-\[calc\(100dvh-3\.5rem\)\]/);
    expect(detaljer).toMatch(/overflow-y-auto/);
    expect(detaljer).toMatch(/min-h-0/);
    expect(detaljer).toMatch(/shrink-0[\s\S]{0,120}<SlettAnsatt/);
    expect(innboks).toMatch(/h-\[calc\(100dvh-3\.5rem\)\]/);
    expect(innboks).toMatch(/overflow-y-auto/);
    expect(slot).toMatch(/h-\[calc\(100dvh-3\.5rem\)\]/);
    expect(slot).toMatch(/overflow-y-auto/);
    expect(chrome).toMatch(/h-\[calc\(100dvh-3\.5rem\)\]/);
    const trådListe = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    expect(trådListe).toMatch(/min-h-0 flex-1[\s\S]*overflow-y-auto/);
    expect(trådListe).toMatch(/aside className="[^"]*min-h-0/);
  });

  it('passord og 2FA krever bekreftelse, 2FA krever kode, 2FA vises bare når den er på', () => {
    expect(detaljer).toMatch(/twoFactorEnabled/);
    expect(detaljer).toMatch(/Bekreft/);
    expect(detaljer).toMatch(/kode|engangskode/i);
    expect(detaljer).not.toMatch(/slaAv2fa\(\{\s*userId/);
  });
});

describe('Sidebar Kompetanse og Timeplan står — bunnknappene på Team er borte', () => {
  it('Ansatte har piller Team, Prisliste, Kompetanse og Timeplan', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(org?.label).toBe('Ansatte');
    expect(org?.pills?.map((c) => c.label)).toEqual([
      'Team',
      'Prisliste',
      'Kompetanse',
      'Timeplan',
    ]);
    expect(org?.pills?.map((c) => c.href)).toEqual([
      '/innstillinger/team',
      '/prisliste',
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
