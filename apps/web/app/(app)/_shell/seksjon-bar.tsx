'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useOrgRole } from '../_lib/use-org-role';
import { type InboxPart, useInboxFilter } from './inbox-filter';
import { shellForBruker } from './nav';
import { destinasjonFaner } from './seksjon-faner';

/**
 * Top-bar 2 under Ronny på ALLE destinasjoner (Jonas 28.08 / Mikael 02.09).
 * h-control, text-label, aktiv sidebar-active (#ededed), hover parchment.
 * Frosted parchment, ikke svarte piller. gap-2 telefon / gap-8 desktop.
 */
const PILLE_KLASSE =
  'inline-flex h-control min-h-control shrink-0 items-center whitespace-nowrap rounded-control px-2.5 text-label transition-colors max-md:h-auto max-md:min-h-0 max-md:py-1';

export function DestinasjonSeksjonBar() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const { role, jobbfunksjon, isMechanic, erPlattform, shopEnabled } = useOrgRole();
  const { part, setPart } = useInboxFilter();
  const shell = shellForBruker({
    role,
    jobFunction: jobbfunksjon,
    isMechanic,
    erPlattform,
  });
  const faner = destinasjonFaner({
    pathname,
    search,
    role,
    shell,
    shopEnabled,
    inboxPart: part,
  });
  if (faner.length === 0) return null;

  const fra = searchParams?.get('fra');
  const inboxKnapper = faner.some((f) => f.inboxPart);

  return (
    <nav
      data-destinasjon-bar
      aria-label="Seksjoner"
      className="flex flex-wrap items-center gap-2 overflow-x-auto border-border border-b bg-surface-2/80 px-3 py-1.5 md:h-control md:min-h-control md:flex-nowrap md:gap-8 md:overflow-visible md:px-4 md:py-0"
    >
      {faner.map((f) => {
        const klasse = `${PILLE_KLASSE} ${
          f.valgt ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
        }`;
        if (inboxKnapper && f.inboxPart) {
          return (
            <button
              key={f.inboxPart}
              type="button"
              aria-current={f.valgt ? 'page' : undefined}
              onClick={() => setPart(f.inboxPart as InboxPart)}
              className={klasse}
            >
              {f.label}
            </button>
          );
        }
        const href = fra
          ? `${f.href}${f.href.includes('?') ? '&' : '?'}fra=${encodeURIComponent(fra)}`
          : f.href;
        return (
          <Link
            key={`${f.label}:${f.href}`}
            href={href as Route}
            scroll={false}
            aria-current={f.valgt ? 'page' : undefined}
            className={klasse}
          >
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Beholdt navn — samme stripe som DestinasjonSeksjonBar. */
export function OrganisasjonSeksjonBar() {
  return <DestinasjonSeksjonBar />;
}

/** Innboks-faner bor i DestinasjonSeksjonBar. */
export function InnboksSeksjonBar() {
  return null;
}
