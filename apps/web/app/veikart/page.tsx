import type { Metadata, Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Offentlig veikart — `/veikart`.
 * Hvem den er for
 * Forhandlere, ikke utviklere. Derfor ingen F-koder, ingen fasenavn, ingen
 * teknisk sjargong. «F6-17 kontekstpanel med diskriminert union» blir «Du ser
 * hvem kunden er mens du svarer».
 * Hvordan Endwise oppdaterer denne
 * Alt innhold ligger i `VEIKART` rett under. Legg til, flytt eller fjern
 * punkter der — JSX-en trenger aldri å røres. Oppdater også `SIST_OPPDATERT`,
 * ellers ser lista fersk ut lenge etter at den har sluttet å være det.
 * Regelen for hva som får stå hvor
 * «Nylig lansert» = det forhandleren kan bruke I dag. «Underveis» = arbeid som
 * faktisk pågår. «Planlagt» = alt annet, inkludert det som avhenger av
 * beslutninger vi ikke har tatt.
 * Et punkt som er blokkert eller uavklart hører i **Planlagt** med nøktern
 * ordlyd — aldri i «Underveis» for å se mer produktiv ut. En forhandler som
 * planlegger driften rundt et løfte vi ikke holder, har vi skadet, ikke solgt
 * til. Se `docs/endwise-roadmap.html` for den interne statusen dette speiler.
 * Design
 * Samme nakne stil som «/»: overskrift + liste, ingen ikoner, ingen kort,
 * ingen animasjon. Eier styler begge sidene samtidig senere.
 */
export const metadata: Metadata = {
  title: 'Veikart · Endwise',
  description: 'Hva som er lansert i Endwise, hva vi jobber med, og hva som kommer.',
};

/** Vises øverst. Oppdater når lista endres. */
const SIST_OPPDATERT = '9. august 2026';

type Punkt = { tittel: string; tekst: string };
type Bolk = { overskrift: string; ingress: string; punkter: Punkt[] };

const VEIKART: Bolk[] = [
  {
    overskrift: 'Nylig lansert',
    ingress: 'Dette kan du bruke i dag.',
    punkter: [
      {
        tittel: 'Booking og saker',
        tekst:
          'Opprett og følg en sak fra forespørsel til ferdig, med status, mekaniker og pris på plass.',
      },
      {
        tittel: 'Kalender for verkstedet',
        tekst: 'Dag- og ukevisning med jobbene lagt ut per mekaniker eller samlet.',
      },
      {
        tittel: 'Kunde- og kjøretøyregister',
        tekst:
          'Søk opp en kunde eller et registreringsnummer og se kjøretøy, historikk og meldinger samlet.',
      },
      {
        tittel: 'Oppslag mot Statens vegvesen',
        tekst: 'Skriv inn regnr og få merke, modell, årsmodell og EU-frist rett inn i kortet.',
      },
      {
        tittel: 'Innboks med kunde- og internchat',
        tekst:
          'Én innboks for kundesamtaler, interne meldinger og Endwise-support. Nye meldinger dukker opp med én gang.',
      },
      {
        tittel: 'Du ser hvor meldingen kom fra',
        tekst: 'Hver samtale er merket med kanal, så du vet om svaret skal ut på SMS eller e-post.',
      },
      {
        tittel: 'Kunden i sidepanelet',
        tekst: 'Mens du svarer ser du kjøretøy, åpne saker og historikk — uten å forlate samtalen.',
      },
      {
        tittel: 'Mekaniker-app på mobil',
        tekst:
          'Dagens jobber, start og fullfør, avviksmelding og offline-støtte. Fungerer i verkstedhallen uten dekning.',
      },
      {
        tittel: 'Lager',
        tekst: 'Deler, lokasjoner og beholdning, med varsel når noe går under minimumsnivå.',
      },
      {
        tittel: 'Roller og jobbfunksjoner',
        tekst: 'Leder, selger, support og mekaniker. Hver enkelt lander der jobben deres begynner.',
      },
      {
        tittel: 'Abonnement og tillegg',
        tekst: 'Fast pris per forhandler, med valgfrie tillegg du kan legge til underveis.',
      },
    ],
  },
  {
    overskrift: 'Underveis',
    ingress: 'Arbeid som pågår nå.',
    punkter: [
      {
        tittel: 'Velge mottaker i meldinger',
        tekst:
          'I dag starter du en samtale med kolleger du allerede deler tråd med. Vi bygger en ordentlig personvelger.',
      },
      {
        tittel: 'E-post og SMS rett i innboksen',
        tekst:
          'Grunnlaget er på plass. Neste steg er at kundens e-post havner i riktig samtale, og at svaret går ut samme vei.',
      },
      {
        tittel: 'Booking på din egen nettside',
        tekst:
          'Bookingwidgeten kjører mot ekte data. Vi jobber med de siste stegene og oppsettet i Framer.',
      },
      {
        tittel: 'Quick-synk',
        tekst:
          'Kunder og bookinger holdes i sync mot Quick. Vi utvider dekningen og rydder i konflikthåndteringen.',
      },
      {
        tittel: 'AI-diagnose',
        tekst:
          'Assistenten tolker symptomer og foreslår riktig tjeneste. Vi finpusser treffsikkerheten før den slippes bredt.',
      },
      {
        tittel: 'Analyse',
        tekst: 'Flaten finnes, men tallene er ennå ikke koblet til ekte drift. Det er neste steg.',
      },
    ],
  },
  {
    overskrift: 'Planlagt',
    ingress: 'På listen, ikke påbegynt. Rekkefølgen kan endre seg.',
    punkter: [
      {
        tittel: '«Min side» for kunden',
        tekst:
          'Kunden logger inn og ser egne kjøretøy, servicehistorikk og EU-frister på ett sted.',
      },
      {
        tittel: 'Invitere ansatte selv',
        tekst: 'I dag oppretter vi brukerne. Målet er at du inviterer kollegene dine direkte.',
      },
      {
        tittel: 'Varselsenter',
        tekst: 'Én samlet oversikt over det som venter på deg, i stedet for spredte påminnelser.',
      },
      {
        tittel: 'Nyhetsbrev til egne kunder',
        tekst: 'Send ut sesongpåminnelser og tilbud fra kunderegisteret ditt.',
      },
      {
        tittel: 'Avanserte rapporter',
        tekst: 'Dypere tall på belegg, inntjening og leveringstid.',
      },
      {
        tittel: 'Betaling ved booking',
        tekst:
          'Forskuddsbetaling i widgeten. Vi har ikke landet valget av betalingsleverandør ennå, så vi setter ingen dato.',
      },
      {
        tittel: 'Nettbutikk',
        tekst:
          'Salg av deler og tilbehør på nett. Dette avhenger av en plattformbeslutning vi ikke har tatt, og er derfor uten tidsanslag.',
      },
      {
        tittel: 'Deling mellom verksteder',
        tekst:
          'Å dele rutiner og servicehistorikk på tvers av forhandlere reiser juridiske spørsmål vi må avklare først. Ingenting deles uten at det er avklart.',
      },
    ],
  },
];

export default function VeikartPage() {
  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-14 px-6 py-16 sm:py-24">
        {/* Avsender */}
        <header className="flex items-center gap-3">
          <Link href={'/' as Route} className="flex items-center gap-3">
            {/*
             * Samme merkeboks som ellers: liten, svart, hvit logo — i begge
             * temaer. Logoen er en merkemarkør, ikke en flate som snur.
             */}
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-black">
              <Image
                src="/logo/logo.svg"
                alt=""
                width={18}
                height={18}
                priority
                className="logo-on-dark"
                style={{ height: 'auto' }}
              />
            </span>
            <span className="text-label text-fg">Endwise</span>
          </Link>
        </header>

        {/* Tittel */}
        <section className="flex flex-col gap-4">
          <h1 className="font-semibold text-[34px] text-fg leading-[1.15] tracking-tight sm:text-[40px]">
            Veikart
          </h1>
          <p className="max-w-[54ch] text-body text-fg-muted leading-relaxed">
            Hva som er lansert, hva vi jobber med nå, og hva som står for tur. Vi setter ikke datoer
            på ting vi ikke er sikre på — det er lettere å forholde seg til enn et løfte som ryker.
          </p>
          <p className="text-[12px] text-fg-muted">Sist oppdatert {SIST_OPPDATERT}</p>
        </section>

        {/* Bolkene */}
        {VEIKART.map((bolk) => (
          <section
            key={bolk.overskrift}
            className="flex flex-col gap-6 border-border border-t pt-10"
          >
            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-fg text-xl tracking-tight">{bolk.overskrift}</h2>
              <p className="text-body text-fg-muted">{bolk.ingress}</p>
            </div>

            {/* En liste, ikke kort. Se filkommentaren. */}
            <ul className="flex flex-col gap-6">
              {bolk.punkter.map((p) => (
                <li key={p.tittel} className="flex flex-col gap-1.5">
                  <h3 className="text-label text-fg">{p.tittel}</h3>
                  <p className="max-w-[62ch] text-body text-fg-muted leading-relaxed">{p.tekst}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* Tilbake */}
        <footer className="flex flex-wrap items-center gap-4 border-border border-t pt-8 text-[12px] text-fg-muted">
          <Link href={'/' as Route} className="underline underline-offset-2 hover:text-fg">
            Tilbake til forsiden
          </Link>
          <Link href={'/signin' as Route} className="underline underline-offset-2 hover:text-fg">
            Logg inn
          </Link>
        </footer>
      </div>
    </main>
  );
}
