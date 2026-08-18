'use client';

import { CircleAlert, CreditCard, Sparkles } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { Etterspor } from '../_shell/etterspor';

/**
 * F5-04 / F5-19 — TJENESTER & PRISER: **Endwise-egne** funksjoner.
 *
 * ── Skillet mot «Integrasjoner» ──────────────────────────────────────────
 * Her ligger det VI har bygget: bookingwidget, AI-funksjonene, analyse,
 * nyhetsbrev. Andres verktøy (Quick, Vegvesen, Twilio, Finn) ligger under
 * Integrasjoner. Klassifiseringen bor ett sted —
 * `packages/modules/src/billing/katalog.ts` — så de to sidene aldri blir uenige.
 *
 * Forhandleren stiller to ulike spørsmål, og de fortjener hver sin skjerm:
 * «hva har vi koblet til av andres systemer?» og «hva betaler vi Endwise for?».
 *
 * ── ⛔ Ingen av/på her heller ────────────────────────────────────────────
 * Prisene er fasit fra Stripe-katalogen (`TIERS`/`TILLEGG`), ikke tall skrevet
 * inn på nytt. Kjøp skjer i Abonnement, der checkout ligger — og entitlements
 * flippes uansett bare av den signaturverifiserte webhooken.
 */
type Katalog = RouterOutput['billing']['katalog'];
type Post = Katalog['endwise'][number];

function kroner(minor?: number): string | null {
  return minor === undefined ? null : `${(minor / 100).toLocaleString('nb-NO')} kr/mnd`;
}

export default function TjenesterPage() {
  const katalog = trpc.billing.katalog.useQuery();

  if (katalog.isLoading) {
    return <div className="px-8 py-7 text-body text-fg-muted">Laster tjenester …</div>;
  }
  if (katalog.isError) {
    return (
      <div className="mx-auto w-full max-w-[1000px] px-8 py-7">
        <CardShell className="flex items-start gap-3 p-4">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-body text-danger">{katalog.error.message}</p>
        </CardShell>
      </div>
    );
  }

  const alle = katalog.data?.endwise ?? [];
  const mine = alle.filter((t) => t.har);
  const kanFaas = alle.filter((t) => !t.har);
  const nivaa = katalog.data?.nivaa;

  /**
   * Summen av TILLEGGENE forhandleren har. Nivåprisen kommer i tillegg, og de
   * to holdes fra hverandre med vilje: å slå dem sammen til ett tall ville
   * skjult hva som er grunnpris og hva som er valgt til.
   */
  const tilleggSum = mine.reduce((sum, t) => sum + (t.prisMinor ?? 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-8 py-7">
      <div>
        <h1 className="flex items-center gap-2 text-title text-fg">
          <Sparkles size={18} strokeWidth={1.75} className="text-fg-muted" />
          Tjenester &amp; priser
        </h1>
        <p className="text-body text-fg-muted">
          Funksjonene Endwise har bygget, og hva de koster. Andres verktøy ligger under
          Integrasjoner.
        </p>
      </div>

      {/* ── Abonnementsnivået: grunnkostnaden ────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg">Abonnement</h2>
        <CardShell className="flex flex-wrap items-center gap-4 p-4">
          <CreditCard size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          {nivaa ? (
            <>
              <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                <span className="text-label text-fg">{nivaa.navn}</span>
                <span className="text-[12px] text-fg-muted">
                  {nivaa.hoydepunkter.slice(0, 3).join(' · ')}
                </span>
              </div>
              <span className="shrink-0 text-label text-fg tabular-nums">
                {kroner(nivaa.prisMinor)}
              </span>
            </>
          ) : (
            /* ⚠️ Ingen abonnementsrad = ingen plan registrert. Det er sant for
               demo-tenanter, og skal stå som det er — ikke som «0 kr». */
            <p className="min-w-[200px] flex-1 text-[12px] text-fg-muted leading-relaxed">
              Ingen abonnementsplan er registrert på denne forhandleren ennå. Prisene under viser
              hva de enkelte tjenestene koster.
            </p>
          )}
          <Link
            href={'/abonnement' as Route}
            className="inline-flex h-control shrink-0 items-center rounded-control border border-border px-2.5 text-label text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            Se abonnement
          </Link>
        </CardShell>
      </section>

      {/* ── Dine tjenester ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-label text-fg">Dine tjenester ({mine.length})</h2>
          {tilleggSum > 0 && (
            <span className="text-[12px] text-fg-muted tabular-nums">
              Tillegg: {kroner(tilleggSum)} — kommer i tillegg til nivået
            </span>
          )}
        </div>
        {mine.length === 0 ? (
          <CardShell className="p-5">
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Ingen Endwise-tjenester er aktivert ennå. Basisflatene — saker, kunder, kjøretøy,
              innboks og lager — følger med uansett og står ikke i denne lista.
            </p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {mine.map((t, n) => (
              <Rad key={t.key} post={t} forste={n === 0} />
            ))}
          </div>
        )}
        <p className="text-[11px] text-fg-muted leading-relaxed">
          Basisflatene (Saker, Kunder, Kjøretøy, Innboks, Lager, Mekanikervisning) er alltid med og
          faktureres ikke separat — derfor står de ikke her.
        </p>
      </section>

      {/* ── Kan bestilles ────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg">Kan bestilles ({kanFaas.length})</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          {kanFaas.map((t, n) => (
            <Rad key={t.key} post={t} forste={n === 0} />
          ))}
        </div>
      </section>

      {/* ── Ønsker ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg">Savner du en funksjon?</h2>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Er det noe verkstedet trenger som Endwise ikke gjør ennå, vil vi høre det. Det er slik vi
          bestemmer hva som bygges neste gang.
        </p>
        <Etterspor
          hva="en funksjon som ikke finnes ennå"
          kontekst="Vi savner en funksjon i Endwise."
          knappetekst="Foreslå en funksjon"
        />
      </section>
    </div>
  );
}

function Rad({ post, forste }: { post: Post; forste: boolean }) {
  const pris = post.prisMinor !== undefined ? kroner(post.prisMinor) : null;

  return (
    <div
      className={`flex min-h-row-store flex-wrap items-center gap-4 bg-bg px-4 py-3 ${
        forste ? '' : 'border-border border-t'
      }`}
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-label text-fg">
          {post.navn}
          {post.har && (
            <span
              className={`inline-flex h-badge items-center rounded-badge px-1.5 font-medium text-[11px] ${
                post.aktiv ? 'bg-accent-soft text-accent-strong' : 'bg-surface-2 text-fg-muted'
              }`}
            >
              {post.aktiv ? 'Aktiv' : 'Har tilgang · ikke i bruk'}
            </span>
          )}
          {/* ⚠️ «coming»/«blocked» står i klartekst. Å selge noe som ikke virker
              er verre enn å ikke selge det — samme regel som i checkout, der
              filteret er server-side. */}
          {post.status === 'coming' && (
            <span className="inline-flex h-badge items-center rounded-badge bg-warn-soft px-1.5 font-medium text-[11px] text-warn">
              Ikke bygget ennå
            </span>
          )}
          {post.status === 'blocked' && (
            <span className="inline-flex h-badge items-center rounded-badge bg-warn-soft px-1.5 font-medium text-[11px] text-warn">
              Avventer beslutning
            </span>
          )}
        </span>
        <span className="text-[12px] text-fg-muted leading-relaxed">{post.beskrivelse}</span>
        {post.merknad && <span className="text-[11px] text-warn">{post.merknad}</span>}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="w-32 text-right text-[12px] text-fg tabular-nums">
          {pris ?? (post.inkludertI ? `Inkludert i ${post.inkludertI}` : '—')}
        </span>
        {!post.har &&
          (post.status === 'available' ? (
            <Etterspor
              hva={post.navn}
              kontekst={`Vi er interessert i «${post.navn}».`}
              knappetekst="Bestill"
            />
          ) : (
            <Etterspor
              hva={post.navn}
              kontekst={`Vi vil gjerne vite når «${post.navn}» blir klar.`}
              knappetekst="Meld interesse"
            />
          ))}
      </div>
    </div>
  );
}
