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
import { PHONE_LOGO_KOLONNE } from './phone-chrome';
import { PhoneHScroll } from './phone-h-scroll';
import { erDealerInnboks, erOrganisasjonSide } from './seksjon-sti';

export { erInnboksSide, erOrganisasjonSide } from './seksjon-sti';

/**
 * Top-bar 2 — Organisasjon (alle viewports) og Innboks (kun telefon).
 * Desktop: samme 32-rad som top-bar 1 (h-control).
 * Telefon: litt høyere rad (py-1.5) med piller som har py-1 — ikke flush
 * mot barens kant, ikke h-row (40). text-label, aktiv = sidebar-active
 * #ededed, hover = surface-2 #f5f5f5. Ingen svarte piller.
 * Én rad, overflow-x, gap-2, ingen wrap. Venstre kant = etter sticky logo.
 */
const PILLE_KLASSE =
  'inline-flex h-control min-h-control shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-label transition-colors max-md:h-auto max-md:min-h-0 max-md:py-1';

function SeksjonPilleNav({
  ariaLabel,
  piller,
  erValgt,
}: {
  ariaLabel: string;
  piller: { label: string; href: string }[];
  erValgt: (p: { label: string; href: string }) => boolean;
}) {
  const pathname = usePathname() ?? '';
  const search = useSearchParams();
  const inspect = isVerkstedInspectPath(pathname);
  const slug = verkstedSlugFromPath(pathname);
  const fra = search?.get('fra');
  const aktivHref = piller.find((p) => erValgt(p))?.href ?? '';

  return (
    <nav
      aria-label={ariaLabel}
      className="flex h-control min-h-control shrink-0 touch-pan-x items-center overflow-y-hidden border-border border-b bg-bg max-md:h-auto max-md:min-h-0 max-md:py-1.5 md:px-4"
    >
      <div className={`${PHONE_LOGO_KOLONNE} md:hidden`} aria-hidden />
      <PhoneHScroll
        lockKey={`${pathname}:${aktivHref}`}
        className="max-md:pr-3"
        telefonBareSpacer
      >
        {piller.map((p) => {
          const valgt = erValgt(p);
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
      </PhoneHScroll>
    </nav>
  );
}

export function OrganisasjonSeksjonBar() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams();
  const { role } = useOrgRole();
  if (!erOrganisasjonSide(pathname)) return null;

  const inspect = isVerkstedInspectPath(pathname);
  const synlige = ORGANISASJON_SEKSJONER.filter(
    (p) => !p.roles || (role != null && p.roles.includes(role)) || inspect,
  );
  const seksjon = search?.get('seksjon');

  return (
    <SeksjonPilleNav
      ariaLabel="Organisasjon"
      piller={synlige}
      erValgt={(p) => {
        const query = p.href.split('?')[1] ?? '';
        return query ? seksjon != null && query.includes(`seksjon=${seksjon}`) : !seksjon;
      }}
    />
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
      className="flex touch-pan-x items-center overflow-y-hidden border-border border-b bg-bg py-1.5 md:hidden"
    >
      <div className={PHONE_LOGO_KOLONNE} aria-hidden />
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
