import { HJELP_FANER, type HjelpFaneId, hjelpHref, parseHjelpFane } from '../hjelp/_faner';
import { type FaneId, innstillingerHref, parseFane, synligeFaner } from '../innstillinger/_faner';
import {
  parseStatistikkFane,
  STATISTIKK_FANER,
  type StatistikkFaneId,
  statistikkHref,
} from '../statistikk/_faner';
import { erSettingsSti } from './nav';

export type PhoneSideChromeFane = {
  id: string;
  label: string;
  href: string;
};

export type PhoneSideChrome = {
  id: 'innstillinger' | 'hjelp' | 'statistikk';
  tittel: string;
  faner: PhoneSideChromeFane[];
  aktiv: string;
};

export function erHjelpSti(pathname: string): boolean {
  return pathname === '/hjelp' || pathname.startsWith('/hjelp/') || pathname === '/support';
}

export function erStatistikkSti(pathname: string): boolean {
  return pathname === '/statistikk' || pathname.startsWith('/statistikk/');
}

export function erPhoneSideChrome(pathname: string): boolean {
  return erSettingsSti(pathname) || erHjelpSti(pathname) || erStatistikkSti(pathname);
}

export function phoneSideChrome(
  pathname: string,
  search: { get: (k: string) => string | null } | null,
  opts: { isAdmin: boolean; erForhandler: boolean },
): PhoneSideChrome | null {
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
  return null;
}
