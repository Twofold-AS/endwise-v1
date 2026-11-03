import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { delMobilDest, type NavItem } from '../app/(app)/_shell/nav.ts';
import { INNBOKS_CHIPS } from '../app/(app)/_shell/inbox-del.ts';
import { idagVisning, innboksRad } from '../app/(app)/_shell/phone-home-pulse.ts';
import { flertall, flertallTilbys } from '../../../packages/ui/src/flate/flertall.ts';
import { tjenesterPageSub } from '../app/(app)/prisliste/_hub.ts';
import { ukedagToBokstaver } from '../app/(app)/_shell/timeplan-dager.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('PR #184 runde 3 — mobil P1/P2', () => {
  it('I18nProvider nb-NO og DateCalendar mandag først', () => {
    expect(les('../app/providers.tsx')).toMatch(/I18nProvider/);
    expect(les('../app/providers.tsx')).toMatch(/nb-NO/);
    expect(les('../../../packages/ui/src/components/base/date-picker/date-calendar.tsx')).toMatch(
      /firstDayOfWeek = "mon"/,
    );
  });

  it('typografi-tokens er koblet på mobil', () => {
    const mobil = les('../../../packages/ui/src/styles/mobil.css');
    expect(mobil).toMatch(/--text-label: 14px/);
    expect(mobil).toMatch(/--text-body: 16px/);
    expect(mobil).toMatch(/--text-title: 18px/);
    expect(mobil).toMatch(/--text-meta: 13px/);
    expect(les('../../../packages/ui/src/theme.css')).toMatch(/--text-meta:/);
  });

  it('ListeRad bruker LenkeProvider, ikke rå <a> alene', () => {
    expect(les('../../../packages/ui/src/flate/side.tsx')).toMatch(/useLenkeRender/);
    expect(les('../app/providers.tsx')).toMatch(/LenkeProvider/);
  });

  it('dest-piller er 4 faste + Mer, Analyse ute', () => {
    const dest = delMobilDest(
      [
        { key: 'home', label: 'Verkstedet', href: '/home', roles: [] },
        { key: 'innboks', label: 'Innboks', href: '/innboks', roles: [] },
        { key: 'saker', label: 'Timeplan', href: '/jobber', roles: [] },
        { key: 'kunder', label: 'Kunder', href: '/kunder', roles: [] },
        { key: 'tjenester', label: 'Tjenester', href: '/prisliste', roles: [] },
        { key: 'organisasjon', label: 'Organisasjon', href: '/organisasjon', roles: [] },
        { key: 'lager', label: 'Lager', href: '/lager', roles: [] },
        { key: 'butikk', label: 'Butikk', href: '/butikk', roles: [] },
        { key: 'analyse', label: 'Analyse', href: '/analyse', roles: [] },
      ].map((d) => ({ ...d, icon: (() => null) as unknown as NavItem['icon'] })),
    );
    expect(dest.faste.map((d) => d.label)).toEqual(['Hjem', 'Innboks', 'Timeplan', 'Kunder']);
    expect(dest.mer.map((d) => d.key)).toEqual(['tjenester', 'organisasjon', 'lager', 'butikk']);
    expect(utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'))).toMatch(/Mer/);
    expect(utenKommentarer(les('../app/(app)/_shell/phone-h-scroll.tsx'))).toMatch(/scrollIntoView/);
  });

  it('ingen fake pulstall', () => {
    const naa = new Date('2026-11-03T10:00:00+01:00');
    expect(idagVisning([], naa)).toEqual({ planlagt: 0, paagaar: 0, ferdig: 0 });
    expect(innboksRad([])).toEqual({ meldinger: 0 });
    expect(utenKommentarer(les('../app/(app)/_shell/phone-home-pulse.ts'))).not.toMatch(
      /planlagt: 3/,
    );
  });

  it('Hjem er Dagen din uten På jobb-flis', () => {
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/Dagen din/);
    expect(hjem).toMatch(/Trenger deg/);
    expect(hjem).toMatch(/Ny jobb/);
    expect(hjem).not.toMatch(/På jobb/);
    expect(hjem).not.toMatch(/PulseHeroFlate/);
    expect(hjem).not.toMatch(/PulseAnalyserKort/);
  });

  it('Innboks-chips er Alle · Kunder · Intern uten Løst', () => {
    expect(INNBOKS_CHIPS.map((c) => c.label)).toEqual(['Alle', 'Kunder', 'Intern']);
  });

  it('Org-fanene er borte; hub er Ansatte Mekanikere Tilganger Abonnement', () => {
    expect(les('../app/(app)/_shell/nav.ts')).toMatch(
      /export const ORGANISASJON_SEKSJONER: NavChild\[\] = \[\]/,
    );
    const org = utenKommentarer(les('../app/(app)/organisasjon/page.tsx'));
    expect(org).toMatch(/tittel="Ansatte"/);
    expect(org).toMatch(/tittel="Mekanikere"/);
    expect(org).toMatch(/tittel="Tilganger"/);
    expect(org).toMatch(/tittel="Abonnement"/);
    expect(org).not.toMatch(/TimeplanAnsatteFlate/);
    expect(org).not.toMatch(/SideChromeSkall/);
  });

  it('Org er hub uten Timeplan ansatte-fane, Abonnement heter Tillegg og priser', () => {
    const org = utenKommentarer(les('../app/(app)/organisasjon/page.tsx'));
    expect(org).toMatch(/tittel="Ansatte"/);
    expect(org).toMatch(/tittel="Mekanikere"/);
    expect(org).toMatch(/tittel="Tilganger"/);
    expect(org).toMatch(/Tillegg og priser/);
    expect(org).not.toMatch(/TimeplanAnsatteFlate/);
    expect(org).not.toMatch(/SideChromeSkall/);
  });

  it('flertall og 1 tjeneste', () => {
    expect(flertall(0, 'tjeneste', 'tjenester')).toBe('Ingen tjenester');
    expect(flertall(1, 'tjeneste', 'tjenester')).toBe('1 tjeneste');
    expect(flertallTilbys(1, 'tjeneste', 'tjenester')).toBe('1 tjeneste tilbys');
    expect(tjenesterPageSub(1)).toBe('1 tjeneste tilbys');
    expect(tjenesterPageSub(0)).toBe('Ingen tjenester ennå');
  });

  it('ukedag er to bokstaver uten punktum', () => {
    const d = new Date('2026-11-06T12:00:00+01:00');
    expect(ukedagToBokstaver(d)).toBe('Fr');
    expect(ukedagToBokstaver(d)).not.toMatch(/\./);
  });

  it('Stillingstittel, ikke Jobb tittel; Tilganger er deaktivert', () => {
    const ansatt = les('../app/(app)/organisasjon/_opprett-dialog.tsx');
    expect(ansatt).toMatch(/Stillingstittel/);
    expect(ansatt).not.toMatch(/Jobb tittel/);
    expect(ansatt).toMatch(/DeaktivertHandling/);
  });

  it('Oppretter-skall har Steg n av m for Kunde Tjeneste Ansatt Del Agent Forhandler', () => {
    expect(les('../app/(app)/_shell/oppretter/oppretter-skuff.tsx')).toMatch(/Steg \{stegIndeks \+ 1\} av/);
    expect(les('../app/(app)/_shell/oppretter/agent-oppretter.tsx')).toMatch(/Ny assistent/);
    expect(les('../app/(app)/_shell/oppretter/forhandler-oppretter.tsx')).toMatch(/Ny forhandler/);
    expect(les('../app/(app)/kunder/_ny-kunde.tsx')).toMatch(/OppretterSkuff/);
    expect(les('../app/(app)/innstillinger/tjenestekatalog/_ny-tjeneste.tsx')).toMatch(/OppretterSkuff/);
    expect(les('../app/(app)/organisasjon/_opprett-dialog.tsx')).toMatch(/OppretterSkuff/);
    expect(les('../app/(app)/lager/deler/_ny-del.tsx')).toMatch(/OppretterSkuff/);
  });

  it('Ronny er sticky sirkel med thinking, ikke sr-only tenking', () => {
    const ronny = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    expect(ronny).toMatch(/data-ronny-sirkel/);
    expect(ronny).toMatch(/AgentThinking/);
    expect(ronny).toMatch(/data-ronny-forslag/);
    expect(ronny).not.toMatch(/sr-only.*TENKER_TEKST/);
  });

  it('status confirmed er ikke blå', () => {
    expect(utenKommentarer(les('../app/(app)/bookinger/_status.ts'))).not.toMatch(
      /confirmed: 'text-primary/,
    );
  });

  it('søk etter kunde lyver ikke om reg.nr', () => {
    expect(les('../app/(app)/kunder/page.tsx')).toMatch(/Søk etter kunde/);
    expect(les('../app/(app)/kunder/page.tsx')).not.toMatch(/reg\.nr/);
  });

  it('sekundære Opprett-handlinger er OpprettSkuff, ikke Modal', () => {
    expect(les('../app/(app)/innboks/_inviter-ansatt.tsx')).toMatch(/OpprettSkuff/);
    expect(les('../app/(app)/innboks/_inviter-ansatt.tsx')).not.toMatch(/<Modal/);
    expect(les('../app/(app)/lager/deler/_bevegelse-dialog.tsx')).toMatch(/OpprettSkuff/);
    expect(les('../app/(app)/lager/deler/_bevegelse-dialog.tsx')).not.toMatch(/<Modal/);
    expect(les('../app/(app)/kunder/_registrer-kjoretoy.tsx')).toMatch(/OpprettSkuff/);
    expect(les('../app/(app)/bookinger/_meld-endring.tsx')).toMatch(/OpprettSkuff/);
    expect(les('../app/(app)/lager/bestill/page.tsx')).toMatch(/OpprettSkuff/);
    expect(les('../app/(app)/lager/bestill/page.tsx')).toMatch(/Bestill annen del/);
    expect(les('../app/(app)/kunder/_endre.tsx')).toMatch(/OpprettSkuff/);
    expect(les('../app/(app)/innstillinger/tjenestekatalog/_tjeneste-kort.tsx')).toMatch(
      /OpprettSkuff/,
    );
  });

  it('Inn og ut og innboks-rader bruker ListeRad', () => {
    expect(les('../app/(app)/lager/bevegelser/page.tsx')).toMatch(/ListeRad/);
    expect(les('../app/(app)/lager/bevegelser/page.tsx')).toMatch(/Ingen inn- eller uttak/);
    expect(les('../app/(app)/innboks/_inbox-sidebar.tsx')).toMatch(/<ListeRad/);
    expect(les('../app/(app)/jobber/_endring-detalj.tsx')).toMatch(/h-12/);
  });

  it('innlogging bruker Board OTP, Nesten der og spinner uten Sender/Bekreftet', () => {
    const skjema = utenKommentarer(les('../app/signin/signin-skjema.tsx'));
    expect(skjema).toMatch(/FeltInput/);
    expect(skjema).toMatch(/FeltKode/);
    expect(skjema).toMatch(/SIGNIN_NESTEN_DER/);
    expect(skjema).toMatch(/length=\{5\}/);
    expect(skjema).toMatch(/length=\{6\}/);
    expect(skjema).toMatch(/loadingText=""/);
    expect(skjema).not.toMatch(/Sender/);
    expect(skjema).not.toMatch(/Bekreftet/);
    expect(les('../app/signin/signin-steg.ts')).toMatch(/SIGNIN_NESTEN_DER = 'Nesten der'/);
  });

  it('Board progress/meter/context-menu/agent-thinking ligger i repo', () => {
    expect(les('../../../packages/ui/src/components/base/progress/progress.tsx')).toMatch(
      /ProgressBar/,
    );
    expect(les('../../../packages/ui/src/components/base/meter/meter.tsx')).toMatch(/Meter/);
    expect(les('../../../packages/ui/src/components/base/context-menu/context-menu.tsx')).toMatch(
      /ContextMenuTrigger/,
    );
    expect(
      les('../../../packages/ui/src/components/application/agent-thinking/agent-thinking.tsx'),
    ).toMatch(/AgentThinking/);
  });
});
