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
import { erOrganisasjonSide } from './seksjon-sti';

export { erInnboksSide, erOrganisasjonSide } from './seksjon-sti';

/**
 * Top-bar 2 — Organisasjon (alle viewports).
 * text-label, aktiv = sidebar-active, wrap / to rader OK — ingen slider.
 * Innboks-verktøylinjen bor i innboks-lista (to linjer), ikke her.
 */
const PILLE_KLASSE =
  'inline-flex h-control min-h-control shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-label transition-colors max-md:h-auto max-md:min-h-0 max-md:py-1';

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
      className="flex flex-wrap items-center gap-2 border-border border-b bg-bg px-3 py-1.5 md:h-control md:min-h-control md:flex-nowrap md:px-4 md:py-0"
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
            className={`${PILLE_KLASSE} ${
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

/**
 * Innboks-verktøy bor i lista (to linjer, ingen slider). Beholdt som
 * no-op så layout-importen ikke hopper.
 */
export function InnboksSeksjonBar() {
  return null;
}
