'use client';

import { ArrowUpRight, CircleQuestionMark, LifeBuoy } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { CardShell, CountBadge, NewBadge } from '../_shell/cards';

/**
 * F5-23 — HELPDESK: artikkellista.
 *
 * ⚠️ 05.08.2026: «Åpne supportkanalen» er FJERNET herfra (eiers beslutning).
 * Samtalen med Endwise bor i Innboks › Endwise — samme meldingssystem, samme
 * SSE. En egen inngang her ville vært en andre dør til det samme rommet.
 *
 * ── Uleste (20.08.2026) ───────────────────────────────────────────────────
 * «Ulest» er fraværet av en lest-rad, ikke et flagg. En ny artikkel er derfor
 * automatisk ulest for alle uten at publiseringen må skrive en rad per bruker.
 * Selve merkingen skjer når artikkelen ÅPNES — se `[slug]/page.tsx`.
 */
function dato(d: Date | string): string {
  return new Date(d).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function HelpdeskPage() {
  const artikler = trpc.helpdesk.list.useQuery({ limit: 50 });
  const rader = artikler.data ?? [];
  const uleste = rader.filter((a) => a.ulest).length;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="flex items-center gap-2 text-title text-fg">
          Hjelp
          <CountBadge count={uleste} label="uleste artikler" />
        </h1>
        <p className="text-body text-fg-muted">
          Hjelpeartikler og veiledninger for Endwise. De fire nyeste vises også nederst i sidebaren.
        </p>
      </div>

      {artikler.isLoading ? (
        <p className="py-12 text-center text-body text-fg-muted">Laster artikler …</p>
      ) : rader.length === 0 ? (
        <CardShell className="p-12 text-center">
          <CircleQuestionMark size={24} className="mx-auto text-fg-muted" />
          <p className="mt-2 text-label text-fg">Ingen hjelpeartikler ennå</p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-fg-muted leading-relaxed">
            Endwise skriver artiklene. Kommer det noe nytt, dukker det opp her og i sidebaren.
          </p>
        </CardShell>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rader.map((a) => (
            <Link key={a.id} href={`/support/${a.slug}` as Route} className="group block">
              <CardShell className="h-full transition-colors group-hover:border-border-strong">
                {a.image && (
                  /* ⚠️ Fast forhold, ikke fast høyde: kortene står i et grid og
                     må ha samme bildehøyde uansett hva slags bilde det er. */
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface-2">
                    <Image
                      src={a.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 text-label text-fg">{a.title}</span>
                    {a.ulest && <NewBadge />}
                  </span>
                  <span className="line-clamp-3 text-[12px] text-fg-muted leading-relaxed">
                    {a.summary}
                  </span>
                  <span className="mt-auto flex items-center gap-1 pt-1.5 text-[11px] text-fg-muted">
                    {dato(a.publishedAt)}
                    <ArrowUpRight
                      size={13}
                      strokeWidth={1.75}
                      className="ml-auto transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </CardShell>
            </Link>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <LifeBuoy size={14} />
        Trenger du et menneske? Skriv til oss i <b>Innboks › Endwise</b>.
      </p>
    </div>
  );
}
