import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HJEM_PULSE_QUERY_KEYS } from '../app/(app)/_shell/hjem-pulse-sync.ts';
import { PHONE_KORT_META } from '../app/(app)/_shell/phone-home.ts';
import {
  ansattePulse,
  erPaagaarJobb,
  PULSE_UKE_TITTEL,
} from '../app/(app)/_shell/phone-home-pulse.ts';
import {
  erHjelpSti,
  erPhoneSideChrome,
  erStatistikkSti,
  phoneSideChrome,
} from '../app/(app)/_shell/phone-side-chrome.ts';
import { HJELP_FANER, parseHjelpFane } from '../app/(app)/hjelp/_faner.ts';
import { parseStatistikkFane, STATISTIKK_FANER } from '../app/(app)/statistikk/_faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('CODE-GO Mikael — hjem live data', () => {
  it('hjem-pulse query-nøkler er bookings.list + oversikt + tråder + lager', () => {
    expect([...HJEM_PULSE_QUERY_KEYS]).toEqual([
      'bookings.list',
      'mechanics.oversikt',
      'messages.listThreads',
      'inventory.listParts',
    ]);
    const sync = utenKommentarer(les('../app/(app)/_shell/hjem-pulse-sync.ts'));
    expect(sync).toMatch(/utils\.bookings\.list\.invalidate/);
    expect(sync).toMatch(/utils\.bookings\.calendar\.invalidate/);
    expect(sync).toMatch(/utils\.mechanics\.oversikt\.invalidate/);
    expect(sync).toMatch(/refetchOnMount: 'always'/);
    expect(sync).toMatch(/staleTime: 0/);
    const ny = utenKommentarer(les('../app/(app)/bookinger/ny/page.tsx'));
    const detalj = utenKommentarer(les('../app/(app)/bookinger/[id]/page.tsx'));
    const minDag = utenKommentarer(les('../app/(app)/min-dag/[id]/page.tsx'));
    expect(ny).toMatch(/invalidateHjemPulse/);
    expect(detalj).toMatch(/invalidateHjemPulse/);
    expect(minDag).toMatch(/invalidateHjemPulse/);
  });

  it('Pågår er in_progress eller levende overlapping nå', () => {
    const naa = new Date('2026-08-29T10:00:00');
    expect(
      erPaagaarJobb(
        {
          id: '1',
          status: 'confirmed',
          startsAt: '2026-08-29T09:00:00',
          endsAt: '2026-08-29T11:00:00',
        },
        naa,
      ),
    ).toBe(true);
    expect(
      erPaagaarJobb({ id: '2', status: 'in_progress', startsAt: '2026-08-29T08:00:00' }, naa),
    ).toBe(true);
    expect(
      erPaagaarJobb(
        {
          id: '3',
          status: 'confirmed',
          startsAt: '2026-08-29T14:00:00',
          endsAt: '2026-08-29T15:00:00',
        },
        naa,
      ),
    ).toBe(false);
  });

  it('på jobb = aktivJobb-tildeling, ikke timeføring/status-humor', () => {
    const regel = les('../app/(app)/_shell/phone-home-pulse.ts');
    expect(regel).toMatch(/aktiv jobb-tildeling/);
    expect(regel).toMatch(/ikke timeføring/);
    expect(regel).toMatch(/aktivJobb/);
    expect(regel).toMatch(/mechanics\.active.*teller ikke|teller ikke/);
    const naa = new Date('2026-08-29T10:00:00');
    expect(
      ansattePulse(
        [
          { id: '1', status: 'på_jobb' },
          { id: '2', status: 'ledig' },
        ],
        [],
        naa,
      ),
    ).toEqual({ paJobb: 0, totalt: 2 });
  });

  it('toppkort er denne uken, tall midtstilt', () => {
    expect(PULSE_UKE_TITTEL).toBe('Denne uken');
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(kort).toMatch(/flex flex-col items-center/);
    expect(kort).toMatch(/text-center/);
    expect(kort).toMatch(/#0066ff/);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/PULSE_UKE_TITTEL/);
    expect(hjem).toMatch(/PulseAnalyserKort/);
  });
});

describe('CODE-GO Mikael — Hjelp / Statistikk / chrome', () => {
  it('Innstillinger · Hjelp · Statistikk deler side-chrome', () => {
    expect(erPhoneSideChrome('/innstillinger')).toBe(true);
    expect(erHjelpSti('/hjelp')).toBe(true);
    expect(erHjelpSti('/support')).toBe(true);
    expect(erStatistikkSti('/statistikk')).toBe(true);
    expect(erPhoneSideChrome('/home')).toBe(false);
    const inn = phoneSideChrome('/innstillinger', null, { isAdmin: true, erForhandler: true });
    expect(inn?.tittel).toBe('Innstillinger');
    const hjelp = phoneSideChrome('/hjelp', null, { isAdmin: false, erForhandler: true });
    expect(hjelp?.tittel).toBe('Hjelp');
    const stat = phoneSideChrome('/statistikk', null, { isAdmin: false, erForhandler: true });
    expect(stat?.tittel).toBe('Statistikk');
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/absolute inset-x-10 truncate text-center/);
    expect(shell).toMatch(/sideChrome\.tittel/);
  });

  it('Hjelp-rute: Artikler · Forespørsler, inngang i artikler', () => {
    expect(HJELP_FANER.map((f) => f.label)).toEqual(['Artikler', 'Forespørsler']);
    expect(parseHjelpFane('forespor')).toBe('forespor');
    expect(parseHjelpFane(null)).toBe('artikler');
    const artikler = utenKommentarer(les('../app/(app)/hjelp/_artikler.tsx'));
    expect(artikler).toMatch(/data-hjelp-forespor-inngang/);
    expect(artikler).toMatch(/Forespørsler/);
    expect(les('../app/(app)/hjelp/page.tsx')).toMatch(/HjelpSkall/);
    expect(les('../app/(app)/support/page.tsx')).toMatch(/from '\.\.\/hjelp\/page'/);
    const meny = utenKommentarer(les('../app/(app)/_shell/phone-profil-meny.tsx'));
    expect(meny).toMatch(/data-phone-profil-hjelp/);
    expect(meny).toMatch(/href=\{'\/hjelp'/);
    expect(meny).not.toMatch(/Forespørsel/);
  });

  it('Statistikk: Bookinger · Salg · Nettside · Effektivitet', () => {
    expect(STATISTIKK_FANER.map((f) => f.label)).toEqual([
      'Bookinger',
      'Salg',
      'Nettside',
      'Effektivitet',
    ]);
    expect(parseStatistikkFane(null)).toBe('bookinger');
    expect(PHONE_KORT_META.analyser.href).toBe('/statistikk');
    expect(PHONE_KORT_META.statistikk.href).toBe('/rapporter');
    expect(les('../app/(app)/statistikk/page.tsx')).toMatch(/StatistikkSkall/);
  });
});
