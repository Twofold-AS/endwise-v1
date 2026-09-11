import { HJELP_FANER, type HjelpFaneId, hjelpHref, parseHjelpFane } from '../hjelp/_faner';
import { type FaneId, innstillingerHref, parseFane, synligeFaner } from '../innstillinger/_faner';
import {
  erTimeplanSti,
  parseTimeplanFane,
  TIMEPLAN_FANER,
  type TimeplanFaneId,
  timeplanHref,
} from '../jobber/_faner';
import {
  erKunderSti,
  KUNDER_FANER,
  type KunderFaneId,
  kunderHref,
  parseKunderFane,
} from '../kunder/_faner';
import {
  erOrganisasjonChromeSti,
  parseOrgChrome,
  synligeOrgChrome,
} from '../organisasjon/_seksjoner';
import {
  erTjenesterSti,
  parseTjenesterFane,
  TJENESTER_FANER,
  type TjenesterFaneId,
  tjenesterHref,
} from '../prisliste/_faner';
import {
  parseStatistikkFane,
  STATISTIKK_FANER,
  type StatistikkFaneId,
  statistikkHref,
} from '../statistikk/_faner';
import { erSettingsSti } from './nav';
import { erDealerInnboks } from './seksjon-sti';

export type PhoneSideChromeFane = {
  id: string;
  label: string;
  href: string;
};

export type PhoneSideChrome = {
  id:
    | 'innstillinger'
    | 'hjelp'
    | 'statistikk'
    | 'timeplan'
    | 'kunder'
    | 'tjenester'
    | 'organisasjon'
    | 'innboks';
  tittel: string;
  faner: PhoneSideChromeFane[];
  aktiv: string;
  /** Innboks har egen bar 2 (Alle meldinger · Ny melding · Sortering · Slett). */
  bar2?: 'faner' | 'innboks';
};

export function erHjelpSti(pathname: string): boolean {
  return pathname === '/hjelp' || pathname.startsWith('/hjelp/') || pathname === '/support';
}

export function erStatistikkSti(pathname: string): boolean {
  return pathname === '/statistikk' || pathname.startsWith('/statistikk/');
}

export function erPhoneSideChrome(pathname: string): boolean {
  return (
    erSettingsSti(pathname) ||
    erHjelpSti(pathname) ||
    erStatistikkSti(pathname) ||
    erTimeplanSti(pathname) ||
    erKunderSti(pathname) ||
    erTjenesterSti(pathname) ||
    erOrganisasjonChromeSti(pathname) ||
    erDealerInnboks(pathname)
  );
}

export function phoneSideChrome(
  pathname: string,
  search: { get: (k: string) => string | null } | null,
  opts: { isAdmin: boolean; erForhandler: boolean },
): PhoneSideChrome | null {
  if (erDealerInnboks(pathname)) {
    const ny = search?.get('ny') === '1';
    return {
      id: 'innboks',
      tittel: 'Innboks',
      aktiv: ny ? 'ny' : 'liste',
      bar2: 'innboks',
      faner: [],
    };
  }
  if (erSettingsSti(pathname)) {
    const fraQuery = search?.get('fane');
    const aktiv: FaneId = parseFane(
      fraQuery ?? (pathname.includes('/varsler') ? 'varsler' : 'profil'),
      opts.isAdmin,
      'profil',
      opts.erForhandler,
    );
    return {
      id: 'innstillinger',
      tittel: 'Innstillinger',
      aktiv,
      faner: synligeFaner(opts.isAdmin, opts.erForhandler).map((f) => ({
        id: f.id,
        label: f.label,
        href: innstillingerHref(f.id),
      })),
    };
  }
  if (erHjelpSti(pathname)) {
    const aktiv: HjelpFaneId = parseHjelpFane(search?.get('fane'));
    return {
      id: 'hjelp',
      tittel: 'Hjelp',
      aktiv,
      faner: HJELP_FANER.map((f) => ({
        id: f.id,
        label: f.label,
        href: hjelpHref(f.id),
      })),
    };
  }
  if (erStatistikkSti(pathname)) {
    const aktiv: StatistikkFaneId = parseStatistikkFane(search?.get('fane'));
    return {
      id: 'statistikk',
      tittel: 'Statistikk',
      aktiv,
      faner: STATISTIKK_FANER.map((f) => ({
        id: f.id,
        label: f.label,
        href: statistikkHref(f.id),
      })),
    };
  }
  if (erTimeplanSti(pathname)) {
    const aktiv: TimeplanFaneId = parseTimeplanFane(pathname, search?.get('fane'));
    return {
      id: 'timeplan',
      tittel: 'Timeplan',
      aktiv,
      faner: TIMEPLAN_FANER.map((f) => ({
        id: f.id,
        label: f.label,
        href: timeplanHref(f.id),
      })),
    };
  }
  if (erKunderSti(pathname)) {
    const aktiv: KunderFaneId = parseKunderFane(pathname, search?.get('fane'), search?.get('ny'));
    return {
      id: 'kunder',
      tittel: 'Kunder',
      aktiv,
      faner: KUNDER_FANER.map((f) => ({
        id: f.id,
        label: f.label,
        href: kunderHref(f.id),
      })),
    };
  }
  if (erTjenesterSti(pathname)) {
    const aktiv: TjenesterFaneId = parseTjenesterFane(search?.get('fane'));
    return {
      id: 'tjenester',
      tittel: 'Tjenester',
      aktiv,
      faner: TJENESTER_FANER.map((f) => ({
        id: f.id,
        label: f.label,
        href: tjenesterHref(f.id),
      })),
    };
  }
  if (erOrganisasjonChromeSti(pathname)) {
    return {
      id: 'organisasjon',
      tittel: 'Organisasjon',
      aktiv: parseOrgChrome(pathname, search?.get('seksjon'), opts.isAdmin),
      faner: synligeOrgChrome(opts.isAdmin).map((f) => ({
        id: f.id,
        label: f.label,
        href: f.href,
      })),
    };
  }
  return null;
}
