'use client';

import { CalendarDays, CreditCard, Plug, Users } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { CardShell } from '../_shell/cards';

export const ORG_LISTE = [
  { id: 'ansatte', label: 'Ansatte', href: '/organisasjon?seksjon=ansatte', icon: Users },
  { id: 'timeplan', label: 'Timeplan', href: '/jobber', icon: CalendarDays },
  {
    id: 'abonnement',
    label: 'Abonnement',
    href: '/organisasjon?seksjon=abonnement',
    icon: CreditCard,
    admin: true,
  },
  {
    id: 'integrasjoner',
    label: 'Integrasjoner',
    href: '/organisasjon?seksjon=integrasjoner',
    icon: Plug,
    admin: true,
  },
] as const;

/** Gruppert liste — erstatter Organisasjon top-bar 2. Ingen piller. */
export function OrganisasjonListe({ isAdmin }: { isAdmin: boolean }) {
  const rader = ORG_LISTE.filter((r) => !('admin' in r && r.admin) || isAdmin);
  return (
    <nav data-org-liste aria-label="Organisasjon">
      <CardShell>
        <ul className="flex flex-col">
          {rader.map((rad, i) => {
            const Ikon = rad.icon;
            return (
              <li key={rad.id} className={i > 0 ? 'border-border border-t' : undefined}>
                <Link
                  href={rad.href as Route}
                  className="flex h-row items-center gap-2 px-3 text-fg transition-colors hover:bg-surface-2"
                >
                  <Ikon size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                  <span className="text-label">{rad.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardShell>
    </nav>
  );
}
