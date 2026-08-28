'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useOrgRole } from '../_lib/use-org-role';
import { ORGANISASJON_SEKSJONER } from './nav';

/**
 * Top-bar 2 — Organisasjon-seksjoner.
 * Jonas 28.08: samme radhøyde som top-bar 1 (h-control), text-label,
 * aktiv = sidebar-active, hover = surface-2. Ikke primærknapp, ikke wrap.
 */
export function erOrganisasjonSide(pathname: string): boolean {
  return pathname === '/organisasjon' || pathname.startsWith('/organisasjon/');
}

export function OrganisasjonSeksjonBar() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams();
  const { role } = useOrgRole();
  if (!erOrganisasjonSide(pathname)) return null;

  const synlige = ORGANISASJON_SEKSJONER.filter(
    (p) => !p.roles || (role != null && p.roles.includes(role)),
  );
  const seksjon = search?.get('seksjon');

  return (
    <nav
      aria-label="Organisasjon"
      className="flex h-control shrink-0 items-center gap-2 overflow-x-auto border-border border-b bg-bg px-4"
    >
      {synlige.map((p) => {
        const query = p.href.split('?')[1] ?? '';
        const valgt = query ? seksjon != null && query.includes(`seksjon=${seksjon}`) : !seksjon;
        return (
          <Link
            key={p.href}
            href={p.href as Route}
            scroll={false}
            aria-current={valgt ? 'page' : undefined}
            className={`inline-flex h-control shrink-0 items-center rounded-control px-2.5 text-label transition-colors ${
              valgt ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
