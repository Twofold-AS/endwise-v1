'use client';

import { Avatar, CircleAlert, RefreshCw } from '@endwise/ui';
import { type ReactNode, useEffect, useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { erUautorisert, norskAuthFeil } from '../../_auth/feil';
import { CardShell } from '../_shell/cards';
import { FARGER, tilfeldigAvatarValg } from './avatar-valg';

/**
 * Blobatar-velger.
 * Seed = `user.id`. Form, humør og tone er ute — seeden eier silhuetten.
 * Bare farge (hue) kan velges, eller «Ny tilfeldig».
 * Settings › Profil: ansiktet og «Ny tilfeldig» er søsken på samme rad
 * (56px, `utenKort`). Navn-feltene bor utenfor velgeren.
 */

type Valg = RouterOutput['profile']['meg']['avatar'];

export { fullforAvatarValg, TOM_AVATAR_VALG, tilfeldigAvatarValg } from './avatar-valg';

function kunFarge(farge: number | null): Valg {
  return { form: null, humor: null, farge, tone: null };
}

export function AvatarVelger({
  seed,
  size = 48,
  utenKort = false,
  children,
}: {
  seed: string | null;
  /** Settings-raden bruker 56 (48–64). Default 48 er F6-19-målet. */
  size?: 48 | 56 | 64;
  /** Profil, oppstart og invite: uten CardShell. */
  utenKort?: boolean;
  children?: ReactNode;
}) {
  const utils = trpc.useUtils();
  const meg = trpc.profile.meg.useQuery(undefined, { retry: false });
  const [valg, setValg] = useState<Valg>({ form: null, humor: null, farge: null, tone: null });

  useEffect(() => {
    if (meg.data?.avatar) {
      setValg(kunFarge(meg.data.avatar.farge));
    }
  }, [meg.data?.avatar]);

  const lagre = trpc.profile.setAvatar.useMutation({
    onSuccess: (neste) => {
      setValg(kunFarge(neste.farge));
      void utils.profile.meg.invalidate();
      void utils.directory.participants.invalidate();
    },
  });

  function kanLagre() {
    return !(meg.isError && erUautorisert(meg.error));
  }

  function nyTilfeldig() {
    const neste = tilfeldigAvatarValg();
    setValg(neste);
    if (!kanLagre()) return;
    lagre.mutate(neste);
  }

  function velgFarge(farge: number) {
    const neste = kunFarge(farge);
    setValg(neste);
    if (!kanLagre()) return;
    lagre.mutate(neste);
  }

  if (!seed) return null;

  const nyTilfeldigKnapp = (
    <button
      type="button"
      onClick={nyTilfeldig}
      disabled={lagre.isPending}
      className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-3 text-label text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
    >
      <RefreshCw size={14} strokeWidth={1.75} />
      Ny tilfeldig
    </button>
  );

  const farger = (
    <div>
      <p className="mb-2 text-label text-fg">Farge</p>
      <div className="flex flex-wrap gap-2">
        {FARGER.map((f) => {
          const aktiv = valg.farge === f.grader;
          return (
            <button
              key={f.grader}
              type="button"
              disabled={lagre.isPending}
              onClick={() => velgFarge(f.grader)}
              title={f.label}
              aria-label={`Velg farge ${f.label}`}
              aria-pressed={aktiv}
              className={`rounded-control p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${
                aktiv ? 'bg-sidebar-active ring-1 ring-border-strong' : 'hover:bg-surface-2'
              }`}
            >
              <Avatar
                seed={seed}
                valg={kunFarge(f.grader)}
                navn=""
                size={32}
                bevegelse="stille"
              />
            </button>
          );
        })}
      </div>
    </div>
  );

  const toppRad = (
    <div className="flex flex-row items-center gap-4">
      <Avatar seed={seed} valg={valg} navn="" size={size} bevegelse="alltid" className="shrink-0" />
      {children ? <div className="min-w-0 flex-1">{children}</div> : nyTilfeldigKnapp}
    </div>
  );

  const sidetekst = children ? null : (
    <p className="text-[12px] text-fg-muted leading-relaxed">
      Ett ansikt, knyttet til kontoen din. Velg farge, eller trekk en ny tilfeldig.
    </p>
  );

  const innhold = (
    <>
      {toppRad}
      {sidetekst}
      {farger}

      {lagre.error ? (
        <p role="alert" className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {norskAuthFeil(lagre.error)}
        </p>
      ) : null}
    </>
  );

  if (utenKort) {
    return <div className="flex flex-col gap-4">{innhold}</div>;
  }

  return <CardShell className="flex flex-col gap-4 p-5">{innhold}</CardShell>;
}
