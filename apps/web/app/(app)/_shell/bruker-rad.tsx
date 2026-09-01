'use client';

import { LogOut, Settings } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';

/**
 * Sidebar (desktop-skinne og telefon-overlay): navn + profil + logg ut.
 * Flat — ingen BEVEL, ingen avatar. Kollapset desktop: bare logg-ut-knappen.
 */
export function BrukerRad({
  navn,
  laster = false,
  collapsed,
  onLoggUt,
  innstillingerHref,
  onNavigate,
}: {
  navn: string | null;
  rolle?: string | null;
  laster?: boolean;
  collapsed: boolean;
  onLoggUt: () => void | Promise<void>;
  innstillingerHref?: string;
  onNavigate?: () => void;
}) {
  const loggUt = (
    <button
      type="button"
      onClick={() => void onLoggUt()}
      title={navn ? `Logg ut (${navn})` : 'Logg ut'}
      aria-label={navn ? `Logg ut (${navn})` : 'Logg ut'}
      className="flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
    >
      <LogOut size={15} strokeWidth={1.75} />
    </button>
  );

  if (collapsed) {
    return <div className="flex w-full items-center justify-center">{loggUt}</div>;
  }

  return (
    <div className="flex h-control w-full items-center gap-2 px-1">
      <span className="min-w-0 flex-1 truncate text-left text-label text-fg">
        {laster ? (
          <span className="inline-block h-3.5 w-24 animate-pulse rounded-sm bg-surface-2" />
        ) : (
          (navn ?? '—')
        )}
      </span>
      {innstillingerHref ? (
        <Link
          href={innstillingerHref as Route}
          title="Profil"
          aria-label="Profil"
          onClick={onNavigate}
          className="flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Settings size={15} strokeWidth={1.75} />
        </Link>
      ) : null}
      {loggUt}
    </div>
  );
}
