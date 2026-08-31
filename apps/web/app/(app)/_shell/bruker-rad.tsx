'use client';

import { Avatar, LogOut, Settings } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { BEVEL } from './cards';

/**
 * Avatar + navn + logg ut i samme bevel som Handlinger.
 * Ingen rolletittel. Avataren har ingen egen boks.
 * `innstillingerHref` er bare telefon-bevel — desktop-sidebar sender den ikke.
 */
export function BrukerRad({
  navn,
  laster = false,
  collapsed,
  onLoggUt,
  innstillingerHref,
}: {
  navn: string | null;
  rolle?: string | null;
  laster?: boolean;
  collapsed: boolean;
  onLoggUt: () => void | Promise<void>;
  innstillingerHref?: string;
}) {
  const me = trpc.session.me.useQuery();
  const profil = trpc.profile.meg.useQuery(undefined, { retry: false });
  const seed = me.data?.userId ?? null;

  const avatar = seed ? (
    <Avatar
      seed={seed}
      valg={profil.data?.avatar}
      navn=""
      size={collapsed ? 22 : 22}
      bevegelse="stille"
    />
  ) : (
    <span className="inline-block size-[22px] shrink-0" aria-hidden />
  );

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => void onLoggUt()}
        title={navn ? `Logg ut (${navn})` : 'Logg ut'}
        aria-label={navn ? `Logg ut (${navn})` : 'Logg ut'}
        style={BEVEL}
        className="flex h-control w-full items-center justify-center rounded-control transition hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-ring"
      >
        {avatar}
      </button>
    );
  }

  return (
    <div style={BEVEL} className="flex h-control w-full items-center gap-2 rounded-control px-2.5">
      {avatar}
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
          title="Innstillinger"
          aria-label="Innstillinger"
          className="flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Settings size={15} strokeWidth={1.75} />
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void onLoggUt()}
        title="Logg ut"
        aria-label="Logg ut"
        className="flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
      >
        <LogOut size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}
