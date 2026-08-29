import type { LucideIcon } from '@endwise/ui';
import {
  Building2,
  CalendarDays,
  ChartColumn,
  ChartLine,
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
import type { ShellKey } from './nav';

/**
 * Låst telefon-hjem (Jonas FILL 29.08.2026).
 * Kortene er destinasjoner med ekte meta — ikke tomme dører.
 * Desktop-sidebar er urørt. Denne fila er kun telefon-IA.
 */

/** Kort-hjem-rot: #84 dvh/overscroll + #85 min-h-svh. Safe-area sitter på logo/bevel. */
export const PHONE_SHELL_ROT =
  'flex h-dvh max-h-dvh min-h-svh w-full overflow-hidden bg-bg text-fg overscroll-none';

export const PHONE_SAFE_TOP = 'pt-[env(safe-area-inset-top)]';
export const PHONE_SAFE_BUNN = 'pb-[env(safe-area-inset-bottom)]';

export const PHONE_KORT_FYLL = 'rounded-xl bg-accent text-accent-fg shadow-none outline-none';

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
  | 'rapporter'
  | 'innboks'
  | 'jobber'
  | 'kunder'
  | 'organisasjon'
  | 'samarbeid'
  | 'hjelp'
  | 'lager'
  | 'butikk'
  | 'min-dag'
  | 'kompetanse';

export type PhoneHjemRad = {
  keys: PhoneKortKey[];
  kind: 'hero' | 'full' | 'pair' | 'low';
};

/** Dealer-rekkefølge: hero → Timeplan → Statistikk|Rapporter → … → Lager lavt. */
export const DEALER_PHONE_HJEM: PhoneHjemRad[] = [
  { keys: ['verkstedet'], kind: 'hero' },
  { keys: ['timeplan'], kind: 'full' },
  { keys: ['statistikk', 'rapporter'], kind: 'pair' },
  { keys: ['innboks', 'jobber'], kind: 'pair' },
  { keys: ['kunder', 'organisasjon'], kind: 'pair' },
  { keys: ['samarbeid', 'hjelp'], kind: 'pair' },
  { keys: ['lager'], kind: 'low' },
];

export const MEKANIKER_PHONE_HURTIG: PhoneKortKey[] = ['lager', 'kompetanse', 'timeplan', 'hjelp'];

export const PHONE_KORT_META: Record<
  PhoneKortKey,
  { label: string; href: string; icon: LucideIcon }
> = {
  verkstedet: { label: 'Verkstedet', href: '/dashboard?visning=dag', icon: LayoutDashboard },
  timeplan: { label: 'Timeplan', href: '/jobber?visning=kalender', icon: CalendarDays },
  statistikk: { label: 'Statistikk', href: '/rapporter', icon: ChartColumn },
  rapporter: { label: 'Rapporter', href: '/analyse', icon: ChartLine },
  innboks: { label: 'Innboks', href: '/innboks', icon: Inbox },
  jobber: { label: 'Jobber', href: '/jobber', icon: Wrench },
  kunder: { label: 'Kunder', href: '/kunder', icon: Users },
  organisasjon: { label: 'Organisasjon', href: '/organisasjon', icon: Building2 },
  samarbeid: { label: 'Samarbeid', href: '/samarbeid', icon: Handshake },
  hjelp: { label: 'Hjelp', href: '/support', icon: LifeBuoy },
  lager: { label: 'Lager', href: '/lager', icon: Package },
  butikk: { label: 'Butikk', href: '/butikk', icon: Store },
  'min-dag': { label: 'Min dag', href: '/min-dag', icon: CalendarDays },
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
  return ['lager', 'kompetanse', 'timeplan', 'hjelp', 'butikk'];
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

export function ukeStartMandag(naa: Date): Date {
  const d = new Date(naa);
  d.setHours(0, 0, 0, 0);
  const dag = d.getDay();
  const tilMandag = dag === 0 ? -6 : 1 - dag;
  d.setDate(d.getDate() + tilMandag);
  return d;
}
