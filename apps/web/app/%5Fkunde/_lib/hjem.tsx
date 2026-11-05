'use client';

import { ListeRad, Seksjon, TomFlate } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { KundeInnlogget } from './portal.tsx';

const SPOR = ['Bestilt', 'Mottatt', 'Arbeid', 'Klar'] as const;

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

function sporSteg(status: string, fase?: { merkelapp: string; steg: number }): number {
  if (status === 'cancelled' || status === 'no_show') return -1;
  if (status === 'completed') return 3;
  if (status === 'in_progress') return 2;
  if (fase?.steg === 0 && status === 'confirmed') return 1;
  return 0;
}

function Sporing({ steg }: { steg: number }) {
  if (steg < 0) return null;
  return (
    <ol className="mt-3 flex flex-wrap gap-2" aria-label="Sporing">
      {SPOR.map((navn, i) => (
        <li
          key={navn}
          className={`inline-flex h-8 items-center rounded-pill px-3 text-[13px] ${
            i === steg ? 'bg-fg font-[650] text-bg' : 'bg-surface-2 text-fg-muted'
          }`}
        >
          {navn}
        </li>
      ))}
    </ol>
  );
}

export function KundeHjemFlate() {
  return <KundeInnlogget>{(p) => <HjemInnhold navn={p.navn} />}</KundeInnlogget>;
}

function HjemInnhold({ navn }: { navn: string }) {
  const bookinger = trpc.kunde.bookinger.useQuery(undefined, { retry: false });
  const meldinger = trpc.kunde.meldinger.useQuery({}, { retry: false });
  const rader = bookinger.data ?? [];
  const aktiv = rader.find((b) => b.status !== 'cancelled' && b.status !== 'completed') ?? rader[0];
  const neste = rader
    .filter(
      (b) =>
        b.status !== 'cancelled' &&
        b.status !== 'no_show' &&
        b.status !== 'completed' &&
        new Date(b.startsAt).getTime() > Date.now(),
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  const uleste = meldinger.data?.meldinger?.length ?? 0;

  return (
    <div data-kunde-hjem className="flex flex-col gap-5">
      <Seksjon tittel={`Hei, ${fornavn(navn)}`}>
        <p className="text-body text-fg-muted max-md:text-[16px]">{dagTekst()}</p>
      </Seksjon>

      {aktiv ? (
        <Seksjon tittel="Aktiv jobb">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-title text-fg max-md:text-[18px] max-md:font-[650]">
              {aktiv.tjeneste ?? 'Time hos verkstedet'}
            </p>
            <p className="mt-1 text-body text-fg-muted">{tidTekst(aktiv.startsAt)}</p>
            <Sporing steg={sporSteg(aktiv.status, aktiv.fase)} />
          </div>
        </Seksjon>
      ) : bookinger.isLoading ? null : (
        <TomFlate tittel="Ingen time enda" hint="Bestill time når du trenger service." />
      )}

      <a
        href="/bestill"
        className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-fg px-4 text-[16px] font-[650] text-bg"
      >
        Bestill time
      </a>

      {neste && neste.id !== aktiv?.id ? (
        <ListeRad
          tittel="Neste time"
          undertekst={`${neste.tjeneste ?? 'Time'} · ${tidTekst(neste.startsAt)}`}
          href="/bookinger"
        />
      ) : null}

      <ListeRad
        tittel="Meldinger"
        undertekst={uleste > 0 ? `${uleste} i innboksen` : 'Skriv til verkstedet'}
        href="/meldinger"
      />
    </div>
  );
}
