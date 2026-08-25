'use client';

import { Avatar, ChevronDown, CircleAlert, RefreshCw } from '@endwise/ui';
import { type ReactNode, useEffect, useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

/**
 * F6-19 — ÉN blobatar per person.
 *
 * Seed = `user.id`. Humør er ALLTID happy. Form, farge og tone kommer fra
 * seeden (null = bibliotekets default) til noen persisterer — da tilfeldig,
 * eller via «Ny tilfeldig». Ingen nedtrekk, ingen andre uttrykk.
 *
 * Settings › Profil (24.08.2026, Jonas): ansiktet står TIL VENSTRE for
 * visningsnavn|e-post (`children`), 56px. Formvelgeren er foldet under så
 * Profil ikke vokser — blobatar-PR kommer med flere uttrykk. shadcn
 * Collapsible er ikke hentet: ett fold, native `<details>`.
 */

type Valg = RouterOutput['profile']['meg']['avatar'];
type Form = NonNullable<Valg['form']>;

const FORMER: Form[] = [
  'round',
  'organic',
  'boxy',
  'capsule',
  'nub',
  'cloud',
  'droplet',
  'hexagon',
  'sun',
  'triangle',
];

const FARGER = [20, 60, 110, 150, 195, 250, 300, 340];

export function tilfeldigAvatarValg(): Valg {
  return {
    form: FORMER[Math.floor(Math.random() * FORMER.length)] ?? 'round',
    humor: 'happy',
    farge: FARGER[Math.floor(Math.random() * FARGER.length)] ?? 20,
    tone: Math.floor(Math.random() * 6),
  };
}

function medHappy(valg: Valg): Valg {
  return { ...valg, humor: 'happy' };
}

export function AvatarVelger({
  seed,
  size = 48,
  foldFormer = false,
  children,
}: {
  seed: string | null;
  /** Settings-raden bruker 56 (48–64). Default 48 er F6-19-målet. */
  size?: 48 | 56 | 64;
  /** Form/uttrykk under et fold — Profil, så flaten ikke blir lengre. */
  foldFormer?: boolean;
  children?: ReactNode;
}) {
  const utils = trpc.useUtils();
  const meg = trpc.profile.meg.useQuery(undefined, { retry: false });
  const [valg, setValg] = useState<Valg>({ form: null, humor: 'happy', farge: null, tone: null });

  useEffect(() => {
    if (meg.data?.avatar) setValg(medHappy(meg.data.avatar));
  }, [meg.data?.avatar]);

  const lagre = trpc.profile.setAvatar.useMutation({
    onSuccess: (neste) => {
      setValg(medHappy(neste));
      void utils.profile.meg.invalidate();
      void utils.directory.participants.invalidate();
    },
  });

  function nyTilfeldig() {
    const neste = tilfeldigAvatarValg();
    setValg(neste);
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
    <div className="flex flex-wrap gap-2">
      {FORMER.map((form) => {
        const aktiv = valg.form === form;
        return (
          <button
            key={form}
            type="button"
            disabled={lagre.isPending}
            onClick={() => {
              const neste = medHappy({ ...valg, form });
              setValg(neste);
              lagre.mutate(neste);
            }}
            title={form}
            aria-label={`Velg form ${form}`}
            aria-pressed={aktiv}
            className={`rounded-control p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${
              aktiv ? 'bg-sidebar-active ring-1 ring-border-strong' : 'hover:bg-surface-2'
            }`}
          >
            <Avatar
              seed={seed}
              valg={medHappy({ ...valg, form })}
              navn=""
              size={32}
              bevegelse="stille"
            />
          </button>
        );
      })}
    </div>
  );

  return (
    <CardShell className="flex flex-col gap-4 p-5">
      <div className="flex flex-row items-start gap-4">
        <Avatar
          seed={seed}
          valg={medHappy(valg)}
          navn=""
          size={size}
          bevegelse="alltid"
          className="shrink-0"
        />
        {children ? (
          <div className="min-w-0 flex-1">{children}</div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-label text-fg">Avataren din</p>
              <p className="text-[12px] text-fg-muted leading-relaxed">
                Ett ansikt, knyttet til kontoen din. Humøret er alltid blidt. Velg form under, eller
                trekk en ny tilfeldig.
              </p>
            </div>
            {nyTilfeldigKnapp}
          </>
        )}
      </div>

      {foldFormer ? (
        <details className="group">
          <summary className="flex h-control cursor-pointer list-none items-center gap-1.5 text-label text-fg-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
            <ChevronDown
              size={14}
              strokeWidth={1.75}
              className="shrink-0 transition-transform group-open:rotate-180"
            />
            Endre form
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {children ? (
              <div className="flex flex-wrap items-center gap-2">{nyTilfeldigKnapp}</div>
            ) : null}
            {former}
          </div>
        </details>
      ) : (
        former
      )}

      {lagre.error ? (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {lagre.error.message}
        </p>
      ) : null}
    </CardShell>
  );
}
