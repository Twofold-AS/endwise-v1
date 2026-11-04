'use client';

import { LasterFlate, ListeRad, Seksjon, TomFlate } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { KundeInnlogget } from './portal.tsx';

export function KundeMineDataFlate() {
  return <KundeInnlogget>{() => <InnsynInnhold />}</KundeInnlogget>;
}

function InnsynInnhold() {
  const data = trpc.kunde.mineData.useQuery(undefined, { retry: false });
  if (data.isLoading) return <LasterFlate label="Henter mine data" />;
  if (data.isError || !data.data) {
    return <ListeRad tittel="Logg inn" undertekst="Se mine data" href="/logg-inn" />;
  }
  const d = data.data;
  return (
    <div className="flex flex-col gap-4" data-kunde-mine-data>
      <Seksjon tittel="Profil">
        <ListeRad
          tittel={d.kunde.navn}
          undertekst={d.kunde.epost ?? 'Ingen e-post'}
          chevron={false}
        />
        {d.kunde.telefon ? (
          <ListeRad tittel="Telefon" undertekst={d.kunde.telefon} chevron={false} />
        ) : null}
      </Seksjon>
      <Seksjon tittel="Bookinger">
        {d.bookinger.length === 0 ? (
          <TomFlate tittel="Ingen bookinger" hint="Ingen rader å eksportere." />
        ) : (
          d.bookinger.map((b) => (
            <ListeRad
              key={b.id}
              tittel={b.status}
              undertekst={String(b.startsAt)}
              chevron={false}
            />
          ))
        )}
      </Seksjon>
      <Seksjon tittel="Kjøretøy">
        {d.kjoretoy.length === 0 ? (
          <TomFlate tittel="Ingen kjøretøy" hint="Ingen rader å eksportere." />
        ) : (
          d.kjoretoy.map((k) => (
            <ListeRad
              key={k.id}
              tittel={k.regNumber ?? k.type}
              undertekst={k.type}
              chevron={false}
            />
          ))
        )}
      </Seksjon>
      <Seksjon tittel="Meldinger">
        {d.traader.length === 0 ? (
          <TomFlate tittel="Ingen tråder" hint="Ingen rader å eksportere." />
        ) : (
          d.traader.map((t) => (
            <ListeRad key={t.id} tittel={t.subject ?? 'Samtale'} chevron={false} />
          ))
        )}
      </Seksjon>
      <p className="text-meta text-fg-muted">
        Dette er bare dine egne rader hos dette verkstedet. Sletting går via daglig leder.
      </p>
    </div>
  );
}

export function KundePersonvernFlate() {
  return (
    <div className="flex flex-col gap-3 text-body text-fg max-md:text-[16px]" data-kunde-personvern>
      <p>
        Verkstedet behandler opplysningene dine for å levere avtalen (time, melding, kjøretøy).
        Rettslig grunnlag er avtale (GDPR art. 6 nr. 1 bokstav b).
      </p>
      <p>
        Du kan be om innsyn under Mine data. Data ligger i EU. Vi sender ikke fritekst til modeller
        utenfor EU.
      </p>
      <p>Sletting av kunde er forbeholdt daglig leder. Bevisbeviset slettes ikke.</p>
      <ListeRad tittel="Mine data" undertekst="Innsyn i egne rader" href="/mine-data" />
    </div>
  );
}
