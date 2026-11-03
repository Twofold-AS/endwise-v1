'use client';

import {
  FeltKalender,
  LasterFlate,
  ListeRad,
  Seksjon,
  StatefulButton,
  TomFlate,
} from '@endwise/ui';
import { parseDate } from '@internationalized/date';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { KundeInnlogget } from './portal.tsx';

function iDagOslo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Oslo' });
}

function slotTekst(iso: string) {
  return new Date(iso).toLocaleTimeString('nb-NO', {
    timeZone: 'Europe/Oslo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KundeBestillFlate() {
  return <KundeInnlogget>{() => <BestillSkjema />}</KundeInnlogget>;
}

function BestillSkjema() {
  const [tjenesteId, setTjenesteId] = useState<string | null>(null);
  const [dato, setDato] = useState(iDagOslo);
  const [start, setStart] = useState<string | null>(null);
  const [ferdig, setFerdig] = useState<string | null>(null);

  const tjenester = trpc.kunde.tjenester.useQuery(undefined, { retry: false });
  const tider = trpc.kunde.ledigeTider.useQuery(
    { serviceVersionId: tjenesteId ?? '', date: dato },
    { enabled: Boolean(tjenesteId), retry: false },
  );
  const bestill = trpc.kunde.bestill.useMutation({
    onSuccess: (r) => {
      setFerdig(r.fase.merkelapp);
      setStart(null);
    },
  });

  if (tjenester.isLoading) return <LasterFlate label="Henter tjenester" />;
  if (tjenester.isError) {
    return <ListeRad tittel="Logg inn" undertekst="Bestill time" href="/logg-inn" />;
  }
  const liste = tjenester.data ?? [];
  if (liste.length === 0) {
    return <TomFlate tittel="Ingen tjenester" hint="Verkstedet har ikke lagt ut tider ennå." />;
  }

  const valgt = liste.find((t) => t.serviceVersionId === tjenesteId);

  return (
    <div className="flex flex-col gap-4" data-kunde-bestill>
      {ferdig ? (
        <Seksjon tittel="Bestilt">
          <ListeRad tittel={ferdig} undertekst="Du finner den under Bookinger" href="/bookinger" />
        </Seksjon>
      ) : null}

      <Seksjon tittel="1. Tjeneste">
        {liste.map((t) => (
          <button
            key={t.serviceVersionId}
            type="button"
            onClick={() => {
              setTjenesteId(t.serviceVersionId);
              setStart(null);
              setFerdig(null);
            }}
            className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
              t.serviceVersionId === tjenesteId ? 'border-fg bg-card' : 'border-border bg-bg'
            }`}
          >
            <span className="text-label text-fg">{t.name}</span>
            <span className="text-meta text-fg-muted">{t.durationMinutes} min</span>
          </button>
        ))}
      </Seksjon>

      {valgt ? (
        <Seksjon tittel="2. Dag">
          <div className="rounded-xl border border-border bg-card p-3">
            <FeltKalender
              aria-label="Velg dag"
              value={parseDate(dato)}
              onChange={(d) => {
                if (!d) return;
                setDato(d.toString());
                setStart(null);
              }}
            />
          </div>
        </Seksjon>
      ) : null}

      {valgt ? (
        <Seksjon tittel="3. Tid">
          {tider.isLoading ? <LasterFlate label="Henter ledige tider" /> : null}
          {(tider.data ?? []).length === 0 && !tider.isLoading ? (
            <p className="text-body text-fg-muted max-md:text-[16px]">
              Ingen ledige tider denne dagen. Velg en annen dag.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(tider.data ?? []).map((iso) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setStart(iso)}
                  className={`inline-flex h-11 items-center rounded-full border px-4 text-label ${
                    start === iso ? 'border-fg bg-fg text-bg' : 'border-border text-fg'
                  }`}
                >
                  {slotTekst(iso)}
                </button>
              ))}
            </div>
          )}
        </Seksjon>
      ) : null}

      <StatefulButton
        type="button"
        state={bestill.isPending ? 'loading' : bestill.isError ? 'error' : 'idle'}
        disabled={!tjenesteId || !start || bestill.isPending}
        className="h-auto w-full py-5"
        loadingText=""
        successText=""
        errorText="Prøv igjen"
        onClick={() => {
          if (!tjenesteId || !start) return;
          bestill.mutate({ serviceVersionId: tjenesteId, startsAt: new Date(start) });
        }}
      >
        Bestill {valgt?.name ?? 'time'}
      </StatefulButton>
      {bestill.isError ? <p className="text-meta text-danger">{bestill.error.message}</p> : null}
    </div>
  );
}
