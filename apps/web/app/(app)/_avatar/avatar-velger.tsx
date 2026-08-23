'use client';

import { Avatar, CircleAlert, RefreshCw } from '@endwise/ui';
import { useEffect, useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

/**
 * F6-19 — ÉN blobatar per person.
 *
 * Seed = `user.id`. Humør er ALLTID happy. Form, farge og tone kommer fra
 * seeden (null = bibliotekets default) til noen persisterer — da tilfeldig,
 * eller via «Ny tilfeldig». Ingen nedtrekk, ingen andre uttrykk.
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

export function AvatarVelger({ seed }: { seed: string | null }) {
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

  return (
    <CardShell className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-4">
        <Avatar seed={seed} valg={medHappy(valg)} navn="" size={48} bevegelse="hover" />
        <div className="min-w-0 flex-1">
          <p className="text-label text-fg">Avataren din</p>
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Ett ansikt, knyttet til kontoen din. Humøret er alltid blidt.
          </p>
        </div>
        <button
          type="button"
          onClick={nyTilfeldig}
          disabled={lagre.isPending}
          className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-3 text-label text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          <RefreshCw size={14} strokeWidth={1.75} />
          Ny tilfeldig
        </button>
      </div>

      {lagre.error ? (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {lagre.error.message}
        </p>
      ) : null}
    </CardShell>
  );
}
