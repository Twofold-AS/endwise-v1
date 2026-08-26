'use client';

import { CircleAlert, LifeBuoy } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { helpdeskKategoriLabel } from '../_kategorier';

/**
 * ÉN hjelpeartikkel.
 * Når blir den «lest»?
 * Når den Åpnes, ikke når den scrolles til bunns. Vi vet ikke om noen har lest
 * teksten, og å late som ville gitt en teller som lyver begge veier. «Åpnet» er
 * det vi faktisk kan observere, og det er nok: badgen skal si «her er noe du
 * ikke har sett», ikke «her er noe du ikke har forstått».
 * Kallet er idempotent server-side (`onConflictDoNothing`), så en refresh
 * flytter ikke tidspunktet for første lesning.
 */
export default function ArtikkelPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const utils = trpc.useUtils();

  const artikkel = trpc.helpdesk.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });

  const markerLest = trpc.helpdesk.markerLest.useMutation({
    onSuccess: () => {
      /* Både lista og badgen henter uleste — begge må vite at tallet falt. */
      void utils.helpdesk.list.invalidate();
      void utils.helpdesk.ulesteAntall.invalidate();
    },
  });

  /**
   * `mutate` er stabil fra tRPC, men vi holder avhengigheten på IDen alene
   * så effekten kjører én gang per artikkel — ikke på hver render.
   */
  const id = artikkel.data?.id;
  const merk = markerLest.mutate;
  useEffect(() => {
    if (id) merk({ articleId: id });
  }, [id, merk]);

  if (artikkel.isLoading) {
    return <div className="px-8 py-7 text-body text-fg-muted">Laster artikkel …</div>;
  }

  if (!artikkel.data) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-8 py-7">
        <CardShell className="flex items-start gap-3 p-6">
          <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
          <div>
            <p className="text-label text-fg">Fant ikke artikkelen</p>
            <p className="mt-1 text-[12px] text-fg-muted">
              Den kan være avpublisert, eller lenka kan være feil.
            </p>
            <Link
              href={'/support' as Route}
              className="mt-3 inline-block text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
            >
              ← Til helpdesken
            </Link>
          </div>
        </CardShell>
      </div>
    );
  }

  const a = artikkel.data;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <Link
        href={'/support' as Route}
        className="text-[12px] text-fg-muted transition-colors hover:text-fg"
      >
        ← Hjelp
      </Link>

      <div>
        <p className="text-[11px] text-fg-muted">{helpdeskKategoriLabel(a.category)}</p>
        <h1 className="text-title text-fg">{a.title}</h1>
        <p className="mt-1 text-body text-fg-muted">{a.summary}</p>
        <p className="mt-1 text-[11px] text-fg-muted">
          Oppdatert{' '}
          {new Date(a.publishedAt).toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {a.image && (
        <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border bg-surface-2">
          <Image src={a.image} alt="" fill sizes="760px" className="object-cover" priority />
        </div>
      )}

      {/**
       * Brødteksten er ren tekst med tomme linjer mellom avsnitt, ikke
       * markdown. Å tolke markdown fra en tekstboks ville krevd en parser og en
       * sanitizer — og en HTML-sanitizer vi skriver selv er nøyaktig den typen
       * kode man ikke skal skrive selv. Splitt på blank linje holder for
       * hjelpeartikler.
       */}
      <div className="flex flex-col gap-3">
        {a.body
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => (
            <p key={p.slice(0, 40)} className="text-body text-fg leading-relaxed">
              {p}
            </p>
          ))}
      </div>

      <p className="flex items-center gap-1.5 border-border border-t pt-4 text-[12px] text-fg-muted">
        <LifeBuoy size={14} />
        Fikk du ikke svar? Skriv til oss i <b>Innboks › Endwise</b>.
      </p>
    </div>
  );
}
