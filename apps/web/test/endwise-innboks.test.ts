import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F5-11 / F5-14 — Innboks i Endwise-admin + forhandlerens «Skriv til Endwise».
 *
 * Låst kopi og navigasjon. Sperren er tRPC (`endwiseAdminProcedure`), ikke at
 * knappen ligger under /endwise.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('F5-11: ENDWISE_NAV har Innboks etter Oversikt', () => {
  const nav = les('../app/(app)/_shell/nav.ts');

  it('Innboks ligger i ENDWISE_NAV rett etter Oversikt, ikke som Admin-tab', () => {
    const start = nav.indexOf('export const ENDWISE_NAV');
    const slutt = nav.indexOf('export const ENDWISE_SETTINGS_NAV');
    const blokk = nav.slice(start, slutt);
    expect(blokk).toMatch(/key:\s*'endwise-innboks'/);
    expect(blokk).toMatch(/label:\s*'Innboks'/);
    expect(blokk).toMatch(/href:\s*'\/endwise\/innboks'/);
    expect(blokk).toMatch(/icon:\s*Inbox/);
    expect(blokk).toMatch(/badge:\s*'unread'/);

    const oversikt = blokk.indexOf("key: 'endwise-oversikt'");
    const innboks = blokk.indexOf("key: 'endwise-innboks'");
    const forhandlere = blokk.indexOf("key: 'endwise-forhandlere'");
    expect(oversikt).toBeGreaterThan(-1);
    expect(innboks).toBeGreaterThan(oversikt);
    expect(forhandlere).toBeGreaterThan(innboks);
  });

  it('Endwise-sidebar teller ulest fra listPlatformSupport, ikke listThreads', () => {
    const sidebar = les('../app/(app)/_shell/sidebar.tsx');
    expect(sidebar).toMatch(/listPlatformSupport/);
    expect(sidebar).toMatch(/context === 'endwise'/);
    expect(sidebar).toMatch(/filter\(\(t\) => t\.unread\)/);
  });

  it('forhandler-nav har fortsatt ingen Admin-tab', () => {
    const forhandlerBlokk = nav.slice(
      nav.indexOf('export const FORHANDLER_NAV'),
      nav.indexOf('/* ══ ENDWISE-ADMIN'),
    );
    expect(forhandlerBlokk).not.toMatch(/href:\s*'\/admin'/);
    expect(forhandlerBlokk).not.toMatch(/label:\s*'Admin'/);
  });
});

describe('F5-11: /endwise/innboks gjenbruker innboks-chrome med modus=endwise', () => {
  it('layout setter modus=endwise og gjenbruker chrome', () => {
    const layout = les('../app/(app)/endwise/innboks/layout.tsx');
    expect(layout).toMatch(/modus=["']endwise["']|modus=\{['"]endwise['"]\}/);
    expect(layout).toMatch(/InboxChrome|InboxModus/);
  });

  it('sidebaren i endwise-modus har verken Kunder eller Intern', () => {
    const sidebar = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    expect(sidebar).toMatch(/modus|useInboxModus/);
    expect(sidebar).toMatch(/Ingen henvendelser ennå/);
    expect(sidebar).toMatch(/Når et verksted skriver til Endwise, lander det her\./);
  });

  it('liste viser forhandlernavn; tråd viser person, aldri Ansatt som navn', () => {
    const sidebar = les('../app/(app)/innboks/_inbox-sidebar.tsx');
    const trad = les('../app/(app)/innboks/[id]/page.tsx');
    const lib = les('../app/(app)/innboks/_lib.ts');
    expect(lib).toMatch(/export function supportRadTittel/);
    expect(lib).toMatch(/export function supportTradTittel/);
    expect(lib).toMatch(/export function supportRolleEtikett/);
    expect(sidebar).toMatch(/supportRadTittel/);
    expect(sidebar).toMatch(/tenantName/);
    expect(trad).toMatch(/supportTradTittel\(/);
    expect(trad).toMatch(/kontaktRolle|tradRolle/);
    expect(trad).toMatch(/authorNavn/);
    expect(trad).toMatch(/authorRolle|supportRolleEtikett/);
    expect(trad).toMatch(/rolleEtikett && \(/);
    expect(trad).not.toMatch(/rolle:\s*['"]ansatt['"]/);
  });

  it('detaljpanelet viser forhandler + Se verkstedet som URL, uten setActive', () => {
    const detaljer = les('../app/(app)/innboks/_detaljer.tsx');
    const slot = les('../app/(app)/innboks/_detaljer-slot.tsx');
    const samlet = utenKommentarer(`${detaljer}\n${slot}`);
    expect(samlet).toMatch(/Se verkstedet/);
    expect(samlet).toMatch(/\/endwise\/verksted\/\$\{slug\}/);
    expect(samlet).toMatch(/\/endwise\/forhandlere/);
    expect(samlet).not.toMatch(/Kommer/);
    expect(samlet).not.toMatch(/setActive|impersonat/i);
  });
});

describe('F5-14: Ny samtale — Skriv til Endwise er den åpenbare veien', () => {
  const kilde = utenKommentarer(les('../app/(app)/innboks/_ny-samtale.tsx'));

  it('første skjerm er én fullbredde Skriv til Endwise-knapp med låst kopi', () => {
    expect(kilde).toMatch(/Skriv til Endwise/);
    expect(kilde).toMatch(/Åpner …/);
    expect(kilde).toMatch(/Har du et spørsmål til oss\? Trykk — du trenger ikke velge noe\./);
    expect(kilde).toMatch(/Meldingen går til Endwise-support\. Ikke til kunder eller kollegaer\./);
    expect(kilde).toMatch(/Klarte ikke starte samtalen\. Prøv igjen\./);
    expect(kilde).toMatch(/LifeBuoy/);
    expect(kilde).toMatch(/w-full|className="[^"]*w-full/);
  });

  it('oppretter dealer_admin / app uten deltakere eller SMS/e-post på primærstien', () => {
    expect(kilde).toMatch(/kind:\s*['"]dealer_admin['"]/);
    expect(kilde).toMatch(/channel:\s*['"]app['"]/);
    expect(kilde).toMatch(/participantIds:\s*\[\s*\]/);
    expect(kilde).toMatch(/Annen samtale/);
    // Bruker-ID-liming og SMS/e-post skal ikke ligge i den første skjermen.
    const primaer = kilde.slice(0, kilde.indexOf('Annen samtale'));
    expect(primaer).not.toMatch(/bruker-ID|Deltakere \(bruker-ID/);
    expect(primaer).not.toMatch(/['"]sms['"]|['"]email['"]/);
  });
});
