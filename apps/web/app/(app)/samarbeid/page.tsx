'use client';

import { BookOpen, Handshake, Receipt, TriangleAlert } from '@endwise/ui';
import { CardMedia, CardShell } from '../_shell/cards';

/**
 * Samarbeid (tidligere «Kunnskapsbase»).
 * Forhandlere deler og finner informasjon på tvers: rutiner, erfaringer,
 * tjenester og prisliste.
 * Dette er den eneste flaten i produktet som med vilje krysser
 * tenant-grensen. Alt annet vi har bygget — RLS, `withTenant`, deltakersjekk
 * i meldinger, tenant-bindingen i `spawnAgent` — finnes for å hindre nettopp
 * det. Derfor står grensen i klartekst øverst på skjermen, ikke i en
 * dokumentasjonsfil ingen leser.
 * Status: flate-skall. Backend finnes ikke — det er med vilje. Delt innhold
 * skal ha en egen tabell utenfor tenant-RLS-mønsteret, med et skjema som ikke
 * Har felter for kundefritekst, kontaktinfo eller regnr. Det som ikke har et
 * felt, kan ikke lekke inn i det.
 */
export default function SamarbeidPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Samarbeid</h1>
        <p className="text-body text-fg-muted">
          Del rutiner, erfaringer og prislister med andre Endwise-forhandlere.
        </p>
      </div>

      {/* Grensen først. Den er ikke en fotnote. */}
      <section className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft p-4">
        <TriangleAlert size={16} className="mt-0.5 shrink-0 text-danger" />
        <div className="flex flex-col gap-1">
          <h2 className="text-label text-danger">Hard grense — kundedata deles aldri her</h2>
          <p className="text-[12px] text-fg leading-relaxed">
            Meldinger mellom kunde og forhandler, navn, kontaktinfo og registreringsnummer skal{' '}
            <b>aldri</b> inn i Samarbeid. Kun strukturert, avidentifisert informasjon skrevet av
            forhandleren. Publisering er alltid en bevisst handling — ingenting synkes automatisk
            fra driftsdata.
          </p>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <Omraade
          icon={BookOpen}
          title="Rutiner"
          body="Fremgangsmåter og sjekklister andre verksteder har delt."
        />
        <Omraade
          icon={Handshake}
          title="Erfaringer"
          body="Det forhandleren selv har skrevet om en jobb — ikke kundens ord."
        />
        <Omraade
          icon={Receipt}
          title="Tjenester og priser"
          body="Prisnivå og tjenestebeskrivelser på tvers av markedet."
        />
      </div>

      <CardShell>
        <CardMedia className="flex flex-col items-center gap-2 p-10 text-center">
          <Handshake size={24} className="text-fg-muted" />
          <p className="text-label text-fg">Ingen delt informasjon ennå</p>
          <p className="max-w-md text-[12px] text-fg-muted leading-relaxed">
            Deling mellom verksteder er ikke åpnet ennå. Inngangen er skjult i menyen til den er
            klar.
          </p>
        </CardMedia>
      </CardShell>
    </div>
  );
}

function Omraade({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BookOpen;
  title: string;
  body: string;
}) {
  return (
    <CardShell>
      <div className="flex flex-col gap-2 p-4">
        <span className="flex size-8 items-center justify-center rounded-control bg-accent-soft text-accent-strong">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <p className="text-label text-fg">{title}</p>
        <p className="text-[12px] text-fg-muted leading-relaxed">{body}</p>
      </div>
    </CardShell>
  );
}
