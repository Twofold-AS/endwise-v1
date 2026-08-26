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
import { useParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { STATUS_LABEL, STATUS_TONE } from '../../bookinger/_status';
import { dato, datoTid, EuFrist, Feil, Kilde, kroner, Laster, Seksjon, TYPE_LABEL } from '../_delt';

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
  const id = params?.id ?? '';
  const utils = trpc.useUtils();

  const kunde = trpc.customers.byId.useQuery({ id }, { enabled: Boolean(id) });
  const [notat, setNotat] = useState('');

  const leggTilNotat = trpc.customers.addNote.useMutation({
    onSuccess: () => {
      void utils.customers.byId.invalidate({ id });
      setNotat('');
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
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-8 py-7">
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

      {/* Kjøretøy */}
      <Seksjon tittel="Kjøretøy" antall={k.kjoretoy.length}>
        {k.kjoretoy.length === 0 ? (
          <CardShell className="p-6 text-center">
            <p className="text-[12px] text-fg-muted">
              Ingen kjøretøy registrert på denne kunden ennå.
            </p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {k.kjoretoy.map((v, i) => (
              <Link key={v.id} href={`/kjoretoy/${v.id}` as Route} className="group block">
                <div
                  className={`flex h-row-store items-center gap-4 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <Car size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                  <span className="w-24 shrink-0 font-mono text-label text-fg">
                    {v.regNumber ?? '—'}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-label text-fg">
                      {[v.make, v.model].filter(Boolean).join(' ') || TYPE_LABEL[v.type]}
                    </span>
                    <span className="truncate text-[12px] text-fg-muted">
                      {TYPE_LABEL[v.type]}
                      {v.modelYear ? ` · ${v.modelYear}` : ''}
                    </span>
                  </div>
                  <span className="w-32 shrink-0 text-right text-[12px] tabular-nums">
                    <span className="text-fg-muted">EU: </span>
                    <EuFrist dato={v.inspectionDue} />
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Seksjon>

      {/* Servicehistorikk */}
      <Seksjon tittel="Servicehistorikk" antall={k.saker.length}>
        {k.saker.length === 0 ? (
          <CardShell className="p-6 text-center">
            <p className="text-[12px] text-fg-muted">Ingen saker registrert ennå.</p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {k.saker.map((s, i) => (
              <Link key={s.id} href={`/bookinger/${s.id}` as Route} className="group block">
                <div
                  className={`flex min-h-row-store items-center gap-4 bg-bg px-4 py-2 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <span className="w-28 shrink-0 text-[12px] text-fg-muted tabular-nums">
                    {dato(s.startsAt)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-label text-fg">
                      {s.serviceName ?? 'Tjeneste'}
                    </span>
                    <span className="truncate text-[12px] text-fg-muted">
                      {s.regNumber ?? 'Uten regnr'}
                      {s.mechanicName ? ` · ${s.mechanicName}` : ''}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </span>
                  </div>
                  <span className="w-20 shrink-0 text-right text-[12px] text-fg-muted tabular-nums">
                    {kroner(s.priceMinor)}
                  </span>
                  <span
                    className={`inline-flex h-badge shrink-0 items-center rounded-badge px-2 font-medium text-[11px] ${
                      STATUS_TONE[s.status] ?? 'bg-surface-2 text-fg-muted'
                    }`}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
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
                  <span className="min-w-0 flex-1 truncate text-label text-fg">
                    {t.subject ?? 'Samtale'}
                  </span>
                  <span className="shrink-0 text-[12px] text-fg-muted tabular-nums">
                    {dato(t.createdAt)}
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
              className="h-control min-w-0 flex-1 rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
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

      <Link
        href={'/kunder' as Route}
        className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted transition-colors hover:text-fg"
      >
        <ClipboardList size={14} />← Alle kunder
      </Link>
    </div>
  );
}
