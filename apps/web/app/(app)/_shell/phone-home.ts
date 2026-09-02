import type { LucideIcon } from '@endwise/ui';
import {
  Building2,
  CalendarDays,
  ChartColumn,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ShieldCheck,
  Store,
  Users,
  Wrench,
} from '@endwise/ui';
import { type ShellKey, settingsForShell } from './nav';

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

/**
 * Innholdskolonne for det største Verksted-kortet (telefon-hjem + desktop-hero)
 * og Ronny-grainient. Ikke full-bleed.
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

/** Dealer-rekkefølge: hero → Innboks|Timeplan → Statistikk|Salg → … → Lager lavt. */
export const DEALER_PHONE_HJEM: PhoneHjemRad[] = [
  { keys: ['verkstedet'], kind: 'hero' },
  { keys: ['innboks', 'timeplan'], kind: 'pair' },
  { keys: ['statistikk', 'tjenester'], kind: 'pair' },
  { keys: ['kunder', 'organisasjon'], kind: 'pair' },
  { keys: ['lager'], kind: 'low' },
];

/** Små destinasjonskort under Lager. Dine jobber og Lager er egne flater. */
export const MEKANIKER_PHONE_HURTIG: PhoneKortKey[] = ['kompetanse', 'timeplan', 'hjelp'];

export const PHONE_KORT_META: Record<
  PhoneKortKey,
  { label: string; href: string; icon: LucideIcon }
> = {
  verkstedet: { label: 'Verkstedet', href: '/dashboard?visning=dag', icon: LayoutDashboard },
  timeplan: { label: 'Timeplan', href: '/jobber', icon: CalendarDays },
  statistikk: { label: 'Statistikk', href: '/rapporter', icon: ChartColumn },
  tjenester: { label: 'Tjenester', href: '/prisliste', icon: Wrench },
  innboks: { label: 'Innboks', href: '/innboks', icon: Inbox },
  jobber: { label: 'Timeplan', href: '/jobber', icon: CalendarDays },
  kunder: { label: 'Kunder', href: '/kunder', icon: Users },
  organisasjon: { label: 'Organisasjon', href: '/organisasjon', icon: Building2 },
  hjelp: { label: 'Hjelp', href: '/support', icon: LifeBuoy },
  lager: { label: 'Lager', href: '/lager', icon: Package },
  butikk: { label: 'Butikk', href: '/butikk', icon: Store },
  'min-dag': { label: 'Dine jobber', href: '/dine-jobber', icon: CalendarDays },
  'dine-jobber': { label: 'Dine jobber', href: '/dine-jobber', icon: CalendarDays },
  kompetanse: { label: 'Kompetanse', href: '/min-dag/kompetanse', icon: ShieldCheck },
};

export const MEKANIKER_TIMEPLAN_HREF = '/min-dag/timeplan';

export function dealerPhoneHjemRader(shopEnabled: boolean): PhoneHjemRad[] {
  return DEALER_PHONE_HJEM.map((rad) => {
    if (rad.kind !== 'low') return rad;
    return shopEnabled ? { ...rad, keys: ['lager', 'butikk'] as PhoneKortKey[] } : rad;
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
