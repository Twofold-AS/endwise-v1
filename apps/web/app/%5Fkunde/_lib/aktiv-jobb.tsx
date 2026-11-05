'use client';

import { jobbFaseKort, jobbFremdriftProsent } from '@endwise/modules/kunde';
import { CircleQuestionMark, ListeRad, ProgressBar, TomFlate } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { KundeBunnArk } from './ark.tsx';

function tidTekst(tid: Date | string) {
  return new Date(tid).toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AktivJobbKort() {
  const jobb = trpc.kunde.aktivJobb.useQuery(undefined, { retry: false });
  const [apen, setApen] = useState(false);
  const aktiv = jobb.data;
  if (jobb.isLoading || !aktiv) return null;

  const merkelapp = jobbFaseKort(aktiv.fase);
  const prosent = jobbFremdriftProsent(aktiv.fase.steg);

  return (
    <div data-kunde-aktiv-jobb className="mx-auto w-full max-w-lg px-4 pt-3">
      <div className="relative rounded-[20px] border border-border bg-card p-4">
        <button
          type="button"
          data-kunde-jobb-hjelp
          aria-label="Jobbdetaljer"
          className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-full border border-border bg-bg text-fg"
          onClick={() => setApen(true)}
        >
          <CircleQuestionMark className="size-4" aria-hidden />
        </button>
        <div className="flex items-baseline justify-between gap-3 pr-9">
          <p className="min-w-0 truncate text-[16px] font-[650] text-fg">
            {aktiv.tjeneste ?? 'Time hos verkstedet'}
          </p>
          {aktiv.kjoretoy ? (
            <p className="max-w-[45%] shrink-0 truncate text-[13px] text-fg-muted">
              {aktiv.kjoretoy}
            </p>
          ) : null}
        </div>
        <div className="mt-3 [&_.text-accent-500]:text-fg">
          <ProgressBar
            value={prosent}
            minValue={0}
            maxValue={100}
            label={merkelapp}
            showValueLabel={false}
            description="Mottatt → Ferdig"
            size="sm"
          />
        </div>
      </div>

      <KundeBunnArk tittel="Jobbdetaljer" apen={apen} onLukk={() => setApen(false)}>
        <div data-kunde-jobb-ark className="flex flex-col gap-4">
          <ListeRad
            tittel={aktiv.tjeneste ?? merkelapp}
            undertekst={`${merkelapp} · ${tidTekst(aktiv.startsAt)}`}
            chevron={false}
          />
          <ListeRad
            tittel="Mekaniker"
            undertekst={aktiv.mekaniker ?? 'Ikke tildelt ennå'}
            chevron={false}
          />
          {aktiv.kjoretoy ? (
            <ListeRad tittel="Kjøretøy" undertekst={aktiv.kjoretoy} chevron={false} />
          ) : null}
          {aktiv.notes ? (
            <ListeRad tittel="Notat" undertekst={aktiv.notes} chevron={false} />
          ) : null}

          <div>
            <p className="mb-1 text-label text-fg">Meldinger fra mekaniker</p>
            {aktiv.mekanikerMeldinger.length === 0 ? (
              <p className="text-body text-fg-muted">Ingen meldinger fra mekaniker ennå.</p>
            ) : (
              aktiv.mekanikerMeldinger.map((m) => (
                <ListeRad
                  key={m.id}
                  tittel={m.body}
                  undertekst={tidTekst(m.createdAt)}
                  chevron={false}
                />
              ))
            )}
          </div>

          <div>
            <p className="mb-1 text-label text-fg">Historikk</p>
            {aktiv.historikk.length === 0 ? (
              <TomFlate
                tittel="Ingen historikk"
                hint="Tidligere jobber på samme kjøretøy vises her."
              />
            ) : (
              aktiv.historikk.map((h) => (
                <ListeRad
                  key={h.id}
                  tittel={h.tjeneste ?? jobbFaseKort(h.fase)}
                  undertekst={`${jobbFaseKort(h.fase)} · ${tidTekst(h.startsAt)}`}
                  chevron={false}
                />
              ))
            )}
          </div>
        </div>
      </KundeBunnArk>
    </div>
  );
}
