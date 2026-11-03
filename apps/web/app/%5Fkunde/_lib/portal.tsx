'use client';

import { DeaktivertHandling, LasterFlate, ListeRad, Seksjon, TomFlate } from '@endwise/ui';
import type { ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

const STATUS: Record<string, string> = {
  draft: 'Kladd',
  confirmed: 'Mottatt',
  in_progress: 'Under arbeid',
  completed: 'Klar',
  cancelled: 'Avlyst',
  no_show: 'Ikke møtt',
};

function tidTekst(tid: Date | string) {
  return new Date(tid).toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KundeInnlogget({
  children,
}: {
  children: (data: {
    navn: string;
    epost: string | null;
    telefon: string | null;
  }) => ReactNode;
}) {
  const meg = trpc.kunde.meg.useQuery(undefined, { retry: false });
  if (meg.isLoading) return <LasterFlate label="Henter min side" />;
  if (meg.isError || !meg.data) {
    return (
      <Seksjon tittel="Konto">
        <ListeRad tittel="Logg inn" undertekst="Se bookinger og kjøretøy" href="/logg-inn" />
      </Seksjon>
    );
  }
  return (
    <>
      {children({
        navn: meg.data.navn,
        epost: meg.data.epost,
        telefon: meg.data.telefon,
      })}
    </>
  );
}

export function KundeBookingerFlate() {
  const data = trpc.kunde.bookinger.useQuery(undefined, { retry: false });
  if (data.isLoading) return <LasterFlate label="Henter bookinger" />;
  if (data.isError) {
    return <ListeRad tittel="Logg inn" undertekst="Se bookinger" href="/logg-inn" />;
  }
  const rader = data.data ?? [];
  if (rader.length === 0) {
    return <TomFlate tittel="Ingen bookinger" hint="Når du bestiller, vises de her." />;
  }
  return (
    <div className="flex flex-col">
      {rader.map((b) => (
        <ListeRad
          key={b.id}
          tittel={STATUS[b.status] ?? b.status}
          undertekst={tidTekst(b.startsAt)}
          chevron={false}
        />
      ))}
    </div>
  );
}

export function KundeKjoretoyFlate() {
  const data = trpc.kunde.kjoretoy.useQuery(undefined, { retry: false });
  if (data.isLoading) return <LasterFlate label="Henter kjøretøy" />;
  if (data.isError) {
    return <ListeRad tittel="Logg inn" undertekst="Se kjøretøy" href="/logg-inn" />;
  }
  const rader = data.data ?? [];
  if (rader.length === 0) {
    return (
      <TomFlate tittel="Ingen kjøretøy" hint="Kjøretøy vises når verkstedet har registrert dem." />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {rader.map((k) => (
        <section key={k.id} className="flex flex-col gap-1">
          <ListeRad
            tittel={[k.make, k.model].filter(Boolean).join(' ') || k.type}
            undertekst={[k.regNumber, k.modelYear].filter(Boolean).join(' · ')}
            chevron={false}
          />
          {k.historikk.length > 0 ? (
            <Seksjon tittel="Servicehistorikk">
              {k.historikk.map((h) => (
                <ListeRad
                  key={h.id}
                  tittel={STATUS[h.status] ?? h.status}
                  undertekst={tidTekst(h.startsAt)}
                  chevron={false}
                />
              ))}
            </Seksjon>
          ) : (
            <p className="text-meta text-fg-muted">Ingen historikk ennå.</p>
          )}
        </section>
      ))}
    </div>
  );
}

export function KundeProfilFlate() {
  return (
    <KundeInnlogget>
      {(p) => (
        <Seksjon tittel="Profil">
          <ListeRad tittel={p.navn} undertekst={p.epost ?? 'Ingen e-post'} chevron={false} />
          {p.telefon ? <ListeRad tittel="Telefon" undertekst={p.telefon} chevron={false} /> : null}
          <DeaktivertHandling forklaring="Endring av profil kommer senere">
            Endre profil
          </DeaktivertHandling>
        </Seksjon>
      )}
    </KundeInnlogget>
  );
}

export function KundeHubFlate() {
  return (
    <KundeInnlogget>
      {(p) => (
        <>
          <Seksjon tittel={`Hei ${p.navn}`}>
            <ListeRad
              tittel="Bookinger"
              undertekst="Mottatt, under arbeid, klar"
              href="/bookinger"
            />
            <ListeRad tittel="Kjøretøy" undertekst="Servicehistorikk" href="/kjoretoy" />
            <ListeRad tittel="Profil" undertekst={p.epost ?? 'Kontaktinfo'} href="/profil" />
          </Seksjon>
          <Seksjon tittel="Mer">
            <DeaktivertHandling forklaring="Meldinger kommer i neste steg">
              Meldinger
            </DeaktivertHandling>
            <DeaktivertHandling forklaring="Deler kommer senere">Deler</DeaktivertHandling>
            <DeaktivertHandling forklaring="Kvitteringer kommer senere">
              Kvitteringer
            </DeaktivertHandling>
          </Seksjon>
        </>
      )}
    </KundeInnlogget>
  );
}
