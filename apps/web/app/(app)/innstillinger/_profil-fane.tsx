'use client';

import { Moon, Sun, Switch } from '@endwise/ui';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { AvatarVelger } from '../_avatar/avatar-velger';
import { lesTema, settTema, type Tema } from '../_lib/tema';
import { ByttEpostSkjema } from '../_shell/bytt-epost';
import { ByttPassordSkjema } from '../_shell/bytt-passord';
import { KallenavnFelt, VarslingslyderRad, VisningsnavnFelt } from '../_shell/profil-kort';
import { ToFaktorRad } from '../_shell/to-faktor-rad';

/**
 * F5-19 / F1-17 / F1-20 — Settings › Profil, landet i pille-fanen.
 *
 * Layout (Jonas + Mikael 26.08): blobatar 56px TIL VENSTRE, ett
 * identitetsblokk til høyre: visningsnavn · kallenavn · e-post. Form-,
 * farge- og uttrykk-velgeren er foldet under. Ingen filopplasting.
 * Felt-Lagre beholdes, ingen sticky Save.
 */
export function ProfilFane() {
  const [theme, setTheme] = useState<Tema>('light');
  const me = trpc.session.me.useQuery();
  const meg = trpc.profile.meg.useQuery();
  const { data: session } = useSession();
  const twoFactorEnabled =
    session?.user && 'twoFactorEnabled' in session.user
      ? (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
      : undefined;

  useEffect(() => {
    setTheme(lesTema());
  }, []);

  function byttTema(mork: boolean) {
    const next: Tema = mork ? 'dark' : 'light';
    settTema(next);
    setTheme(next);
  }

  return (
    <div className="flex flex-col gap-5">
      <AvatarVelger seed={me.data?.userId ?? null} size={56} foldFormer>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-label text-fg">Visningsnavn</p>
            <VisningsnavnFelt />
          </div>
          <div>
            <p className="mb-2 text-label text-fg">Kallenavn</p>
            <KallenavnFelt />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-label text-fg">E-post</p>
            <input
              value={meg.data?.epost ?? ''}
              readOnly
              aria-label="E-post"
              className="h-control w-full rounded-control border border-border bg-surface-2 px-2.5 text-body text-fg-muted outline-none"
            />
            <p className="mt-2 text-[11px] text-fg-muted">
              Byttes i to steg under — ikke med ett klikk.
            </p>
          </div>
        </div>
      </AvatarVelger>

      <ByttEpostSkjema gjeldende={meg.data?.epost ?? ''} />

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex h-row-store items-center gap-3 bg-bg px-4">
          {theme === 'dark' ? (
            <Moon size={16} className="shrink-0 text-fg-muted" />
          ) : (
            <Sun size={16} className="shrink-0 text-fg-muted" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label text-fg">Mørkt tema</span>
            <span className="text-[12px] text-fg-muted">Lyst tema er standard.</span>
          </div>
          <Switch checked={theme === 'dark'} onCheckedChange={byttTema} aria-label="Mørkt tema" />
        </div>
        <div className="border-border border-t">
          <VarslingslyderRad />
        </div>
      </div>

      <ByttPassordSkjema />

      <div className="overflow-hidden rounded-xl border border-border">
        <ToFaktorRad enabled={twoFactorEnabled} />
      </div>
    </div>
  );
}
