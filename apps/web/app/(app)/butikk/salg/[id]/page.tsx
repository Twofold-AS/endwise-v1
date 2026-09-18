'use client';

import { Car } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';

/**
 * Butikk · salgsdetalj. Ekte kjøretøy via tRPC. Pris/Finn er ærlig tomme.
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
      <section className="flex flex-col gap-2 rounded-[24px] border border-divide bg-card px-4 py-3 shadow-none">
        <p className="text-label text-fg">Salgspris</p>
        <p className="text-[12px] text-fg-muted">Ingen salgspris registrert.</p>
        <p className="mt-2 text-label text-fg">Finn.no</p>
        <p className="text-[12px] text-fg-muted">Ikke koblet. Ingen publisering herfra.</p>
      </section>
      <Link
        href={`/kjoretoy/${k.id}` as Route}
        className="text-label text-fg underline-offset-2 hover:underline"
      >
        Åpne kjøretøykort
      </Link>
    </div>
  );
}
