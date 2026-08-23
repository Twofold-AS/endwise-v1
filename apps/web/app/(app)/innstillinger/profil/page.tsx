'use client';

import { Moon, Sun } from '@endwise/ui';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { AvatarVelger } from '../../_avatar/avatar-velger';
import { lesTema, settTema, type Tema } from '../../_lib/tema';
import { ProfilKort } from '../../_shell/profil-kort';
import { ToFaktorRad } from '../../_shell/to-faktor-rad';

/**
 * F5-19 / F1-17 / F1-20 — Settings › Profil. Egen bruker, sikkerhet og tema.
 *
 * Passordbytte (F1-17) bor i `ProfilKort` — samme komponent som mekanikerens
 * «Meg». 2FA-status (F1-20) leser `session.user.twoFactorEnabled`. Slå-av
 * (F1-22) krever gjeldende passord i `ToFaktorRad`.
 */
export default function ProfilPage() {
  /**
   * ⚠️ RETTET 20.08.2026: denne siden hadde sin EGEN kopi av tema-logikken, og
   * den lagret like lite som den i shellet. To kopier av samme regel kan bare
   * bli enige ved et sammentreff. Begge bruker nå `_lib/tema.ts`.
   */
  const [theme, setTheme] = useState<Tema>('light');

  /**
   * F6-19 — seeden til EGEN avatar er `user.id`, ikke noe `profile.meg`
   * returnerer. Ruta returnerer den bevisst ikke: klienten har den allerede
   * herfra, og to kilder til samme seed er to steder den kan bli feil.
   */
  const me = trpc.session.me.useQuery();
  const { data: session } = useSession();
  const twoFactorEnabled =
    session?.user && 'twoFactorEnabled' in session.user
      ? (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
      : undefined;

  useEffect(() => {
    setTheme(lesTema());
  }, []);

  function toggleTheme() {
    const next: Tema = theme === 'light' ? 'dark' : 'light';
    settTema(next);
    setTheme(next);
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Profil</h1>
        <p className="text-body text-fg-muted">
          Navn, kallenavn, avatar, varslingslyder, sikkerhet og utseende.
        </p>
      </div>

      <ProfilKort />

      <AvatarVelger seed={me.data?.userId ?? null} />

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex h-row-store items-center gap-3 bg-bg px-4">
          <Sun size={16} className="shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label text-fg">Utseende</span>
            <span className="text-[12px] text-fg-muted">Lyst tema er standard.</span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-control items-center gap-2 rounded-control border border-border px-3 text-label text-fg transition-colors hover:bg-surface-2"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Bytt til mørkt' : 'Bytt til lyst'}
          </button>
        </div>

        <div className="border-border border-t">
          <ToFaktorRad enabled={twoFactorEnabled} />
        </div>
      </div>
    </div>
  );
}
