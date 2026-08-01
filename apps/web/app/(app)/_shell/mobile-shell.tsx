'use client';

import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CircleUser,
  type LucideIcon,
  ShieldCheck,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useOnline } from '../_lib/use-online';
import { PwaRegister } from './pwa-register';

/**
 * F7-01 — Mekanikerens mobil-shell: bottom-nav med 5 faner + offline-banner.
 * Erstatter admin-sidebaren for `dealer_staff`-mekanikere (mobil-først). Store
 * trykkmål, ingen tabeller. Rollegatingen skjer i (app)/layout; her er UI-et.
 */
const TABS: { href: Route; label: string; icon: LucideIcon }[] = [
  { href: '/min-dag' as Route, label: 'I dag', icon: CalendarCheck },
  { href: '/min-dag/timeplan' as Route, label: 'Timeplan', icon: CalendarDays },
  { href: '/min-dag/varsler' as Route, label: 'Varsler', icon: Bell },
  { href: '/min-dag/kompetanse' as Route, label: 'Kompetanse', icon: ShieldCheck },
  { href: '/min-dag/profil' as Route, label: 'Profil', icon: CircleUser },
];

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const online = useOnline();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg text-fg">
      <PwaRegister />

      {!online && (
        <div className="flex items-center justify-center gap-2 bg-warn/15 px-3 py-1.5 text-warn text-xs">
          <span className="inline-block size-2 rounded-full bg-warn" />
          Offline — statusendringer legges i kø og sendes når du er tilbake på nett
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {children}
      </main>

      <nav
        className="grid shrink-0 grid-cols-5 border-border border-t bg-card"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((t) => {
          const active =
            t.href === '/min-dag' ? pathname === '/min-dag' : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                active ? 'text-primary' : 'text-fg-faint'
              }`}
            >
              <Icon size={20} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
