'use client';

import { Avatar } from '@endwise/ui';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { ByttEpostSkjema } from '../_shell/bytt-epost';
import { KallenavnFelt, VarslingslyderRad, VisningsnavnFelt } from '../_shell/profil-kort';
import { ToFaktorRad } from '../_shell/to-faktor-rad';

/**
 * F5-19 / F1-17 / F1-20 — Settings › Profil, landet i pille-fanen.
 * Layout (Mikael 28.08): avatar + endre-knapp på samme rad øverst,
 * uten CardShell. Deretter visningsnavn · kallenavn · e-post ett og
 * ett nedover. Bare fargevelger under avataren — form, humør og tone
 * er borte. Ingen filopplasting. Felt-Lagre beholdes, ingen sticky Save.
 */
export function ProfilFane() {
  const me = trpc.session.me.useQuery();
  const meg = trpc.profile.meg.useQuery();
  const { data: session } = useSession();
  const twoFactorEnabled =
    session?.user && 'twoFactorEnabled' in session.user
      ? (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
      : undefined;

  return (
    <div className="flex flex-col gap-5">
      {me.data?.userId ? (
        <div className="flex items-center gap-4">
          <Avatar
            seed={me.data.userId}
            valg={meg.data?.avatar}
            navn={meg.data?.navn ?? ''}
            size={56}
            bevegelse="alltid"
          />
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Ansiktet er bloub. Fargen settes av forhandleren under Organisasjon › Ansatte.
          </p>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-label text-fg">Visningsnavn</p>
        <VisningsnavnFelt />
      </div>
      <div>
        <p className="mb-2 text-label text-fg">Kallenavn</p>
        <KallenavnFelt />
      </div>
      <div>
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

      <ByttEpostSkjema gjeldende={meg.data?.epost ?? ''} />

      <div className="overflow-hidden rounded-xl border border-border">
        <VarslingslyderRad />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <ToFaktorRad enabled={twoFactorEnabled} />
      </div>
    </div>
  );
}
