'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useOrgRole } from '../_lib/use-org-role';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { AbonnementInnhold } from '../abonnement/_innhold';
import { IntegrasjonerInnhold } from '../integrasjoner/_innhold';
import { TjenesterInnhold } from '../tjenester/_innhold';
import { OrganisasjonAnsatte } from './_ansatte';
import { parseOrgSeksjon, synligeOrgChrome } from './_seksjoner';
import { ForhandlerKort } from './forhandleren/_kort';

/**
 * Organisasjon — Innstillinger-chrome.
 * Bunnknappene (Ansatte / Timeplan / …) sitter i top-bar 2.
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
    <SideChromeSkall
      tittel="Organisasjon"
      ingress="Ansatte, abonnement og integrasjoner."
      faner={synligeOrgChrome(isAdmin)}
      aktiv={seksjon}
    >
      {seksjon === 'oversikt' ? <ForhandlerKort /> : null}
      {seksjon === 'ansatte' ? <OrganisasjonAnsatte /> : null}
      {seksjon === 'abonnement' ? (
        <section className="flex flex-col gap-8" aria-label="Abonnement">
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
          <IntegrasjonerInnhold />
        </section>
      ) : null}
    </SideChromeSkall>
  );
}
