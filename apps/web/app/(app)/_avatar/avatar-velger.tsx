'use client';

import { Avatar, ChevronDown, CircleAlert, RefreshCw } from '@endwise/ui';
import { type ReactNode, useEffect, useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { erUautorisert, norskAuthFeil } from '../../_auth/feil';
import { CardShell } from '../_shell/cards';
import { FARGER, FORMER, HUMOR, TONER, tilfeldigAvatarValg } from './avatar-valg';

/**
 * Blobatar-velger.
 * Seed = `user.id`. Form, farge, tone og uttrykk kommer fra seeden (null =
 * bibliotekets default) til noen persisterer — da via knappene, eller
 * «Ny tilfeldig». «Ny tilfeldig» beholder valgt humør og farge.
 * Settings › Profil (Mikael 28.08): ansiktet og «Ny tilfeldig» er søsken
 * på samme rad (56px, `utenKort`). Velgeren er foldet under. Navn-feltene
 * bor utenfor velgeren. shadcn Collapsible er ikke hentet: native `<details>`.
 */

type Valg = RouterOutput['profile']['meg']['avatar'];

export { fullforAvatarValg, TOM_AVATAR_VALG, tilfeldigAvatarValg } from './avatar-valg';

export function AvatarVelger({
  seed,
  size = 48,
  foldFormer = false,
  utenKort = false,
  children,
}: {
  seed: string | null;
  /** Settings-raden bruker 56 (48–64). Default 48 er F6-19-målet. */
  size?: 48 | 56 | 64;
  /** Form/farge/uttrykk under et fold — Profil, så flaten ikke blir lengre. */
  foldFormer?: boolean;
  /** Profil, oppstart og invite: uten CardShell. */
  utenKort?: boolean;
  children?: ReactNode;
}) {
  const utils = trpc.useUtils();
  const meg = trpc.profile.meg.useQuery(undefined, { retry: false });
  const [valg, setValg] = useState<Valg>({ form: null, humor: null, farge: null, tone: null });

  useEffect(() => {
    if (meg.data?.avatar) setValg(meg.data.avatar);
  }, [meg.data?.avatar]);

  const lagre = trpc.profile.setAvatar.useMutation({
    onSuccess: (neste) => {
      setValg(neste);
      void utils.profile.meg.invalidate();
      void utils.directory.participants.invalidate();
    },
  });

  function kanLagre() {
    return !(meg.isError && erUautorisert(meg.error));
  }

  function nyTilfeldig() {
    const neste = tilfeldigAvatarValg({
      humor: valg.humor ?? undefined,
      farge: valg.farge ?? undefined,
      tone: valg.tone ?? undefined,
    });
    setValg(neste);
    if (!kanLagre()) return;
    lagre.mutate(neste);
  }

  function velg(neste: Valg) {
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

  const former = (
    <div>
      <p className="mb-2 text-label text-fg">Form</p>
      <div className="flex flex-wrap gap-2">
        {FORMER.map((form) => {
          const aktiv = valg.form === form;
          return (
            <button
              key={form}
              type="button"
              disabled={lagre.isPending}
              onClick={() => velg({ ...valg, form })}
              title={form}
              aria-label={`Velg form ${form}`}
              aria-pressed={aktiv}
              className={`rounded-control p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${
                aktiv ? 'bg-sidebar-active ring-1 ring-border-strong' : 'hover:bg-surface-2'
              }`}
            >
              <Avatar seed={seed} valg={{ ...valg, form }} navn="" size={32} bevegelse="stille" />
            </button>
          );
        })}
      </div>
    </div>
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
              onClick={() => velg({ ...valg, farge: f.grader })}
              title={f.label}
              aria-label={`Velg farge ${f.label}`}
              aria-pressed={aktiv}
              className={`rounded-control p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${
                aktiv ? 'bg-sidebar-active ring-1 ring-border-strong' : 'hover:bg-surface-2'
              }`}
            >
              <Avatar
                seed={seed}
                valg={{ ...valg, farge: f.grader }}
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

  const uttrykk = (
    <div>
      <p className="mb-2 text-label text-fg">Humør</p>
      <div className="flex flex-wrap gap-2">
        {HUMOR.map((h) => {
          const aktiv = valg.humor === h.key;
          return (
            <button
              key={h.key}
              type="button"
              disabled={lagre.isPending}
              onClick={() => velg({ ...valg, humor: h.key })}
              title={h.label}
              aria-label={`Velg humør ${h.label}`}
              aria-pressed={aktiv}
              className={`rounded-control p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${
                aktiv ? 'bg-sidebar-active ring-1 ring-border-strong' : 'hover:bg-surface-2'
              }`}
            >
              {/* hover: flere positurer skiller seg lite på 32px i stillbilde. */}
              <Avatar
                seed={seed}
                valg={{ ...valg, humor: h.key }}
                navn=""
                size={32}
                bevegelse="hover"
              />
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[12px] text-fg-muted">
        {HUMOR.find((h) => h.key === valg.humor)?.label ??
          'Ikke valgt — nøytralt til du velger et humør.'}
      </p>
    </div>
  );

  const toner = (
    <div>
      <p className="mb-2 text-label text-fg">Tone</p>
      <div className="flex flex-wrap gap-2">
        {TONER.map((label, i) => {
          const aktiv = valg.tone === i;
          return (
            <button
              key={label}
              type="button"
              disabled={lagre.isPending}
              onClick={() => velg({ ...valg, tone: i })}
              title={label}
              aria-label={`Velg tone ${label}`}
              aria-pressed={aktiv}
              className={`rounded-control p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${
                aktiv ? 'bg-sidebar-active ring-1 ring-border-strong' : 'hover:bg-surface-2'
              }`}
            >
              <Avatar
                seed={seed}
                valg={{ ...valg, tone: i }}
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

  const velgere = (
    <div className="flex flex-col gap-3">
      {former}
      {farger}
      {uttrykk}
      {toner}
    </div>
  );

  const toppRad = foldFormer ? (
    <div className="flex flex-row items-center gap-4">
      <Avatar seed={seed} valg={valg} navn="" size={size} bevegelse="alltid" className="shrink-0" />
      {nyTilfeldigKnapp}
    </div>
  ) : (
    <div className="flex flex-row items-start gap-4">
      <Avatar seed={seed} valg={valg} navn="" size={size} bevegelse="alltid" className="shrink-0" />
      {children ? (
        <div className="min-w-0 flex-1">{children}</div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-label text-fg">Avataren din</p>
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Ett ansikt, knyttet til kontoen din. Velg form, farge og humør, eller trekk en ny
              tilfeldig — valgt humør og farge blir stående.
            </p>
          </div>
          {nyTilfeldigKnapp}
        </>
      )}
    </div>
  );

  const innhold = (
    <>
      {toppRad}

      {foldFormer ? (
        <details className="group">
          <summary className="flex h-control cursor-pointer list-none items-center gap-1.5 text-label text-fg-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
            <ChevronDown
              size={14}
              strokeWidth={1.75}
              className="shrink-0 transition-transform group-open:rotate-180"
            />
            Endre form, farge og uttrykk
          </summary>
          <div className="mt-3 flex flex-col gap-3">{velgere}</div>
        </details>
      ) : (
        velgere
      )}

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
