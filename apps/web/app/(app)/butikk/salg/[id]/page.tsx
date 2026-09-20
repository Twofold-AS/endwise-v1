'use client';

import { Car } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';

/**
 * Butikk · salgsdetalj. Ekte kjøretøy via tRPC.
 * Pris · Kjørt · Kanal · Beskrivelse er ærlige tomme — salgs-API finnes ikke.
 */
export default function ButikkSalgDetaljPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const kjoretoy = trpc.vehicles.byId.useQuery({ id }, { enabled: Boolean(id) });

  if (kjoretoy.isLoading) {
    return <p className="px-8 py-7 text-body text-fg-muted">Laster kjøretøy …</p>;
  }
  if (kjoretoy.isError) {
    return <p className="px-8 py-7 text-body text-danger">{kjoretoy.error.message}</p>;
  }
  const k = kjoretoy.data;
  if (!k) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-8 py-7">
        <p className="text-label text-fg">Fant ikke kjøretøyet</p>
        <Link href={'/butikk' as Route} className="text-[12px] text-fg-muted underline">
          Tilbake til butikk
        </Link>
      </div>
    );
  }

  const tittel = [k.make, k.model, k.regNumber].filter(Boolean).join(' · ') || 'Kjøretøy';

  return (
    <div
      data-butikk-salg-detalj
      className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-8 py-7"
    >
      <Link href={'/butikk' as Route} className="text-[12px] text-fg-muted">
        ← Butikk
      </Link>
      <div className="flex items-start gap-3">
        <Car size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
        <div>
          <h1 className="text-title text-fg">{tittel}</h1>
          <p className="text-[12px] text-fg-muted">
            {k.modelYear ?? 'Årsmodell ukjent'}
            {k.eier?.name ? ` · ${k.eier.name}` : ''}
          </p>
        </div>
      </div>

      <section data-butikk-salg-annonse className="flex flex-col">
        <h2 className="text-title text-fg">Annonse</h2>
        <div className="mt-2 flex flex-col">
          <div className="flex h-row-store items-center justify-between gap-3 border-divide border-b">
            <span className="text-label text-fg-muted">Pris</span>
            <span className="text-label text-fg">Ingen salgspris registrert</span>
          </div>
          <div className="flex h-row-store items-center justify-between gap-3 border-divide border-b">
            <span className="text-label text-fg-muted">Kjørt</span>
            <span className="text-label text-fg">Ikke registrert</span>
          </div>
          <div className="flex h-row-store items-center justify-between gap-3">
            <span className="text-label text-fg-muted">Kanal</span>
            <span className="text-label text-fg">Ikke koblet</span>
          </div>
        </div>
      </section>

      <section data-butikk-salg-beskrivelse className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Beskrivelse</h2>
        <p className="text-[12px] text-fg-muted">Ingen beskrivelse registrert.</p>
      </section>

      <p data-butikk-salg-rediger className="text-[12px] text-fg-muted">
        Rediger annonse er ikke koblet. Salgspris, km og kanal finnes ikke i registeret ennå.
      </p>

      <Link
        href={`/kjoretoy/${k.id}` as Route}
        className="text-label text-fg underline-offset-2 hover:underline"
      >
        Åpne kjøretøykort
      </Link>
    </div>
  );
}
