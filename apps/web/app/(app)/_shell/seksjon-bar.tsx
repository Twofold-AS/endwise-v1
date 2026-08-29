'use client';

import { MessageSquarePlus } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  isVerkstedInspectPath,
  remapHrefTilInspect,
  verkstedSlugFromPath,
} from '../_lib/plattform';
import { useOrgRole } from '../_lib/use-org-role';
import { INNBOKS_FILTERE, useInboxFilter } from './inbox-filter';
import { ORGANISASJON_SEKSJONER } from './nav';
import { PhoneHScroll } from './phone-h-scroll';
import { erDealerInnboks, erOrganisasjonSide } from './seksjon-sti';

export { erInnboksSide, erOrganisasjonSide } from './seksjon-sti';

/**
 * Top-bar 2 — Organisasjon (alle viewports) og Innboks (kun telefon).
 * Desktop: samme 32-rad som top-bar 1 (h-control).
 * Telefon: litt høyere rad (py-1.5) med piller som har py-1 — ikke flush
 * mot barens kant, ikke h-row (40). text-label, aktiv = sidebar-active
 * #ededed, hover = surface-2 #f5f5f5. Ingen svarte piller.
 * Organisasjon: piller wrapper på telefon (eller stables), desktop én rad.
 * Innboks-filter: horisontal scroll som før.
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
 * Innboks top-bar 2 — bare telefon.
 * Filterrad: ikon + tekst. Ny chat i samme rad. Ingen landing-pille.
 * Desktop har ingen top-bar 2 her; filtrene bor i list-headeren.
 */
export function InnboksSeksjonBar() {
  const pathname = usePathname() ?? '';
  const { part, setPart } = useInboxFilter();
  if (!erDealerInnboks(pathname)) return null;

  return (
    <nav
      aria-label="Innboks"
      className="flex touch-pan-x items-center overflow-y-hidden border-border border-b bg-bg px-3 py-1.5 md:hidden"
    >
      <PhoneHScroll lockKey={part} className="pr-3">
        {INNBOKS_FILTERE.map((p) => {
          const aktiv = part === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPart(p.key)}
              aria-pressed={aktiv}
              className={`${PILLE_KLASSE} ${
                aktiv ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
              }`}
            >
              <p.icon size={16} strokeWidth={1.75} />
              {p.label}
            </button>
          );
        })}
        <Link
          href={'/innboks?ny=1' as Route}
          className={`${PILLE_KLASSE} text-fg hover:bg-surface-2`}
        >
          <MessageSquarePlus size={16} strokeWidth={1.75} />
          Ny chat
        </Link>
      </PhoneHScroll>
    </nav>
  );
}
