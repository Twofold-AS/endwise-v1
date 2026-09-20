'use client';

import {
  Avatar,
  Car,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  StatefulButton,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  jobbRadUndertekst,
  kjoretoyRadTittel,
  kjoretoyRadUndertekst,
  lagreKundeAngre,
  meldingTraadStatus,
} from '../../_innbygging/kunder-katalog';
import { StatusMerke } from '../../_innbygging/status-merke';
import { CardShell } from '../../_shell/cards';
import { SideChromeSkall } from '../../_shell/side-chrome-skall';
import { dato, datoTid, Feil, Kilde, Laster, Seksjon, TYPE_LABEL } from '../_delt';
import { KundeEndre, sisteAdresse } from '../_endre';
import { KUNDER_FANER, kunderHref } from '../_faner';
import { RegistrerKjoretoy } from '../_registrer-kjoretoy';

/**
 * Kundekortet. «Søk opp en kunde og se alt.»
 * Alt hentes i Étt kall (`customers.byId`). Fire separate spørringer ville gitt
 * fire lastetilstander på én skjerm, og en side som blafrer inn i etapper.
 * Rekkefølgen er verkstedets, ikke databasens: hvem er dette → hva eier de →
 * hva har vi gjort → hva er sagt. Notatene ligger nederst fordi de er det man
 * skriver, ikke det man kommer for å lese.
 */
export default function KundekortPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const utils = trpc.useUtils();

  const kunde = trpc.customers.byId.useQuery({ id }, { enabled: Boolean(id) });
  const [notat, setNotat] = useState('');
  const [leggTilKjoretoy, setLeggTilKjoretoy] = useState(false);
  const [slettApen, setSlettApen] = useState(false);

  const leggTilNotat = trpc.customers.addNote.useMutation({
    onSuccess: () => {
      void utils.customers.byId.invalidate({ id });
      setNotat('');
    },
  });
  const fjernKjoretoy = trpc.vehicles.assignCustomer.useMutation({
    onSuccess: () => {
      void utils.customers.byId.invalidate({ id });
      void utils.vehicles.list.invalidate();
    },
  });
  const slettKunde = trpc.customers.remove.useMutation({
    onSuccess: () => {
      void utils.customers.list.invalidate();
      void utils.customers.antall.invalidate();
      router.replace('/kunder' as Route);
    },
  });

  function submitNotat(e: FormEvent) {
    e.preventDefault();
    if (!notat.trim()) return;
    leggTilNotat.mutate({ customerId: id, body: notat.trim() });
  }

  if (kunde.isLoading) return <Laster />;
  if (kunde.isError) return <Feil melding={kunde.error.message} />;

  const k = kunde.data;
  if (!k) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-8 py-7">
        <CardShell className="flex items-start gap-3 p-6">
          <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
          <div>
            <p className="text-label text-fg">Fant ikke kunden</p>
            <p className="mt-1 text-[12px] text-fg-muted">
              Den kan være slettet, eller høre til et annet verksted.
            </p>
            <Link
              href={'/kunder' as Route}
              className="mt-3 inline-block text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
            >
              ← Tilbake til kunder
            </Link>
          </div>
        </CardShell>
      </div>
    );
  }

  return (
    <SideChromeSkall
      tittel="Kunder"
      ingress="Kundekort — kontakt, kjøretøy og historikk."
      faner={KUNDER_FANER.map((f) => ({ ...f, href: kunderHref(f.id) }))}
      aktiv="alle"
    >
      {/* Hvem */}
      <div className="flex items-start gap-4">
        {/*
         * Seeden er `customers.id`, samme som innboksen og
         * detaljpanelet. Ikke navnet: retter noen en skrivefeil i navnet,
         * skal ikke kunden bytte ansikt.
         */}
        <Avatar seed={k.id} navn={k.name} size={48} bevegelse="hover" />
        <div className="min-w-0 flex-1">
          <h1 className="sr-only">Kunde · {k.name}</h1>
          <p className="flex items-center gap-2 text-title text-fg">
            {k.name}
            <Kilde source={k.source} />
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-fg-muted">
            {k.phone && (
              <a href={`tel:${k.phone}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                <Phone size={13} strokeWidth={1.75} />
                {k.phone}
              </a>
            )}
            {k.email && (
              <a
                href={`mailto:${k.email}`}
                className="inline-flex items-center gap-1.5 hover:text-fg"
              >
                <Mail size={13} strokeWidth={1.75} />
                {k.email}
              </a>
            )}
            <span>Kunde siden {dato(k.createdAt)}</span>
          </div>
        </div>
      </div>

      <Seksjon tittel="Kontakt">
        <div data-kunde-kontakt className="flex flex-col">
          <div className="flex h-row-store items-center justify-between gap-3 border-divide border-b">
            <span className="text-label text-fg-muted">Telefon</span>
            <span className="text-label text-fg tabular-nums">{k.phone || '—'}</span>
          </div>
          <div className="flex h-row-store items-center justify-between gap-3">
            <span className="text-label text-fg-muted">E-post</span>
            <span className="truncate text-label text-fg">{k.email || '—'}</span>
          </div>
        </div>
      </Seksjon>

      <KundeEndre
        id={k.id}
        navn={k.name}
        telefon={k.phone}
        epost={k.email}
        adresse={sisteAdresse(k.notater)}
      />

      {/* Kjøretøy */}
      <Seksjon tittel="Kjøretøy" antall={k.kjoretoy.length}>
        <div className="flex justify-end">
          <button
            type="button"
            data-kunde-legg-til-kjoretoy
            onClick={() => setLeggTilKjoretoy((v) => !v)}
            className="text-label text-fg"
          >
            {leggTilKjoretoy ? 'Lukk' : 'Legg til kjøretøy'}
          </button>
        </div>
        {k.kjoretoy.length === 0 && !leggTilKjoretoy ? (
          <p className="text-[12px] text-fg-muted">Ingen kjøretøy på denne kunden.</p>
        ) : k.kjoretoy.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border">
            {k.kjoretoy.map((v, i) => (
              <div
                key={v.id}
                data-kunde-kjoretoy={v.id}
                className={`flex min-h-row-store items-center gap-3 bg-bg px-4 py-2 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <Link
                  href={`/kjoretoy/${v.id}` as Route}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Car size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label text-fg">
                      {kjoretoyRadTittel(v.make, v.model, TYPE_LABEL[v.type])}
                    </span>
                    <span className="block truncate text-[12px] text-fg-muted">
                      {kjoretoyRadUndertekst(TYPE_LABEL[v.type], v.modelYear, v.regNumber)}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
                </Link>
                <button
                  type="button"
                  data-kunde-fjern-kjoretoy={v.id}
                  disabled={fjernKjoretoy.isPending}
                  onClick={() => fjernKjoretoy.mutate({ vehicleId: v.id, customerId: null })}
                  className="shrink-0 text-[12px] text-fg-muted hover:text-fg"
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {leggTilKjoretoy ? (
          <RegistrerKjoretoy
            fastKundeId={k.id}
            onFerdig={() => {
              setLeggTilKjoretoy(false);
              void utils.customers.byId.invalidate({ id: k.id });
            }}
          />
        ) : null}
      </Seksjon>

      {/* Jobber */}
      <Seksjon tittel="Jobber" antall={k.saker.length}>
        {k.saker.length === 0 ? (
          <p className="text-[12px] text-fg-muted">Ingen jobber registrert ennå.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {k.saker.map((s, i) => (
              <Link key={s.id} href={`/bookinger/${s.id}` as Route} className="group block">
                <div
                  className={`flex min-h-row-store items-center gap-4 bg-bg px-4 py-2 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-label text-fg">
                      {s.serviceName ?? 'Tjeneste'}
                    </span>
                    <span className="truncate text-[12px] text-fg-muted">
                      {jobbRadUndertekst(s.startsAt, s.mechanicName)}
                    </span>
                  </div>
                  <StatusMerke status={s.status} notes={s.notes} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Seksjon>

      {/* Meldinger */}
      <Seksjon tittel="Meldinger" antall={k.traader.length}>
        {k.traader.length === 0 ? (
          <CardShell className="flex items-start gap-3 p-4">
            <Inbox size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
            <p className="text-[12px] text-fg-muted leading-relaxed">
              {k.userId
                ? 'Ingen meldingstråder med denne kunden ennå.'
                : 'Kunden har ikke logget inn på «Min side», så det finnes ingen kobling til meldinger. Tråder knyttes til en innlogget bruker, ikke til e-postadressen.'}
            </p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {k.traader.map((t, i) => (
              <Link key={t.id} href={`/innboks/${t.id}` as Route} className="group block">
                <div
                  className={`flex h-row-store items-center gap-4 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <MessageSquare size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label text-fg">
                      {t.subject ?? 'Samtale'}
                    </span>
                    <span className="block truncate text-[12px] text-fg-muted">
                      {datoTid(t.createdAt)} · {meldingTraadStatus(t.deltakere ?? 0)}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Seksjon>

      {/* Notater */}
      <Seksjon tittel="Notater" antall={k.notater.length}>
        <CardShell className="p-4">
          <form onSubmit={submitNotat} className="flex items-start gap-2">
            <input
              value={notat}
              onChange={(e) => setNotat(e.target.value)}
              maxLength={4000}
              placeholder="Skriv et internt notat om kunden"
              className="h-control min-w-0 flex-1 ew-felt ew-felt-md px-2.5"
            />
            <StatefulButton
              type="submit"
              disabled={!notat.trim() || leggTilNotat.isPending}
              state={leggTilNotat.isPending ? 'loading' : leggTilNotat.isError ? 'error' : 'idle'}
              loadingText="Lagrer…"
              errorText="Feilet"
              icon={<Plus size={15} />}
            >
              Legg til
            </StatefulButton>
          </form>
          {leggTilNotat.error && (
            <p className="mt-2 text-body text-danger">{leggTilNotat.error.message}</p>
          )}
          {/*
           * Notater er interne. Det står her fordi feltet ellers ser ut som
           * en melding til kunden — og forskjellen er ikke til å spøke med.
           */}
          <p className="mt-2 text-[11px] text-fg-muted">
            Notater er interne og vises aldri for kunden.
          </p>
        </CardShell>

        {k.notater.length > 0 && (
          <div className="flex flex-col gap-2">
            {k.notater.map((n) => (
              <CardShell key={n.id} className="p-3">
                <p className="text-body text-fg">{n.body}</p>
                <p className="mt-1 text-[11px] text-fg-muted tabular-nums">
                  {datoTid(n.createdAt)}
                </p>
              </CardShell>
            ))}
          </div>
        )}
      </Seksjon>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/bookinger/ny?customerId=${k.id}` as Route}
          className="inline-flex h-control items-center rounded-full bg-fg px-3 text-label text-bg"
        >
          Ny jobb på kunde
        </Link>
        <button
          type="button"
          data-slett-kunde
          onClick={() => setSlettApen(true)}
          className="inline-flex h-control items-center rounded-full border border-divide px-3 text-label text-fg"
        >
          Slett kunde
        </button>
      </div>

      {slettApen ? (
        <div
          data-slett-kunde-bekreft
          className="rounded-[24px] border border-divide bg-card px-4 py-3"
        >
          <p className="text-label text-fg">
            Slette {k.name}? Jobber og kjøretøy mister eier, ikke historikk.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSlettApen(false)}
              className="text-label text-fg-muted"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={slettKunde.isPending}
              onClick={() => {
                lagreKundeAngre({
                  id: k.id,
                  name: k.name,
                  email: k.email,
                  phone: k.phone,
                  source: k.source,
                });
                slettKunde.mutate({ id: k.id });
              }}
              className="text-label font-[650] text-danger"
            >
              {slettKunde.isPending ? 'Sletter…' : 'Slett'}
            </button>
          </div>
          {slettKunde.isError ? (
            <p className="mt-2 text-[12px] text-danger">{slettKunde.error.message}</p>
          ) : null}
        </div>
      ) : null}

      <Link
        href={'/kunder' as Route}
        className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted transition-colors hover:text-fg"
      >
        <ClipboardList size={14} />← Alle kunder
      </Link>
    </SideChromeSkall>
  );
}
