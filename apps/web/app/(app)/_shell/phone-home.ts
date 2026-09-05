import type { LucideIcon } from '@endwise/ui';
import {
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Handshake,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ShieldCheck,
  Store,
  Users,
  Wrench,
} from '@endwise/ui';
import { FORHANDLER_NAV, type ShellKey, settingsForShell } from './nav';

/**
 * Telefon-hjem-kort (Mikael 29.08.2026) er sideinnhold, ikke meny.
 * Meny: desktop = persistent skinne. Telefon = fullskjerm-overlay.
 */

/** Rot: #84 dvh/overscroll + #85 min-h-svh. Safe-area sitter på toppbar og overlay. */
export const PHONE_SHELL_ROT =
  'flex h-dvh max-h-dvh min-h-dvh min-h-svh w-full overflow-hidden bg-bg text-fg overscroll-none';

export const PHONE_SAFE_TOP = 'pt-[env(safe-area-inset-top)]';
export const PHONE_SAFE_BUNN = 'pb-[calc(env(safe-area-inset-bottom)+1.25rem)]';

/**
 * Samme flate som resten av appen (`CardShell`): `--ew-surface` / `--ew-fg`.
 * Ikke `bg-accent` — i theme.css er `--color-accent` shadcn-hover
 * (`--ew-surface-2`, parchment #f5f5f7 i lyst) mens `text-accent-fg` er `--ew-accent-fg`
 * (hvit i lyst). Den kombinasjonen er den vaskede «hvite overlay»-en.
 */
export const PHONE_KORT_FYLL = 'rounded-xl border border-border bg-card text-fg shadow-none';
/** Hero: radius 16, samme surface/hairline — ikke `#111`. */
export const PHONE_HERO_FYLL = 'rounded-[16px] border border-border bg-card text-fg shadow-none';

/** Jonas 05.09 Apple-hjem — ærlig tomtilstand per kort. */
export const HJEM_KORT_TOM = {
  hero: 'Ingen jobber i dag',
  timeplan: 'Ingen jobber i dag',
  innboks: 'Ingen uleste',
  jobber: 'Ingen åpne jobber',
  kunder: 'Ingen kunder ennå',
  organisasjon: 'Åpne organisasjon',
  rapporter: 'Ingen tall ennå',
  lager: 'Ingen lave varer',
  lagerTomt: 'Ingen deler ennå',
  hjelp: 'Artikler og support',
} as const;

/**
 * Innholdskolonne for det største Verksted-kortet (telefon-hjem + desktop-hero)
 * og Ronny idle/peek-grainient. Full-åpen Ronny er viewport-grainient under chrome.
 */
export const VERKSTED_INNHOLD = 'mx-auto w-full max-w-[520px] px-3 md:max-w-[1120px] md:px-8';

export const FORBUDT_DEALER_HJEM = [
  'book',
  'oppslag',
  'ai',
  'kompetanse',
  'prisliste',
  'abonnement',
] as const;

export type PhoneKortKey =
  | 'verkstedet'
  | 'timeplan'
  | 'statistikk'
  | 'tjenester'
  | 'innboks'
  | 'jobber'
  | 'kunder'
  | 'organisasjon'
  | 'samarbeid'
  | 'hjelp'
  | 'lager'
  | 'butikk'
  | 'min-dag'
  | 'dine-jobber'
  | 'kompetanse';

export type PhoneHjemRad = {
  keys: PhoneKortKey[];
  kind: 'hero' | 'full' | 'pair' | 'low';
};

/**
 * Jonas 05.09 Apple-hjem: hero → Timeplan|Rapporter → Innboks|Jobber →
 * Kunder|Organisasjon → Samarbeid|Hjelp → Lager. Samarbeid hoppes i
 * `dealerPhoneHjemRader` når raden ikke står i nav.
 */
export const DEALER_PHONE_HJEM: PhoneHjemRad[] = [
  { keys: ['verkstedet'], kind: 'hero' },
  { keys: ['timeplan', 'statistikk'], kind: 'pair' },
  { keys: ['innboks', 'jobber'], kind: 'pair' },
  { keys: ['kunder', 'organisasjon'], kind: 'pair' },
  { keys: ['samarbeid', 'hjelp'], kind: 'pair' },
  { keys: ['lager'], kind: 'low' },
];

/** Små destinasjonskort under Lager. Dine jobber og Lager er egne flater. */
export const MEKANIKER_PHONE_HURTIG: PhoneKortKey[] = ['kompetanse', 'timeplan', 'hjelp'];

export const PHONE_KORT_META: Record<
  PhoneKortKey,
  { label: string; href: string; icon: LucideIcon }
> = {
  verkstedet: { label: 'Verkstedet', href: '/dashboard?visning=dag', icon: LayoutDashboard },
  timeplan: { label: 'Timeplan', href: '/jobber?visning=kalender', icon: CalendarDays },
  statistikk: { label: 'Rapporter', href: '/rapporter', icon: ChartColumn },
  tjenester: { label: 'Tjenester', href: '/prisliste', icon: Wrench },
  innboks: { label: 'Innboks', href: '/innboks', icon: Inbox },
  jobber: { label: 'Jobber', href: '/jobber', icon: ClipboardList },
  kunder: { label: 'Kunder', href: '/kunder', icon: Users },
  organisasjon: { label: 'Organisasjon', href: '/organisasjon', icon: Building2 },
  samarbeid: { label: 'Samarbeid', href: '/samarbeid', icon: Handshake },
  hjelp: { label: 'Hjelp', href: '/support', icon: LifeBuoy },
  lager: { label: 'Lager', href: '/lager', icon: Package },
  butikk: { label: 'Butikk', href: '/butikk', icon: Store },
  'min-dag': { label: 'Dine jobber', href: '/dine-jobber', icon: CalendarDays },
  'dine-jobber': { label: 'Dine jobber', href: '/dine-jobber', icon: CalendarDays },
  kompetanse: { label: 'Kompetanse', href: '/min-dag/kompetanse', icon: ShieldCheck },
};

export const MEKANIKER_TIMEPLAN_HREF = '/min-dag/timeplan';

/** Samarbeid er ute av `FORHANDLER_NAV` (Mikael 01.09) — da hopper hjem-kortet. */
export function samarbeidSynligINav(): boolean {
  return FORHANDLER_NAV.some((i) => i.key === 'samarbeid');
}

export function dealerPhoneHjemRader(
  shopEnabled: boolean,
  samarbeidSynlig = samarbeidSynligINav(),
): PhoneHjemRad[] {
  return DEALER_PHONE_HJEM.flatMap((rad) => {
    if (rad.kind === 'low') {
      return [shopEnabled ? { ...rad, keys: ['lager', 'butikk'] as PhoneKortKey[] } : rad];
    }
    if (!rad.keys.includes('samarbeid') || samarbeidSynlig) return [rad];
    const rest = rad.keys.filter((k) => k !== 'samarbeid');
    if (rest.length === 0) return [];
    return [{ keys: rest, kind: rest.length === 1 ? 'full' : rad.kind }];
  });
}

export function mekanikerHurtigKort(shopEnabled: boolean): PhoneKortKey[] {
  if (!shopEnabled) return [...MEKANIKER_PHONE_HURTIG];
  return [...MEKANIKER_PHONE_HURTIG, 'butikk'];
}

export function flatDealerHjemKeys(shopEnabled: boolean): PhoneKortKey[] {
  return dealerPhoneHjemRader(shopEnabled).flatMap((r) => r.keys);
}

export function erDealerPhoneHjem(pathname: string, search = ''): boolean {
  const hjem = pathname === '/dashboard' || pathname === '/verkstedet';
  if (!hjem) return false;
  return (
    new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('visning') !== 'dag'
  );
}

export function erMekanikerPhoneHjem(pathname: string): boolean {
  return pathname === '/min-dag';
}

export function erPhoneHjem(pathname: string, search: string, shell: ShellKey): boolean {
  if (shell === 'mekaniker') return erMekanikerPhoneHjem(pathname);
  if (shell === 'forhandler') return erDealerPhoneHjem(pathname, search);
  return pathname === '/endwise';
}

export function phoneHjemHref(shell: ShellKey): string {
  if (shell === 'mekaniker') return '/min-dag';
  if (shell === 'endwise' || shell === 'endwise_partner') return '/endwise';
  return '/dashboard';
}

/** Innstillinger på telefon-bevel: Profil + Varsler, eller Meg for mekaniker. */
export function phoneInnstillingerHref(shell: ShellKey): string {
  return settingsForShell(shell)?.href ?? '/min-dag/meg';
}

export function ukeStartMandag(naa: Date): Date {
  const d = new Date(naa);
  d.setHours(0, 0, 0, 0);
  const dag = d.getDay();
  const tilMandag = dag === 0 ? -6 : 1 - dag;
  d.setDate(d.getDate() + tilMandag);
  return d;
}
