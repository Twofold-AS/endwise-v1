'use client';

import { Avatar, LogOut, Settings } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { BEVEL } from './cards';

/**
 * Desktop-sidebar: navn + profil + logg ut. Flat — ingen BEVEL, ingen avatar.
 * Kollapset: bare logg-ut-knappen.
 * Telefon-bevel: avatar + navn + logg ut, med BEVEL (dokumentflyt, ikke sidebar-regelen).
 */
export function BrukerRad({
  navn,
  laster = false,
  collapsed,
  onLoggUt,
  innstillingerHref,
  variant = 'sidebar',
}: {
  navn: string | null;
  rolle?: string | null;
  laster?: boolean;
  collapsed: boolean;
  onLoggUt: () => void | Promise<void>;
  innstillingerHref?: string;
  variant?: 'sidebar' | 'phone';
}) {
  const me = trpc.session.me.useQuery();
  const profil = trpc.profile.meg.useQuery(undefined, { retry: false });
  const seed = me.data?.userId ?? null;
  const telefon = variant === 'phone';

  const avatar = seed ? (
    <Avatar seed={seed} valg={profil.data?.avatar} navn="" size={22} bevegelse="stille" />
  ) : (
    <span className="inline-block size-[22px] shrink-0" aria-hidden />
  );

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

  if (collapsed && !telefon) {
    return <div className="flex w-full items-center justify-center">{loggUt}</div>;
  }

  return (
    <div
      style={telefon ? BEVEL : undefined}
      className={`flex h-control w-full items-center gap-2 ${
        telefon ? 'rounded-control px-2.5' : 'px-1'
      }`}
    >
      {telefon ? avatar : null}
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
          className="flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Settings size={15} strokeWidth={1.75} />
        </Link>
      ) : null}
      {loggUt}
    </div>
  );
}
