'use client';

import { LasterFlate, ListeRad, TomFlate } from '@endwise/ui';
import { trpc } from '@/lib/trpc';

function tidTekst(tid: Date | string) {
  return new Date(tid).toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** F22 / white label F5b — bare daglig leder. */
export function AktivitetFraEndwise() {
  const data = trpc.aktivitet.endwise.useQuery(undefined, { retry: false });

  if (data.isError) {
    return (
      <p className="text-body text-fg-muted max-md:text-[16px]">
        Aktivitet fra Endwise vises når white label er slått på.
      </p>
    );
  }
  if (data.isLoading) return <LasterFlate label="Henter aktivitet" />;
  const rader = data.data ?? [];
  if (rader.length === 0) {
    return <TomFlate tittel="Ingen aktivitet" hint="Endwise har ikke gjort noe her ennå." />;
  }
  return (
    <div className="flex flex-col">
      {rader.map((r) => (
        <ListeRad key={r.id} tittel={r.hva} undertekst={tidTekst(r.tid)} />
      ))}
    </div>
  );
}
