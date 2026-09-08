'use client';

import { LogOut, MessageCirclePlus, Settings } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  PHONE_PROFIL_MENY_BREDDE,
  PHONE_PROFIL_MENY_TOPP,
  PHONE_PROFIL_RAD,
  PHONE_PROFIL_VILKAR,
} from './phone-chrome';
import { PhoneTemaRad } from './phone-tema-rad';

export function PhoneProfilMeny({
  apen,
  onLukk,
  navn,
  epost,
  innstillingerHref,
  tvingVis = false,
}: {
  apen: boolean;
  onLukk: () => void;
  navn: string | null;
  epost: string | null;
  innstillingerHref: string;
  /** Visuell GO på desktop — produktet holder `md:hidden`. */
  tvingVis?: boolean;
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
  const kunTelefon = tvingVis ? '' : 'md:hidden';

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
        className={`fixed inset-0 z-[70] bg-transparent ${kunTelefon}`}
        onClick={onLukk}
      />
      <div
        data-phone-profil-meny
        role="menu"
        aria-label="Profil"
        className={`absolute right-3 z-[75] ${PHONE_PROFIL_MENY_TOPP} flex max-h-[min(72dvh,560px)] ${PHONE_PROFIL_MENY_BREDDE} flex-col overflow-y-auto rounded-[16px] border border-border bg-card py-1.5 shadow-lg ${kunTelefon}`}
      >
        <div className="px-4 pb-2">
          <p className="truncate text-[16px] font-[650] text-fg">{navn?.trim() || '—'}</p>
          <p className="truncate text-[13px] text-fg-muted">{epost?.trim() || '—'}</p>
        </div>
        <div className="px-3 pb-2">
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
          className={PHONE_PROFIL_RAD}
        >
          <MessageCirclePlus size={18} strokeWidth={2} />
          Forespørsel
        </Link>
        <Link
          href={innstillingerHref as Route}
          role="menuitem"
          data-phone-profil-innstillinger
          onClick={onLukk}
          className={PHONE_PROFIL_RAD}
        >
          <Settings size={18} strokeWidth={2} />
          Innstillinger
        </Link>
        <div data-phone-profil-modus-over className="ew-haarlinje" />
        <PhoneTemaRad />
        <div data-phone-profil-modus-under className="ew-haarlinje" />
        <Link
          href={'/veikart' as Route}
          role="menuitem"
          onClick={onLukk}
          className={PHONE_PROFIL_RAD}
        >
          Veikart
        </Link>
        <Link
          href={'/support?kategori=oppdateringer' as Route}
          role="menuitem"
          onClick={onLukk}
          className={PHONE_PROFIL_RAD}
        >
          Oppdateringer
        </Link>
        <div data-phone-profil-ut-skille className="ew-haarlinje" />
        <button
          type="button"
          role="menuitem"
          data-phone-profil-ut
          onClick={() => void loggUt()}
          className={`${PHONE_PROFIL_RAD} w-full text-left`}
        >
          <LogOut size={18} strokeWidth={2} />
          Logg ut
        </button>
        <div data-phone-profil-vilkar-skille className="ew-haarlinje" />
        <Link
          href={'/vilkar' as Route}
          role="menuitem"
          data-phone-profil-vilkar
          onClick={onLukk}
          className={PHONE_PROFIL_VILKAR}
        >
          Vilkår
        </Link>
        <p data-phone-profil-copy className="px-4 pt-1 pb-0.5 text-[11px] text-fg-faint">
          © Twofold
        </p>
      </div>
    </>
  );
}
