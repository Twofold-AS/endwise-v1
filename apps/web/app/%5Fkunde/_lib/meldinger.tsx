'use client';

import { FeltTekst, LasterFlate, ListeRad, Seksjon, StatefulButton, TomFlate } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { KundeInnlogget } from './portal.tsx';

function tidTekst(tid: Date | string) {
  return new Date(tid).toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KundeMeldingerFlate() {
  return <KundeInnlogget>{() => <MeldingFlate />}</KundeInnlogget>;
}

function MeldingFlate() {
  const [tekst, setTekst] = useState('');
  const utils = trpc.useUtils();
  const data = trpc.kunde.meldinger.useQuery({}, { retry: false });
  const send = trpc.kunde.sendMelding.useMutation({
    onSuccess: async () => {
      setTekst('');
      await utils.kunde.meldinger.invalidate();
    },
  });

  if (data.isLoading) return <LasterFlate label="Henter meldinger" />;
  if (data.isError) {
    return <ListeRad tittel="Logg inn" undertekst="Se meldinger" href="/logg-inn" />;
  }

  const rader = data.data?.meldinger ?? [];

  return (
    <div className="flex flex-col gap-4" data-kunde-meldinger>
      <Seksjon tittel="Samtale">
        {rader.length === 0 ? (
          <TomFlate tittel="Ingen meldinger" hint="Skriv til verkstedet. Svaret kommer her." />
        ) : (
          rader.map((m) => (
            <ListeRad
              key={m.id}
              tittel={m.direction === 'inbound' ? 'Deg' : 'Verkstedet'}
              undertekst={`${tidTekst(m.createdAt)} · ${m.body}`}
              chevron={false}
            />
          ))
        )}
      </Seksjon>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const body = tekst.trim();
          if (!body) return;
          send.mutate({ body });
        }}
      >
        <FeltTekst
          aria-label="Melding"
          value={tekst}
          onChange={setTekst}
          placeholder="Skriv en melding"
        />
        <StatefulButton
          type="submit"
          state={send.isPending ? 'loading' : send.isError ? 'error' : 'idle'}
          disabled={!tekst.trim() || send.isPending}
          className="h-auto w-full py-5"
          loadingText=""
          successText=""
          errorText="Prøv igjen"
        >
          Send
        </StatefulButton>
        {send.isError ? <p className="text-meta text-danger">{send.error.message}</p> : null}
      </form>
    </div>
  );
}
