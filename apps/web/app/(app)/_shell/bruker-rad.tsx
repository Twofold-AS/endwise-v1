'use client';

import { Avatar, LogOut, Settings } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { BEVEL } from './cards';

/**
 * Sidebar-footer: bevel-avatar + navn + profil + logg ut.
 * Ingen ikon-skinne — raden er alltid full.
 */
export function BrukerRad({
  navn,
  userId,
  laster = false,
  onLoggUt,
  innstillingerHref,
  onNavigate,
}: {
  navn: string | null;
  userId?: string | null;
  laster?: boolean;
  onLoggUt: () => void | Promise<void>;
  innstillingerHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <div
      data-sidebar-bruker
      style={BEVEL}
      className="flex h-row min-w-0 items-center gap-2 rounded-lg px-2"
    >
      {userId ? (
        <Avatar seed={userId} bevegelse="stille" navn={navn ?? undefined} size={22} />
      ) : (
        <span className="size-[22px] shrink-0 rounded-full bg-inset" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate text-left text-label text-fg">
        {laster ? (
          <span className="inline-block h-3.5 w-24 animate-pulse rounded-sm bg-inset" />
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
          className="flex size-6 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-inset hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Settings size={16} strokeWidth={1.75} />
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void onLoggUt()}
        title={navn ? `Logg ut (${navn})` : 'Logg ut'}
        aria-label={navn ? `Logg ut (${navn})` : 'Logg ut'}
        className="flex size-6 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
      >
        <LogOut size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
