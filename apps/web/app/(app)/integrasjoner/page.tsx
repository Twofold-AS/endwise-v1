'use client';

import { Blocks, CircleAlert, ExternalLink, Plug } from '@endwise/ui';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { Etterspor } from '../_shell/etterspor';

/**
 * F5-19 — INTEGRASJONER: **tredjeparts** verktøy.
 *
 * ── ⛔ INGEN AV/PÅ-BRYTERE HER (omskrevet 09.08.2026) ────────────────────
 * Siden hadde tidligere en bryter per integrasjon. Den var i tillegg en løgn:
 * `useState` på hardkodet mock-data, uten et eneste kall til serveren. Du
 * skrudde noe «på», ingenting skjedde, og neste sidelast stilte den tilbake.
 *
 * Men selv en ekte bryter hadde vært feil her. Forhandleren kan ikke aktivere
 * en integrasjon selv: entitlements skrives kun av den signaturverifiserte
 * Stripe-webhooken (F5-09) eller av oss etter avtale. En bryter ville antydet
 * en makt som ikke finnes.
 *
 * Siden er derfor **informativ**: hva er koblet, hva finnes, og en vei til å be
 * om mer. Skal en aktiv integrasjon konfigureres, ligger den på sin egen side
 * (Quick, Twilio, Resend, Vegvesen) — det er der bryterne hører hjemme, hos
 * innstillingene de faktisk styrer.
 *
 * ── Skillet mot «Tjenester & priser» ─────────────────────────────────────
 * Her: ANDRES verktøy (Quick, Vegvesen, Twilio, Finn …). Der: det Endwise selv
 * har bygget. Klassifiseringen er ett sted — `packages/modules/src/billing/
 * katalog.ts` — så de to sidene aldri kan bli uenige.
 */
type Katalog = RouterOutput['billing']['katalog'];
type Post = Katalog['tredjepart'][number];

/** Egne konfigurasjonssider for de integrasjonene som HAR en. */
const OPPSETT: Record<string, string> = {
  quick: '/integrasjoner/quick',
  twilio: '/integrasjoner/twilio',
  resend: '/integrasjoner/resend',
  vegvesen: '/integrasjoner/vegvesen',
};

export default function IntegrasjonerPage() {
  const katalog = trpc.billing.katalog.useQuery();

  if (katalog.isLoading) {
    return <div className="px-8 py-7 text-body text-fg-muted">Laster integrasjoner …</div>;
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

  const alle = katalog.data?.tredjepart ?? [];
  const mine = alle.filter((i) => i.har);
  const kanFaas = alle.filter((i) => !i.har);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-8 py-7">
      <div>
        <h1 className="flex items-center gap-2 text-title text-fg">
          <Blocks size={18} strokeWidth={1.75} className="text-fg-muted" />
          Integrasjoner
        </h1>
        <p className="text-body text-fg-muted">
          Verktøy fra andre leverandører som Endwise snakker med. Endwise-egne funksjoner ligger
          under Tjenester &amp; priser.
        </p>
      </div>

      {/* ── Dine ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg">Dine integrasjoner ({mine.length})</h2>
        {mine.length === 0 ? (
          <CardShell className="p-5">
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Ingen tredjeparts-integrasjoner er koblet på ennå. Se lista under for hva som finnes.
            </p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {mine.map((i, n) => (
              <Rad key={i.key} post={i} forste={n === 0} />
            ))}
          </div>
        )}
      </section>

      {/* ── Tilgjengelige ────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg">Tilgjengelige integrasjoner ({kanFaas.length})</h2>
        <p className="text-[12px] text-fg-muted">
          Oversikt over hva som finnes. Ingenting bestilles herfra — meld interesse, så tar vi
          kontakt.
        </p>
        <div className="overflow-hidden rounded-xl border border-border">
          {kanFaas.map((i, n) => (
            <Rad key={i.key} post={i} forste={n === 0} />
          ))}
        </div>
      </section>

      {/* ── Ønsker du noe annet? ─────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg">Savner du en integrasjon?</h2>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Bruker dere et system som ikke står her, vil vi gjerne vite det. Det er slik lista blir
          lengre.
        </p>
        <Etterspor
          hva="en integrasjon som ikke står i lista"
          kontekst="Vi bruker et system som ikke finnes som integrasjon i Endwise i dag."
          knappetekst="Foreslå en integrasjon"
        />
      </section>
    </div>
  );
}

function Rad({ post, forste }: { post: Post; forste: boolean }) {
  const oppsett = post.har ? OPPSETT[post.key] : undefined;

  return (
    <div
      className={`flex min-h-row-store flex-wrap items-center gap-4 bg-bg px-4 py-3 ${
        forste ? '' : 'border-border border-t'
      }`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-2 text-fg-muted">
        <Plug size={16} strokeWidth={1.75} />
      </span>

      <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-label text-fg">
          {post.navn}
          {post.har && (
            <span
              className={`inline-flex h-badge items-center rounded-badge px-1.5 font-medium text-[11px] ${
                post.aktiv ? 'bg-accent-soft text-accent-strong' : 'bg-surface-2 text-fg-muted'
              }`}
            >
              {post.aktiv ? 'Koblet' : 'Har tilgang · ikke i bruk'}
            </span>
          )}
          {!post.har && post.status === 'coming' && (
            <span className="inline-flex h-badge items-center rounded-badge bg-warn-soft px-1.5 font-medium text-[11px] text-warn">
              Ikke bygget ennå
            </span>
          )}
        </span>
        <span className="text-[12px] text-fg-muted leading-relaxed">{post.beskrivelse}</span>
        {post.leverandor && (
          <span className="text-[11px] text-fg-muted">Leverandør: {post.leverandor}</span>
        )}
        {post.merknad && <span className="text-[11px] text-warn">{post.merknad}</span>}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Pris vises kun når integrasjonen faktisk koster noe ekstra. Er den
            inkludert i nivået, står det — et tomt prisfelt ser ut som gratis. */}
        <span className="text-right text-[12px] text-fg-muted">
          {post.prisMinor !== undefined
            ? `${(post.prisMinor / 100).toLocaleString('nb-NO')} kr/mnd`
            : post.inkludertI
              ? `Inkludert i ${post.inkludertI}`
              : '—'}
        </span>

        {oppsett ? (
          <a
            href={oppsett}
            className="inline-flex h-control shrink-0 items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            Oppsett
            <ExternalLink size={13} strokeWidth={1.75} />
          </a>
        ) : post.har ? (
          <span className="text-[12px] text-fg-muted">Ingen oppsett nødvendig</span>
        ) : (
          <Etterspor
            hva={post.navn}
            kontekst={`Vi er interessert i integrasjonen «${post.navn}».`}
            knappetekst="Bestill"
          />
        )}
      </div>
    </div>
  );
}
