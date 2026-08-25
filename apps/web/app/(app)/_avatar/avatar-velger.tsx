'use client';

import { Avatar, CircleAlert, RefreshCw } from '@endwise/ui';
import { useEffect, useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { FORMER, HUMOR, tilfeldigAvatarValg } from './avatar-valg';

/**
 * F6-19 — Blobatar-velger.
 *
 * Seed = `user.id`. Form, farge, tone og uttrykk kommer fra seeden (null =
 * bibliotekets default) til noen persisterer — da via knappene under, eller
 * «Ny tilfeldig». Humør er låst opp: brukeren velger blant bibliotekets
 * kuraterte uttrykk. Ingen fil-opplasting, ingen nedtrekk.
 */

type Valg = RouterOutput['profile']['meg']['avatar'];

export { tilfeldigAvatarValg };

export function AvatarVelger({ seed }: { seed: string | null }) {
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

  function nyTilfeldig() {
    const neste = tilfeldigAvatarValg();
    setValg(neste);
    lagre.mutate(neste);
  }

  if (!seed) return null;

  return (
    <CardShell className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-4">
        <Avatar seed={seed} valg={valg} navn="" size={48} bevegelse="alltid" />
        <div className="min-w-0 flex-1">
          <p className="text-label text-fg">Avataren din</p>
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Ett ansikt, knyttet til kontoen din. Velg form og uttrykk, eller trekk en ny tilfeldig.
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
                onClick={() => {
                  const neste = { ...valg, form };
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
                <Avatar seed={seed} valg={{ ...valg, form }} navn="" size={32} bevegelse="stille" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-label text-fg">Uttrykk</p>
        <div className="flex flex-wrap gap-2">
          {HUMOR.map((h) => {
            const aktiv = valg.humor === h.key;
            return (
              <button
                key={h.key}
                type="button"
                disabled={lagre.isPending}
                onClick={() => {
                  const neste = { ...valg, humor: h.key };
                  setValg(neste);
                  lagre.mutate(neste);
                }}
                title={h.label}
                aria-label={`Velg uttrykk ${h.label}`}
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
            'Ikke valgt — nøytralt til du velger et uttrykk.'}
        </p>
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
