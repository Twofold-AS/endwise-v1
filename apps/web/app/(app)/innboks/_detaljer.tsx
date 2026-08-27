'use client';

import {
  Avatar,
  Car,
  ChevronRight,
  CircleAlert,
  CircleUser,
  ClipboardList,
  CreditCard,
  MessageSquare,
  PanelRightClose,
  Timer,
  X,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { type RouterOutput, trpc } from '@/lib/trpc';
import { STATUS_LABEL, STATUS_TONE } from '../bookinger/_status';
import { dato, datoTid, EuFrist, Kilde, TYPE_LABEL } from '../kunder/_delt';
import { KANAL, tilKanal } from './_kanal';
import { fmtWhen } from './_lib';

/**
 * «detaljer»: kontekstpanelet helt til høyre i innboksen.
 * Hva det er til for
 * En melding uten kontekst er en gåte. «Rekker dere bremsene før helgen?» er et
 * annet spørsmål hvis kunden har en booking på torsdag enn hvis hun ikke har
 * noen. Panelet svarer på «hvem er dette, og hva har vi gående med dem» uten at
 * man må forlate samtalen — og uten at svaret må gjettes fra hukommelsen.
 * Innholdet følger trådtypen, ikke en fane-velger
 * Serveren avgjør (`inboxContext.forThread`) og returnerer en diskriminert
 * union. Klienten tegner det den får. Å la brukeren velge «vis kundekort» i en
 * intern tråd ville vært et valg uten et riktig svar.
 * Personvern
 * For kundetråder er dette forhandlerens egen kunde og deres egen strukturerte
 * data — helt innenfor. Grensen som holdes: ingenting på tvers av tenants (RLS
 * + deltakelseskrav på serveren), og **ingen meldingstekst** fra andre tråder.
 * Listen «Andre samtaler» viser emne og tidspunkt. Vil man lese, åpner man
 * tråden.
 * Bredde og små skjermer
 * 320px, som innboks-sidebaren — to like brede kolonner rammer inn samtalen i
 * midten. Under `xl` legger panelet seg som et **overlay** over tråden i stedet
 * for å presse den sammen: tre kolonner på en 13-tommer gir en 200px
 * meldingsspalte, og da er samtalen ikke lesbar lenger.
 */
const BREDDE = 'w-[320px]';

export function DetaljerPanel({
  threadId,
  apen,
  onLukk,
}: {
  threadId: string;
  apen: boolean;
  onLukk: () => void;
}) {
  const ctx = trpc.inboxContext.forThread.useQuery(
    { threadId },
    { enabled: apen && Boolean(threadId) },
  );

  if (!apen) return null;

  return (
    <>
      {/*
       * Overlay-bakgrunn under xl. Klikk utenfor lukker — ellers ville
       * panelet stengt tråden inne på en liten skjerm.
       */}
      <button
        type="button"
        aria-label="Lukk detaljer"
        onClick={onLukk}
        className="fixed inset-0 z-30 bg-fg/20 xl:hidden"
      />
      <aside
        className={`${BREDDE} fixed top-0 right-0 bottom-0 z-40 flex h-[calc(100dvh-3.5rem)] shrink-0 flex-col overflow-hidden border-border border-l bg-sidebar xl:static xl:z-auto`}
        aria-label="Detaljer om samtalen"
      >
        {/* Header: 56px + border-b, på linje med topbaren og de to andre
            sidebar-headerne. Fjerde skillelinje på samme linje. */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-border border-b px-3">
          <h2 className="mr-auto min-w-0 truncate text-title text-fg">Detaljer</h2>
          <button
            type="button"
            onClick={onLukk}
            title="Skjul detaljer"
            aria-label="Skjul detaljer"
            className="flex size-7 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sidebar-active/60 hover:text-fg"
          >
            <PanelRightClose size={16} strokeWidth={1.75} className="hidden xl:block" />
            <X size={16} strokeWidth={1.75} className="xl:hidden" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
          {ctx.isLoading ? (
            <p className="px-1 py-6 text-center text-[12px] text-fg-muted">Henter kontekst …</p>
          ) : ctx.isError ? (
            <Nøktern tittel="Kunne ikke hente detaljer" tekst={ctx.error.message} />
          ) : ctx.data?.type === 'kunde' ? (
            <Kundekontekst data={ctx.data} />
          ) : ctx.data?.type === 'mekaniker' ? (
            <Mekanikerkontekst data={ctx.data} />
          ) : ctx.data?.type === 'konto' ? (
            <Kontokontekst data={ctx.data} />
          ) : (
            <UkjentKontekst grunn={ctx.data?.grunn} />
          )}
        </div>
      </aside>
    </>
  );
}

/* Felles smådeler */

function Seksjon({
  tittel,
  antall,
  children,
}: {
  tittel: string;
  antall?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 px-1 text-[11px] text-fg-muted uppercase tracking-wide">
        {tittel}
        {antall !== undefined && <span className="tabular-nums">({antall})</span>}
      </h3>
      {children}
    </section>
  );
}

/** Tomt er ikke en feil — men det skal stå hvorfor det er tomt. */
function Tom({ tekst }: { tekst: string }) {
  return (
    <p className="rounded-control border border-border border-dashed px-3 py-3 text-[12px] text-fg-muted">
      {tekst}
    </p>
  );
}

/**
 * Fallbacket. Ikke tomme felter med streker — en nøktern setning som sier
 * hva vi ikke vet. Et kundekort uten kunde ser ut som en feil; en setning som
 * sier «vi finner ingen kunde knyttet til denne samtalen» er et svar.
 */
function Nøktern({ tittel, tekst }: { tittel: string; tekst: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-control border border-border bg-bg p-3">
      <CircleAlert size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
      <div className="min-w-0">
        <p className="text-label text-fg">{tittel}</p>
        <p className="mt-0.5 text-[12px] text-fg-muted leading-relaxed">{tekst}</p>
      </div>
    </div>
  );
}

const UKJENT_GRUNN: Record<string, { tittel: string; tekst: string }> = {
  ikke_funnet: {
    tittel: 'Samtalen finnes ikke',
    tekst: 'Tråden kan være slettet, eller høre til et annet verksted.',
  },
  ikke_deltaker: {
    tittel: 'Du er ikke deltaker',
    tekst: 'Detaljer vises bare for samtaler du selv er med i.',
  },
  ingen_motpart: {
    tittel: 'Ingen motpart ennå',
    tekst: 'Du er foreløpig alene i tråden, så det finnes ingen å vise kontekst for.',
  },
  ingen_mekanikerprofil: {
    tittel: 'Ingen mekanikerprofil',
    tekst:
      'Motparten er ansatt her, men har ingen mekanikerprofil — så det finnes ingen jobber eller kapasitet å vise.',
  },
  ingen_kunde: {
    tittel: 'Ingen kunde koblet',
    tekst:
      'Vi finner ingen kunde som hører til denne samtalen. Kunden kan ha skrevet fra en adresse eller et nummer som ikke står i kunderegisteret.',
  },
};

function UkjentKontekst({ grunn }: { grunn?: string }) {
  const g = (grunn ? UKJENT_GRUNN[grunn] : undefined) ?? {
    tittel: 'Ingen kontekst',
    tekst: 'Vi har ingenting å vise for denne samtalen ennå.',
  };
  return <Nøktern tittel={g.tittel} tekst={g.tekst} />;
}

/* Kunde */

type Kontekst = RouterOutput['inboxContext']['forThread'];
type KundeData = Extract<Kontekst, { type: 'kunde' }>;

function Kundekontekst({ data }: { data: KundeData }) {
  const k = data.kunde;
  return (
    <>
      {/* Identitet */}
      <Link href={`/kunder/${k.id}` as Route} className="group block">
        <div className="flex items-center gap-3 rounded-control border border-border bg-bg p-3 transition-colors group-hover:bg-surface-2">
          {/*
           * Seeden er `customers.id`, nøyaktig samme som innboks-
           * lista og kundekortet bruker. Én person, ett ansikt, tre flater.
           */}
          <Avatar seed={k.id} navn={k.navn} size={36} bevegelse="hover" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 truncate text-label text-fg">
              {k.navn}
              <Kilde source={k.kilde} />
            </span>
            <span className="truncate text-[12px] text-fg-muted">
              {[k.telefon, k.epost].filter(Boolean).join(' · ') || 'Ingen kontaktinfo'}
            </span>
          </div>
          <ChevronRight size={15} className="shrink-0 text-fg-muted" aria-hidden />
        </div>
      </Link>
      <p className="-mt-2 px-1 text-[11px] text-fg-muted">
        Kunde siden {dato(k.kundeSiden)}
        {k.harInnlogging ? ' · har «Min side»' : ''}
      </p>

      <Seksjon tittel="Kjøretøy" antall={data.kjoretoy.length}>
        {data.kjoretoy.length === 0 ? (
          <Tom tekst="Ingen kjøretøy registrert på kunden." />
        ) : (
          <div className="overflow-hidden rounded-control border border-border">
            {data.kjoretoy.map((v, i) => (
              <Link key={v.id} href={`/kjoretoy/${v.id}` as Route} className="group block">
                <div
                  className={`flex items-center gap-2.5 bg-bg px-3 py-2 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <Car size={14} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-mono text-[12px] text-fg">
                      {v.regNumber ?? 'Uten regnr'}
                    </span>
                    <span className="truncate text-[11px] text-fg-muted">
                      {[v.make, v.model].filter(Boolean).join(' ') || TYPE_LABEL[v.type]}
                    </span>
                  </div>
                  <span className="shrink-0 text-right text-[11px] tabular-nums">
                    <EuFrist dato={v.inspectionDue} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Seksjon>

      <Seksjon tittel="Åpne saker" antall={data.apneSaker.length}>
        {data.apneSaker.length === 0 ? (
          <Tom tekst="Ingen åpne saker akkurat nå." />
        ) : (
          <SakListe saker={data.apneSaker} />
        )}
      </Seksjon>

      <Seksjon tittel="Servicehistorikk">
        {data.historikk.length === 0 ? (
          <Tom tekst="Ingen fullførte saker ennå." />
        ) : (
          <SakListe saker={data.historikk} />
        )}
      </Seksjon>

      <Seksjon tittel="Andre samtaler" antall={data.andreTraader.length}>
        {data.andreTraader.length === 0 ? (
          <Tom tekst="Dette er den eneste samtalen med kunden." />
        ) : (
          <div className="overflow-hidden rounded-control border border-border">
            {data.andreTraader.map((t, i) => {
              const kanal = KANAL[tilKanal(t.channel)];
              const Ikon = kanal.icon;
              return (
                <Link key={t.id} href={`/innboks/${t.id}` as Route} className="group block">
                  <div
                    className={`flex items-center gap-2.5 bg-bg px-3 py-2 transition-colors group-hover:bg-surface-2 ${
                      i > 0 ? 'border-border border-t' : ''
                    }`}
                  >
                    <Ikon size={13} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-fg">
                      {t.subject?.trim() || 'Samtale'}
                    </span>
                    <span className="shrink-0 text-[11px] text-fg-muted tabular-nums">
                      {fmtWhen(t.lastMessageAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {/*
         * Står her med vilje: panelet viser at dere har snakket sammen, ikke
         * Hva som ble sagt.
         */}
        <p className="px-1 text-[11px] text-fg-muted">Emne og tidspunkt — ikke meldingstekst.</p>
      </Seksjon>
    </>
  );
}

function SakListe({
  saker,
}: {
  saker: {
    id: string;
    status: string;
    startsAt: Date | string;
    regNumber: string | null;
    serviceName: string | null;
  }[];
}) {
  return (
    <div className="overflow-hidden rounded-control border border-border">
      {saker.map((s, i) => (
        <Link key={s.id} href={`/bookinger/${s.id}` as Route} className="group block">
          <div
            className={`flex items-center gap-2.5 bg-bg px-3 py-2 transition-colors group-hover:bg-surface-2 ${
              i > 0 ? 'border-border border-t' : ''
            }`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[12px] text-fg">{s.serviceName ?? 'Tjeneste'}</span>
              <span className="truncate text-[11px] text-fg-muted tabular-nums">
                {dato(s.startsAt)}
                {s.regNumber ? ` · ${s.regNumber}` : ''}
              </span>
            </div>
            <span
              className={`inline-flex h-badge shrink-0 items-center rounded-badge px-1.5 font-medium text-[11px] ${
                STATUS_TONE[s.status] ?? 'bg-surface-2 text-fg-muted'
              }`}
            >
              {STATUS_LABEL[s.status] ?? s.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* Mekaniker */

type MekData = Extract<Kontekst, { type: 'mekaniker' }>;

function Mekanikerkontekst({ data }: { data: MekData }) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-control border border-border bg-bg p-3">
        {/*
         * Skiftenøkkelen sto her og sa «en mekaniker», ikke «hvilken
         * mekaniker». Seeden er `mechanics.id`; valgene kommer fra serveren
         * slik at ansiktet er det samme som i tråden ved siden av.
         */}
        <Avatar
          seed={data.mekanikerId}
          valg={{ ...data.avatar, humor: data.statusHumor }}
          navn={data.navn}
          size={36}
          bevegelse="hover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-label text-fg">{data.navn}</span>
          <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${data.aktiv ? 'bg-success' : 'bg-fg-muted'}`}
            />
            {data.statusLabel}
          </span>
        </div>
      </div>

      <Seksjon tittel="Belastning i dag">
        <div className="flex items-center gap-3 rounded-control border border-border bg-bg p-3">
          <Timer size={15} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          <p className="text-[12px] text-fg">
            <span className="font-medium text-label">{data.jobberIDag}</span> jobber i dag ·
            kapasitet <span className="font-medium">{data.kapasitet}</span> samtidig
          </p>
        </div>
        {/*
         * Kapasitet er «samtidige jobber», ikke «per dag». Å regne det om til
         * en prosent ville gitt tallet en presisjon det ikke har.
         */}
        <p className="px-1 text-[11px] text-fg-muted leading-relaxed">
          Kapasitet betyr hvor mange jobber som kan gå samtidig, ikke hvor mange som får plass i
          løpet av dagen. Tallene er en pekepinn, ikke en fasit.
        </p>
      </Seksjon>

      <Seksjon tittel="Dagens jobber" antall={data.jobber.length}>
        {data.jobber.length === 0 ? (
          <Tom tekst="Ingen jobber satt opp i dag." />
        ) : (
          <div className="overflow-hidden rounded-control border border-border">
            {data.jobber.map((j, i) => (
              <Link key={j.id} href={`/bookinger/${j.id}` as Route} className="group block">
                <div
                  className={`flex items-center gap-2.5 bg-bg px-3 py-2 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <span className="w-10 shrink-0 text-[11px] text-fg-muted tabular-nums">
                    {new Date(j.startsAt).toLocaleTimeString('nb-NO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[12px] text-fg">
                      {j.serviceName ?? 'Tjeneste'}
                    </span>
                    <span className="truncate font-mono text-[11px] text-fg-muted">
                      {j.regNumber ?? '—'}
                    </span>
                  </div>
                  <span
                    className={`inline-flex h-badge shrink-0 items-center rounded-badge px-1.5 font-medium text-[11px] ${
                      STATUS_TONE[j.status] ?? 'bg-surface-2 text-fg-muted'
                    }`}
                  >
                    {STATUS_LABEL[j.status] ?? j.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Seksjon>

      <Seksjon tittel="Kompetanse" antall={data.kompetanse.length}>
        {data.kompetanse.length === 0 ? (
          <Tom tekst="Ingen ferdigheter registrert." />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.kompetanse.map((k) => {
              const utloper = k.certificationExpiresAt
                ? new Date(k.certificationExpiresAt).getTime() - Date.now() < 60 * 86400_000
                : false;
              return (
                <span
                  key={k.skillKey}
                  title={
                    k.certificationExpiresAt
                      ? `Sertifisering går ut ${dato(k.certificationExpiresAt)}`
                      : 'Ingen sertifisering registrert'
                  }
                  className={`inline-flex h-badge items-center gap-1 rounded-badge px-1.5 font-medium text-[11px] ${
                    utloper ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-fg-muted'
                  }`}
                >
                  {k.skillKey}
                  <span className="tabular-nums opacity-70">{k.level}</span>
                </span>
              );
            })}
          </div>
        )}
      </Seksjon>

      <Link
        href={'/mekanikere' as Route}
        className="mx-1 inline-flex items-center gap-1.5 text-[12px] text-fg-muted transition-colors hover:text-fg"
      >
        <ClipboardList size={13} />
        Alle mekanikere
      </Link>
    </>
  );
}

/* Konto / endwise-support */

type KontoData = Extract<Kontekst, { type: 'konto' }>;

const STATUS_TEKST: Record<string, string> = {
  active: 'Aktivt',
  trialing: 'Prøveperiode',
  past_due: 'Betaling mangler',
  canceled: 'Avsluttet',
  incomplete: 'Ikke fullført',
};

/**
 * Endwise-admin ser forhandleren, ikke kundekortet.
 * «Se verkstedet» er URL-lesing under /endwise/verksted/[slug] — ikke setActive.
 */
export function EndwiseForhandlerDetaljer({ navn, slug }: { navn: string; slug: string }) {
  return (
    <>
      <div className="flex flex-col gap-1 rounded-control border border-border bg-bg p-3">
        <p className="truncate text-label text-fg">{navn}</p>
        <p className="truncate font-mono text-[12px] text-fg-muted">{slug}</p>
      </div>
      <Link
        href={'/endwise/forhandlere' as Route}
        className="mx-1 inline-flex items-center gap-1.5 text-[12px] text-fg-muted transition-colors hover:text-fg"
      >
        Alle forhandlere
      </Link>
      <Link
        href={`/endwise/verksted/${slug}/dashboard?fra=innboks` as Route}
        className="flex h-control items-center justify-center rounded-control border border-border bg-bg px-2.5 text-label text-fg transition-colors hover:bg-sidebar-active"
      >
        Se verkstedet
      </Link>
    </>
  );
}

function Kontokontekst({ data }: { data: KontoData }) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-control border border-border bg-bg p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-2 text-fg-muted">
          <CircleUser size={17} strokeWidth={1.75} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-label text-fg">{data.tenantNavn ?? 'Forhandler'}</span>
          <span className="truncate text-[12px] text-fg-muted">
            {data.tenantKind === 'demo' ? 'Demo-konto' : 'Aktiv konto'}
          </span>
        </div>
      </div>

      <Seksjon tittel="Abonnement">
        {data.planKey ? (
          <div className="flex flex-col gap-2 rounded-control border border-border bg-bg p-3">
            <p className="flex items-center gap-2 text-[12px] text-fg">
              <CreditCard size={14} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
              <span className="font-medium text-label capitalize">{data.planKey}</span>
              {data.status && (
                <span
                  className={`inline-flex h-badge items-center rounded-badge px-1.5 font-medium text-[11px] ${
                    data.status === 'active' || data.status === 'trialing'
                      ? 'bg-accent-soft text-accent-strong'
                      : 'bg-warn-soft text-warn'
                  }`}
                >
                  {STATUS_TEKST[data.status] ?? data.status}
                </span>
              )}
            </p>
            {data.currentPeriodEnd && (
              <p className="text-[11px] text-fg-muted tabular-nums">
                Perioden løper til {datoTid(data.currentPeriodEnd)}
              </p>
            )}
          </div>
        ) : (
          <Tom tekst="Ingen abonnementsrad registrert ennå." />
        )}
      </Seksjon>

      <Seksjon tittel="Aktive tillegg" antall={data.moduler.length}>
        {data.moduler.length === 0 ? (
          <Tom tekst="Ingen tillegg aktivert. Basisflatene er alltid med." />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.moduler.map((m) => (
              <span
                key={m}
                className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-1.5 font-medium text-[11px] text-fg-muted"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </Seksjon>

      <div className="flex flex-col gap-1.5">
        <Link
          href={'/abonnement' as Route}
          className="mx-1 inline-flex items-center gap-1.5 text-[12px] text-fg-muted transition-colors hover:text-fg"
        >
          <CreditCard size={13} />
          Abonnement og tillegg
        </Link>
        {/* Grensen mot oss står i klartekst, også her. */}
        <p className="mx-1 flex items-start gap-1.5 text-[11px] text-fg-muted leading-relaxed">
          <MessageSquare size={12} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          Endwise ser kontoopplysningene dine for å kunne hjelpe — aldri innholdet i samtalene dine
          med kunder eller mekanikere.
        </p>
      </div>
    </>
  );
}
