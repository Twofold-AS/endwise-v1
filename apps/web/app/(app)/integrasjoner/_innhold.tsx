'use client';

import { CircleAlert, ExternalLink, Plug } from '@endwise/ui';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { Etterspor } from '../_shell/etterspor';

/**
 * Integrasjoner: **tredjeparts** verktøy. Informativ oversikt
 * ingen av/på-brytere. Oppsett ligger på egne sider.
 */
type Katalog = RouterOutput['billing']['katalog'];
type Post = Katalog['tredjepart'][number];

const OPPSETT: Record<string, string> = {
  quick: '/integrasjoner/quick',
  twilio: '/integrasjoner/twilio',
  resend: '/integrasjoner/resend',
  vegvesen: '/integrasjoner/vegvesen',
};

export function IntegrasjonerInnhold() {
  const katalog = trpc.billing.katalog.useQuery();

  if (katalog.isLoading) {
    return <p className="text-body text-fg-muted">Laster integrasjoner …</p>;
  }
  if (katalog.isError) {
    return (
      <CardShell className="flex items-start gap-3 p-4">
        <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
        <p className="text-body text-danger">{katalog.error.message}</p>
      </CardShell>
    );
  }

  const alle = katalog.data?.tredjepart ?? [];
  const mine = alle.filter((i) => i.aktiv);
  const kanFaas = alle.filter((i) => !i.aktiv);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-label text-fg">Dine integrasjoner ({mine.length})</h3>
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

      <section className="flex flex-col gap-2">
        <h3 className="text-label text-fg">Tilgjengelige integrasjoner ({kanFaas.length})</h3>
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

      <section className="flex flex-col gap-2">
        <h3 className="text-label text-fg">Savner du en integrasjon?</h3>
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
  const oppsett = post.aktiv ? OPPSETT[post.key] : undefined;

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
        ) : post.aktiv ? (
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
