'use client';

import { ListeRad, Seksjon } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { KundeInnlogget } from './portal.tsx';

function fornavn(navn: string): string {
  return navn.trim().split(/\s+/)[0] ?? navn;
}

function dagTekst(naa = new Date()): string {
  const raw = new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(naa);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

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

export function KundeHjemFlate() {
  return <KundeInnlogget>{(p) => <HjemInnhold navn={p.navn} />}</KundeInnlogget>;
}

function HjemInnhold({ navn }: { navn: string }) {
  const bookinger = trpc.kunde.bookinger.useQuery(undefined, { retry: false });
  const rader = bookinger.data ?? [];
  const neste = rader
    .filter(
      (b) =>
        b.status !== 'cancelled' &&
        b.status !== 'no_show' &&
        b.status !== 'completed' &&
        new Date(b.startsAt).getTime() > Date.now(),
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];

  return (
    <div data-kunde-hjem className="flex flex-col gap-5">
      <Seksjon tittel={`Hei, ${fornavn(navn)}`}>
        <p className="text-body text-fg-muted max-md:text-[16px]">{dagTekst()}</p>
      </Seksjon>

      <a
        href="/bestill"
        className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-fg px-4 text-[16px] font-[650] text-bg"
      >
        Bestill time
      </a>

      {neste ? (
        <ListeRad
          tittel="Neste time"
          undertekst={`${neste.tjeneste ?? 'Time'} · ${tidTekst(neste.startsAt)}`}
          href="/bookinger"
        />
      ) : null}
    </div>
  );
}
