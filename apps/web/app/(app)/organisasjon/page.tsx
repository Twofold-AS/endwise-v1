'use client';

import { LasterFlate, ListeRad, Side } from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useOrgRole } from '../_lib/use-org-role';
import { NyKnapp, useNyHandling } from '../_shell/ny-handling';
import { AgentOppretter } from '../_shell/oppretter/agent-oppretter';
import { AbonnementInnhold } from '../abonnement/_innhold';
import { IntegrasjonerInnhold } from '../integrasjoner/_innhold';
import { TjenesterInnhold } from '../tjenester/_innhold';
import { AktivitetFraEndwise } from './_aktivitet-endwise';
import { OrganisasjonAnsatte } from './_ansatte';
import { parseOrgSeksjon } from './_seksjoner';
import { TimeplanAnsatteFlate } from './_timeplan-ansatte';
import { ForhandlerKort } from './forhandleren/_kort';

function OrganisasjonIndre() {
  const { isAdmin } = useOrgRole();
  const params = useSearchParams();
  const seksjon = parseOrgSeksjon(params?.get('seksjon'), isAdmin);
  const ny = useNyHandling();
  const [agentApen, setAgentApen] = useState(false);

  if (seksjon === 'oversikt') {
    return (
      <Side tittel="Organisasjon" undertekst="Verkstedets oppsett">
        <ForhandlerKort />
        <ListeRad
          tittel="Ansatte"
          undertekst="Teamet, timeplan og hvem som har jobber i dag"
          href="/organisasjon?seksjon=ansatte"
        />
        <ListeRad
          tittel="Timeplan ansatte"
          undertekst="Fri, stempling, syk og ferie"
          href="/organisasjon?seksjon=timeplan-ansatte"
        />
        <ListeRad tittel="Mekanikere" undertekst="Kompetanse og kapasitet" href="/mekanikere" />
        <ListeRad
          tittel="Tilganger"
          undertekst="Hvem som får se hva"
          href="/organisasjon?seksjon=tilganger"
        />
        {isAdmin ? (
          <ListeRad
            tittel="Aktivitet fra Endwise"
            undertekst="Hva Endwise har gjort hos dere"
            href="/organisasjon?seksjon=aktivitet-endwise"
          />
        ) : null}
        {isAdmin ? (
          <ListeRad
            tittel="Abonnement"
            undertekst="Plan, tillegg og priser"
            href="/organisasjon?seksjon=abonnement"
          />
        ) : null}
        {isAdmin ? (
          <ListeRad
            tittel="Integrasjoner"
            undertekst="Quick og andre koblinger"
            href="/organisasjon?seksjon=integrasjoner"
          />
        ) : null}
        <ListeRad
          tittel="Assistenter"
          undertekst="Ronny og andre assistenter"
          onClick={() => setAgentApen(true)}
          chevron
        />
        <AgentOppretter apen={agentApen} onLukk={() => setAgentApen(false)} />
      </Side>
    );
  }

  if (seksjon === 'ansatte') {
    return (
      <Side
        tittel="Ansatte"
        tilbakeHref="/organisasjon"
        tilbakeLabel="Tilbake til organisasjon"
        handling={isAdmin ? <NyKnapp onClick={ny.apne}>Ny ansatt</NyKnapp> : undefined}
      >
        <OrganisasjonAnsatte apenNy={ny.apen} onLukkNy={ny.lukk} />
      </Side>
    );
  }

  if (seksjon === 'timeplan-ansatte') {
    return <TimeplanAnsatteFlate />;
  }

  if (seksjon === 'tilganger') {
    return (
      <Side tittel="Tilganger" tilbakeHref="/organisasjon" undertekst="Hvem som får se hva">
        <p className="text-body text-fg-muted">
          Tilgangsstyring kommer senere. I dag styres synlighet av rollen (admin, selger, support,
          mekaniker).
        </p>
      </Side>
    );
  }

  if (seksjon === 'aktivitet-endwise') {
    return (
      <Side
        tittel="Aktivitet fra Endwise"
        tilbakeHref="/organisasjon"
        undertekst="Bare daglig leder ser dette"
      >
        <AktivitetFraEndwise />
      </Side>
    );
  }

  if (seksjon === 'abonnement') {
    return (
      <Side tittel="Abonnement" tilbakeHref="/organisasjon">
        <AbonnementInnhold />
        <section className="mt-8 flex flex-col gap-3" aria-label="Tillegg og priser">
          <h2 className="text-title text-fg">Tillegg og priser</h2>
          <p className="text-body text-fg-muted">
            Funksjonene Endwise har bygget, og hva de koster.
          </p>
          <TjenesterInnhold />
        </section>
      </Side>
    );
  }

  if (seksjon === 'integrasjoner') {
    return (
      <Side tittel="Integrasjoner" tilbakeHref="/organisasjon">
        <IntegrasjonerInnhold />
      </Side>
    );
  }

  return (
    <Side tittel="Organisasjon" tilbakeHref="/organisasjon">
      <ForhandlerKort />
    </Side>
  );
}

export default function OrganisasjonPage() {
  return (
    <Suspense fallback={<LasterFlate label="Henter organisasjon" />}>
      <OrganisasjonIndre />
    </Suspense>
  );
}
