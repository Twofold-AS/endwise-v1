'use client';

import { BoardChip, FeilFlate, LasterFlate, ListeRad } from '@endwise/ui';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { Etterspor } from '../_shell/etterspor';
import { INTEGRASJONER_PAGE_SUB } from '../organisasjon/_hub';

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
    return <LasterFlate linjer={3} label="Henter integrasjoner" />;
  }
  if (katalog.isError) {
    return <FeilFlate melding={katalog.error.message} />;
  }

  const alle = katalog.data?.tredjepart ?? [];
  const mine = alle.filter((i) => i.aktiv);
  const kanFaas = alle.filter((i) => !i.aktiv);

  return (
    <div className="flex flex-col gap-6">
      <p data-integrasjoner-pagesub className="text-meta text-fg-muted">
        {INTEGRASJONER_PAGE_SUB}
        {alle.length > 0 ? ` · ${mine.length}/${alle.length}` : ''}
      </p>
      <section className="flex flex-col gap-2">
        <h3 className="text-label text-fg">Dine integrasjoner ({mine.length})</h3>
        {mine.length === 0 ? (
          <p className="text-meta text-fg-muted">
            Ingen tredjeparts-integrasjoner er koblet på ennå. Se lista under for hva som finnes.
          </p>
        ) : (
          <div>
            {mine.map((i) => (
              <Rad key={i.key} post={i} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-label text-fg">Tilgjengelige integrasjoner ({kanFaas.length})</h3>
        <p className="text-meta text-fg-muted">
          Oversikt over hva som finnes. Ingenting bestilles herfra — meld interesse, så tar vi
          kontakt.
        </p>
        <div>
          {kanFaas.map((i) => (
            <Rad key={i.key} post={i} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-label text-fg">Savner du en integrasjon?</h3>
        <p className="text-meta text-fg-muted leading-relaxed">
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

function Rad({ post }: { post: Post }) {
  const oppsett = post.aktiv ? OPPSETT[post.key] : undefined;
  const merke = post.har
    ? post.aktiv
      ? 'På'
      : 'Av'
    : post.status === 'coming'
      ? 'Kommer senere'
      : undefined;

  return (
    <ListeRad
      tittel={post.navn}
      undertekst={post.beskrivelse}
      href={oppsett}
      chevron={Boolean(oppsett)}
      hoyre={
        merke ? (
          <BoardChip variant="caption" color={post.aktiv ? 'soft' : 'gray'}>
            {merke}
          </BoardChip>
        ) : (
          <Etterspor
            hva={post.navn}
            kontekst={`Vi er interessert i integrasjonen «${post.navn}».`}
            knappetekst="Bestill"
          />
        )
      }
    />
  );
}
