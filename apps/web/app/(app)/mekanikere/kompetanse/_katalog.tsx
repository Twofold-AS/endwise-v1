'use client';

import { CircleAlert, Plus, StatefulButton } from '@endwise/ui';
import { useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { FELT, tilNokkel } from './_niva';

type Ferdighet = RouterOutput['competence']['listSkills'][number];

/**
 * Ferdighetskatalogen per tenant. Prislisten velger herfra;
 * kompetansen per mekaniker peker på `key`.
 */
export function Ferdighetskatalog({
  ferdigheter,
  kanEndre,
}: {
  ferdigheter: Ferdighet[];
  kanEndre: boolean;
}) {
  const [nyApen, setNyApen] = useState(false);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-label text-fg">Ferdighetskatalog</h2>
          <p className="text-[12px] text-fg-muted">
            Det mekanikeren kan. Prislisten krever ferdigheter herfra — aldri fritekst.
          </p>
        </div>
        {kanEndre && !nyApen && (
          <button
            type="button"
            onClick={() => setNyApen(true)}
            className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg transition-colors hover:bg-surface-2"
          >
            <Plus size={14} strokeWidth={1.75} />
            Ny ferdighet
          </button>
        )}
      </div>

      {kanEndre && nyApen && <NyFerdighet onLukk={() => setNyApen(false)} />}

      {ferdigheter.length === 0 ? (
        <CardShell className="p-6">
          <p className="text-label text-fg">Ingen ferdigheter ennå</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Legg inn det verkstedet faktisk kan — EU-kontroll, dekkskift, båtmotor.
          </p>
        </CardShell>
      ) : (
        <div className="flex flex-col gap-2">
          {ferdigheter.map((f) => (
            <FerdighetKort key={f.key} ferdighet={f} kanEndre={kanEndre} />
          ))}
        </div>
      )}
    </section>
  );
}

function NyFerdighet({ onLukk }: { onLukk: () => void }) {
  const utils = trpc.useUtils();
  const [navn, setNavn] = useState('');
  const [nokkel, setNokkel] = useState('');
  const [nokkelManuell, setNokkelManuell] = useState(false);
  const [beskrivelse, setBeskrivelse] = useState('');
  const [kreverSert, setKreverSert] = useState(false);

  const lagre = trpc.competence.upsertSkill.useMutation({
    onSuccess: () => {
      void utils.competence.listSkills.invalidate();
      onLukk();
    },
  });

  const key = nokkelManuell ? nokkel : tilNokkel(navn);
  const kanLagre = navn.trim().length > 0 && key.length >= 2 && !lagre.isPending;

  return (
    <CardShell className="p-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!kanLagre) return;
          lagre.mutate({
            key,
            name: navn.trim(),
            description: beskrivelse.trim() || undefined,
            requiresCertification: kreverSert,
          });
        }}
      >
        <p className="text-label text-fg">Ny ferdighet</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Navn</span>
            <input
              value={navn}
              onChange={(e) => {
                setNavn(e.target.value);
                if (!nokkelManuell) setNokkel(tilNokkel(e.target.value));
              }}
              className={FELT}
              placeholder="EU-kontroll MC"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Nøkkel</span>
            <input
              value={nokkelManuell ? nokkel : key}
              onChange={(e) => {
                setNokkelManuell(true);
                setNokkel(e.target.value);
              }}
              className={FELT}
              placeholder="mc-eu"
            />
            <span className="text-[12px] text-fg-muted">
              Små bokstaver, tall og bindestrek. Brukes av matcheren og prislisten.
            </span>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Beskrivelse</span>
          <input
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            className={FELT}
            placeholder="Valgfritt"
          />
        </label>
        <label className="flex items-center gap-2 text-label text-fg">
          <input
            type="checkbox"
            checked={kreverSert}
            onChange={(e) => setKreverSert(e.target.checked)}
            className="size-3.5 accent-fg"
          />
          Krever gyldig sertifisering
        </label>
        {lagre.isError && (
          <p className="flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {lagre.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onLukk}
            className="h-control rounded-control px-3 text-label text-fg-muted hover:text-fg"
          >
            Avbryt
          </button>
          <StatefulButton
            type="submit"
            disabled={!kanLagre}
            state={lagre.isPending ? 'loading' : lagre.isError ? 'error' : 'idle'}
            loadingText="Lagrer…"
            errorText="Feilet"
          >
            Lagre
          </StatefulButton>
        </div>
      </form>
    </CardShell>
  );
}

function FerdighetKort({ ferdighet, kanEndre }: { ferdighet: Ferdighet; kanEndre: boolean }) {
  const utils = trpc.useUtils();
  const [redigerer, setRedigerer] = useState(false);
  const [navn, setNavn] = useState(ferdighet.name);
  const [beskrivelse, setBeskrivelse] = useState(ferdighet.description ?? '');
  const [kreverSert, setKreverSert] = useState(ferdighet.requiresCertification);

  const lagre = trpc.competence.upsertSkill.useMutation({
    onSuccess: () => {
      void utils.competence.listSkills.invalidate();
      setRedigerer(false);
    },
  });

  return (
    <CardShell>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-label text-fg">{ferdighet.name}</p>
          <p className="truncate text-[12px] text-fg-muted">
            {ferdighet.key}
            {ferdighet.requiresCertification ? ' · krever sertifisering' : ''}
          </p>
        </div>
        {kanEndre && !redigerer && (
          <button
            type="button"
            onClick={() => setRedigerer(true)}
            className="h-control rounded-control border border-border px-2.5 text-label text-fg hover:bg-surface-2"
          >
            Rediger
          </button>
        )}
      </div>
      {redigerer && (
        <form
          className="flex flex-col gap-3 border-border border-t px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            lagre.mutate({
              key: ferdighet.key,
              name: navn.trim(),
              description: beskrivelse.trim() || undefined,
              requiresCertification: kreverSert,
            });
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Navn</span>
            <input value={navn} onChange={(e) => setNavn(e.target.value)} className={FELT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Beskrivelse</span>
            <input
              value={beskrivelse}
              onChange={(e) => setBeskrivelse(e.target.value)}
              className={FELT}
            />
          </label>
          <label className="flex items-center gap-2 text-label text-fg">
            <input
              type="checkbox"
              checked={kreverSert}
              onChange={(e) => setKreverSert(e.target.checked)}
              className="size-3.5 accent-fg"
            />
            Krever gyldig sertifisering
          </label>
          {lagre.isError && (
            <p className="flex items-start gap-2 text-body text-danger">
              <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              {lagre.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRedigerer(false)}
              className="h-control rounded-control px-3 text-label text-fg-muted hover:text-fg"
            >
              Avbryt
            </button>
            <StatefulButton
              type="submit"
              disabled={!navn.trim() || lagre.isPending}
              state={
                lagre.isPending
                  ? 'loading'
                  : lagre.isSuccess
                    ? 'success'
                    : lagre.isError
                      ? 'error'
                      : 'idle'
              }
              loadingText="Lagrer…"
              successText="Lagret"
              errorText="Feilet"
            >
              Lagre
            </StatefulButton>
          </div>
        </form>
      )}
    </CardShell>
  );
}
