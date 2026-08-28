'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  isVerkstedInspectPath,
  remapHrefTilInspect,
  verkstedSlugFromPath,
} from '../_lib/plattform';
import { useOrgRole } from '../_lib/use-org-role';
import { ORGANISASJON_SEKSJONER } from './nav';
import { PHONE_H_SCROLL, PHONE_LOGO_KOLONNE } from './phone-chrome';

/**
 * Top-bar 2 — Organisasjon-seksjoner.
 * Desktop: samme 32-rad som top-bar 1 (h-control).
 * Telefon: litt høyere rad (py-1.5) med piller som har py-1 — ikke flush
 * mot barens kant, ikke h-row (40). text-label, aktiv = sidebar-active
 * #ededed, hover = surface-2 #f5f5f5. Ingen svarte piller.
 * Én rad, overflow-x, gap-2, ingen wrap. Venstre kant = etter sticky logo.
 */
export function erOrganisasjonSide(pathname: string): boolean {
  if (pathname === '/organisasjon' || pathname.startsWith('/organisasjon/')) return true;
  return /\/endwise\/verksted\/[^/]+\/organisasjon(\/|$)/.test(pathname);
}

export function OrganisasjonSeksjonBar() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams();
  const { role } = useOrgRole();
  if (!erOrganisasjonSide(pathname)) return null;

  const inspect = isVerkstedInspectPath(pathname);
  const slug = verkstedSlugFromPath(pathname);
  const fra = search?.get('fra');
  const synlige = ORGANISASJON_SEKSJONER.filter(
    (p) => !p.roles || (role != null && p.roles.includes(role)) || inspect,
  );
  const seksjon = search?.get('seksjon');

  return (
    <nav
      aria-label="Organisasjon"
      className="flex h-control min-h-control shrink-0 touch-pan-x items-center overflow-y-hidden border-border border-b bg-bg max-md:h-auto max-md:min-h-0 max-md:py-1.5 md:px-4"
    >
      <div className={`${PHONE_LOGO_KOLONNE} md:hidden`} aria-hidden />
      <div
        className={`flex min-w-0 flex-1 flex-nowrap items-center gap-2 ${PHONE_H_SCROLL} max-md:pr-3`}
      >
        {synlige.map((p) => {
          const query = p.href.split('?')[1] ?? '';
          const valgt = query ? seksjon != null && query.includes(`seksjon=${seksjon}`) : !seksjon;
          const raw = inspect && slug ? remapHrefTilInspect(p.href, slug) : p.href;
          const href = fra
            ? `${raw}${raw.includes('?') ? '&' : '?'}fra=${encodeURIComponent(fra)}`
            : raw;
          return (
            <Link
              key={p.href}
              href={href as Route}
              scroll={false}
              aria-current={valgt ? 'page' : undefined}
              className={`inline-flex h-control min-h-control shrink-0 items-center whitespace-nowrap rounded-control px-2.5 text-label transition-colors max-md:h-auto max-md:min-h-0 max-md:py-1 ${
                valgt ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
