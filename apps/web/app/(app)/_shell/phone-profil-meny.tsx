'use client';

import { LogOut, MessageCirclePlus, Settings } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { PhoneTemaRad } from './phone-tema-rad';

export function PhoneProfilMeny({
  apen,
  onLukk,
  navn,
  epost,
  innstillingerHref,
}: {
  apen: boolean;
  onLukk: () => void;
  navn: string | null;
  epost: string | null;
  innstillingerHref: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!apen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onLukk();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apen, onLukk]);

  if (!apen) return null;

  async function loggUt() {
    onLukk();
    await authClient.signOut().catch(() => undefined);
    router.replace('/signin' as Route);
  }

  return (
    <>
      <button
        type="button"
        data-phone-profil-scrim
        aria-label="Lukk meny"
        className="fixed inset-0 z-[70] bg-transparent md:hidden"
        onClick={onLukk}
      />
      <div
        data-phone-profil-meny
        role="menu"
        aria-label="Profil"
        className="absolute top-full right-3 z-[75] mt-1 flex max-h-[min(72dvh,560px)] w-[min(100%-1.5rem,320px)] flex-col overflow-y-auto rounded-[16px] border border-border bg-card py-3 shadow-lg md:hidden"
      >
        <div className="px-4 pb-3">
          <p className="truncate text-[16px] font-[650] text-fg">{navn?.trim() || '—'}</p>
          <p className="truncate text-[13px] text-fg-muted">{epost?.trim() || '—'}</p>
        </div>
        <div className="px-3 pb-3">
          <Link
            href={'/organisasjon?seksjon=abonnement' as Route}
            data-phone-profil-oppgrader
            role="menuitem"
            onClick={onLukk}
            className="flex h-10 w-full items-center justify-center rounded-full bg-[#0066ff] text-[14px] font-[650] text-white"
          >
            Oppgrader abonnement
          </Link>
        </div>
        <Link
          href={'/support' as Route}
          role="menuitem"
          onClick={onLukk}
          className="flex h-11 items-center gap-3 px-4 text-label text-fg"
        >
          <MessageCirclePlus size={16} strokeWidth={1.6} />
          Forespørsel
        </Link>
        <Link
          href={innstillingerHref as Route}
          role="menuitem"
          data-phone-profil-innstillinger
          onClick={onLukk}
          className="flex h-11 items-center gap-3 px-4 text-label text-fg"
        >
          <Settings size={16} strokeWidth={1.6} />
          Innstillinger
        </Link>
        <PhoneTemaRad />
        <Link
          href={'/veikart' as Route}
          role="menuitem"
          onClick={onLukk}
          className="flex h-11 items-center px-4 text-label text-fg"
        >
          Veikart
        </Link>
        <Link
          href={'/support?kategori=oppdateringer' as Route}
          role="menuitem"
          onClick={onLukk}
          className="flex h-11 items-center px-4 text-label text-fg"
        >
          Oppdateringer
        </Link>
        <button
          type="button"
          role="menuitem"
          data-phone-profil-ut
          onClick={() => void loggUt()}
          className="flex h-11 items-center gap-3 px-4 text-left text-label text-fg"
        >
          <LogOut size={16} strokeWidth={1.6} />
          Logg ut
        </button>
        <div className="mx-4 my-1 h-px bg-border" />
        <Link
          href={'/vilkar' as Route}
          role="menuitem"
          onClick={onLukk}
          className="flex h-11 items-center px-4 text-label text-fg-muted"
        >
          Vilkår
        </Link>
      </div>
    </>
  );
}
