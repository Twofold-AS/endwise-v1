'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { parseOrgSeksjon } from '../../../../organisasjon/_seksjoner';
import { ForhandlerKort } from '../../../../organisasjon/forhandleren/_kort';

const SEKSJON_TITTEL: Record<string, string> = {
  oversikt: 'Oversikt',
  timeplan: 'Timeplan',
  ansatte: 'Ansatte',
  abonnement: 'Abonnement',
  integrasjoner: 'Integrasjoner',
};

/**
 * Se verkstedet — Organisasjon. Oversikt er forhandlerkortet (lesing).
 * Øvrige seksjoner er ikke åpnet i inspect ennå.
 */
export default function InspectOrganisasjonPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const slug = params?.slug ?? '';
  const seksjon = parseOrgSeksjon(search?.get('seksjon'), true);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      {seksjon === 'oversikt' ? (
        <section className="flex flex-col gap-8" aria-label="Oversikt">
          <div>
            <h1 className="text-title text-fg">Oversikt</h1>
            <p className="text-body text-fg-muted">Kun lesing. Skriving er stengt.</p>
          </div>
          <ForhandlerKort lesing slug={slug} />
        </section>
      ) : (
        <section className="flex flex-col gap-2" aria-label={SEKSJON_TITTEL[seksjon] ?? seksjon}>
          <h1 className="text-title text-fg">{SEKSJON_TITTEL[seksjon] ?? seksjon}</h1>
          <p className="text-body text-fg-muted">
            Kun lesing. Denne seksjonen er ikke åpen i Se verkstedet ennå.
          </p>
        </section>
      )}
    </div>
  );
}
