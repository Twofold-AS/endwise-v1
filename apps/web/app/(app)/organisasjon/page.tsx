'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useOrgRole } from '../_lib/use-org-role';
import { AbonnementInnhold } from '../abonnement/_innhold';
import { IntegrasjonerInnhold } from '../integrasjoner/_innhold';
import { PrislisteFlate } from '../innstillinger/tjenestekatalog/page';
import { TjenesterInnhold } from '../tjenester/_innhold';
import { TimeplanFlate } from '../mekanikere/kapasitet/page';
import { OrganisasjonAnsatte } from './_ansatte';
import { parseOrgSeksjon } from './_seksjoner';
import { ForhandlerKort } from './forhandleren/_kort';

/**
 * Organisasjon — én side. Top-bar 2 velger seksjon.
 * Landing = Oversikt (forhandlerkort + prisliste).
 */
export default function OrganisasjonPage() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster …</div>}>
      <OrganisasjonIndre />
    </Suspense>
  );
}

function OrganisasjonIndre() {
  const { isAdmin } = useOrgRole();
  const params = useSearchParams();
  const seksjon = parseOrgSeksjon(params?.get('seksjon'), isAdmin);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      {seksjon === 'oversikt' ? (
        <section className="flex flex-col gap-8" aria-label="Oversikt">
          <div>
            <h1 className="text-title text-fg">Oversikt</h1>
            <p className="text-body text-fg-muted">
              Verkstedets firmanavn, kontakt og prisliste.
            </p>
          </div>
          <ForhandlerKort />
          <PrislisteFlate skjulPiller />
        </section>
      ) : null}
      {seksjon === 'timeplan' ? <TimeplanFlate skjulPiller /> : null}
      {seksjon === 'ansatte' ? <OrganisasjonAnsatte /> : null}
      {seksjon === 'abonnement' ? (
        <section className="flex flex-col gap-8" aria-label="Abonnement">
          <div>
            <h1 className="text-title text-fg">Abonnement</h1>
            <p className="text-body text-fg-muted">
              Hva dere betaler Endwise. Tjenester & priser ligger på samme flate.
            </p>
          </div>
          <AbonnementInnhold />
          <div>
            <h2 className="text-title text-fg">Tjenester & priser</h2>
            <p className="mt-1 text-body text-fg-muted">
              Funksjonene Endwise har bygget, og hva de koster.
            </p>
          </div>
          <TjenesterInnhold />
        </section>
      ) : null}
      {seksjon === 'integrasjoner' ? (
        <section className="flex flex-col gap-5" aria-label="Integrasjoner">
          <div>
            <h1 className="text-title text-fg">Integrasjoner</h1>
            <p className="text-body text-fg-muted">
              Verktøy fra andre leverandører som Endwise snakker med.
            </p>
          </div>
          <IntegrasjonerInnhold />
        </section>
      ) : null}
    </div>
  );
}
