'use client';

import { DeaktivertHandling, LasterFlate, ListeRad, Seksjon, TomFlate } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { KundeInnlogget } from './portal.tsx';

export function KundeDelerFlate() {
  return <KundeInnlogget>{() => <DelerInnhold />}</KundeInnlogget>;
}

function DelerInnhold() {
  const data = trpc.kunde.butikk.useQuery(undefined, { retry: false });
  if (data.isLoading) return <LasterFlate label="Henter deler" />;
  if (data.isError) {
    return <ListeRad tittel="Logg inn" undertekst="Se deler" href="/logg-inn" />;
  }
  const status = data.data;
  return (
    <div className="flex flex-col gap-4" data-kunde-deler>
      <Seksjon tittel="Deler">
        <TomFlate
          tittel="Butikken er ikke åpen"
          hint="Nettbutikk er satt på vent. Du kan ikke kjøpe deler her ennå."
        />
      </Seksjon>
      <Seksjon tittel="Betaling">
        <DeaktivertHandling forklaring="Ingen betaling før nettbutikken er løst">
          Kjøp
        </DeaktivertHandling>
        <DeaktivertHandling forklaring="Vipps er satt på vent">Vipps</DeaktivertHandling>
      </Seksjon>
      {status?.grunn ? (
        <p className="text-meta text-fg-muted">Årsak: {status.grunn.replaceAll('_', ' ')}</p>
      ) : null}
    </div>
  );
}

export function KundeKvitteringerFlate() {
  return <KundeInnlogget>{() => <KvitteringInnhold />}</KundeInnlogget>;
}

function KvitteringInnhold() {
  const data = trpc.kunde.kvitteringer.useQuery(undefined, { retry: false });
  if (data.isLoading) return <LasterFlate label="Henter kvitteringer" />;
  if (data.isError) {
    return <ListeRad tittel="Logg inn" undertekst="Se kvitteringer" href="/logg-inn" />;
  }
  const rader = data.data ?? [];
  return (
    <div className="flex flex-col gap-4" data-kunde-kvitteringer>
      <Seksjon tittel="Kvitteringer">
        {rader.length === 0 ? (
          <TomFlate
            tittel="Ingen kvitteringer"
            hint="Kvitteringer vises når butikken er åpen og du har handlet."
          />
        ) : (
          rader.map((k) => (
            <ListeRad key={k.id} tittel={k.tittel} undertekst={String(k.tid)} chevron={false} />
          ))
        )}
      </Seksjon>
      <DeaktivertHandling forklaring="Vipps er satt på vent">Vipps</DeaktivertHandling>
    </div>
  );
}
