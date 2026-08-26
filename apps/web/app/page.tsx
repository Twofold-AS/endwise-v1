'use client';

import type { Route } from 'next';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import bildeHero from '@/public/images/hero.jpg';
import bildeVerdi from '@/public/images/img_1.jpg';
import bildeSammenheng from '@/public/images/img_2.jpg';
import bildeAvslutning from '@/public/images/img_3.jpg';
import { destinasjonNarSesjonFeiler } from './invitasjon/_landing';

/**
 * Base-ruten «/» — offentlig landingsside.
 * To utfall, ett sted
 * Innlogget → rett videre til din landing (`session.me.landing`): samme
 * regel som innlogging bruker (leder/selger → Dashboard,
 * support → Innboks, mekaniker → Min dag).
 * Utlogget → siden under.
 * Fortsatt bevisst nøktern
 * Siden fikk bilder , men premisset står: eier skal style denne
 * selv, så alt skal være lett å bytte og lett å fjerne.
 * Ingen ikoner i innholdet. Logoen og de fire bildene, ikke mer.
 * Ingen skygger, ingen animasjon, ingen overlegg med tekst oppå bilde.
 * Bilde og tekst står ved siden av hverandre, ikke oppå hverandre — da kan
 * begge byttes uten at det andre knekker.
 * Alt innhold ligger i **datastrukturene øverst** — bilder, verdipunkter,
 * SLIK_HENGER_DET_SAMMEN, pris. Skal teksten eller et bilde endres, endres
 * det der, ikke inne i JSX-en.
 * Den røde tråden i bildene
 * De fire bildene er én serie: samme duotone-rastrering, samme blå/krem, alle
 * 1672×941. Motivet er **arkitektur** — søyler, buer, loggiaer — og det er den
 * tråden seksjonene henger på, i denne rekkefølgen:
 * 1. `hero` — en rotunde utenfra: mange søyler bærer ÉN bue.
 * → «Én plattform.» Bygningen sett fra utsiden.
 * 2. `img_1` — utsikt ut gjennom en bue mot landskap og sjø.
 * → «Hva du får.» Plattformen er rammen; utsikten er driften.
 * 3. `img_2` — en loggia innenfra: flere like buer på rekke, én passasje.
 * → «Slik henger det sammen.» Tre deler, ett bygg.
 * 4. `img_3` — en pergola med tre buer og en fontene. Ankomst, ro.
 * → «Klar til å prøve?» Du er fremme.
 * Utenfra → utsikten → innsiden → ankomsten. Bytter du ett bilde, bytt alt-
 * teksten i samme slengen, ellers ryker tråden for dem som bruker skjermleser.
 * To ting som er lette å ødelegge
 * Bildene er **statiske importer**, ikke strenger. Det er derfor `width`,
 * `height` og uskarp plassholder kommer av seg selv, og derfor et feilstavet
 * filnavn blir en byggefeil i stedet for et hull på en side i produksjon.
 * Filene lå opprinnelig som `.jfif`. De er ekte JPEG-er (magic `ffd8`), men
 * `.jfif` er ikke en kjent bilde-endelse for statiske importer eller for
 * bilde-optimaliseringen. **Døpt om til `.jpg` .** Legger du inn
 * flere bilder: sjekk endelsen først.
 */

/** Ett sted å bytte demo-adressen. */
const DEMO_EPOST = 'hei@endwise.no';
const DEMO_LENKE = `mailto:${DEMO_EPOST}?subject=${encodeURIComponent('Book en demo av Endwise')}`;

/**
 * Bildene — ett sted, i den rekkefølgen de møter leseren.
 * Vil du bytte hvilket bilde en seksjon får: bytt `kilde` her. Ingenting i
 * JSX-en nedenfor kjenner filnavn.
 * `alt` beskriver **motivet**, ikke budskapet. En skjermleserbruker skal få
 * vite hva bildet viser — ikke få markedsføringsteksten lest opp to ganger.
 * Bildene er stemning, ikke informasjon, så ingen av dem bærer noe teksten
 * ikke allerede sier.
 */
type Sidebilde = { kilde: StaticImageData; alt: string };

const BILDER = {
  hero: {
    kilde: bildeHero,
    alt: 'Rastrert illustrasjon i blått og kremhvitt: en rund søylegang der en rekke søyler bærer én sammenhengende bue.',
  },
  verdi: {
    kilde: bildeVerdi,
    alt: 'Rastrert illustrasjon i blått og kremhvitt: utsikt ut gjennom en bue mot sypresser, fjell og sjø.',
  },
  sammenheng: {
    kilde: bildeSammenheng,
    alt: 'Rastrert illustrasjon i blått og kremhvitt: en loggia sett innenfra, med like buer på rekke og statuer på hver side.',
  },
  avslutning: {
    kilde: bildeAvslutning,
    alt: 'Rastrert illustrasjon i blått og kremhvitt: en løvdekt pergola med tre buer og en fontene i forgrunnen.',
  },
} satisfies Record<string, Sidebilde>;

const VERDIPUNKTER: { tittel: string; tekst: string }[] = [
  {
    tittel: 'Fast pris, ubegrenset brukere',
    tekst:
      'Én pris per forhandler i måneden. Legg til så mange ansatte du vil, uten at prisen øker.',
  },
  {
    tittel: 'Nettside og booking inkludert',
    tekst: 'Kunden booker selv, døgnet rundt, rett inn i verkstedkalenderen.',
  },
  {
    tittel: 'AI tar førstelinjen',
    tekst:
      'Tolker kundens problem, foreslår riktig tjeneste, og gir samtalen videre til et menneske når den er usikker.',
  },
  {
    tittel: 'Mekanikeren har alt på mobilen',
    tekst: 'Dagens jobber, statusflyt og offline-støtte i lomma.',
  },
  {
    tittel: 'Snakker med Quick',
    tekst: 'Bookinger og status holdes i sync, ingen dobbeltføring.',
  },
  {
    tittel: 'Bygget for personvern',
    tekst: 'Kundedata i EU, og forhandleren eier sine egne kundesamtaler.',
  },
];

const SLIK_HENGER_DET_SAMMEN: string[] = [
  'Forhandleren styrer alt fra ett dashboard: saker, kunder, kjøretøy og innboks.',
  'Mekanikeren jobber fra mobil-appen.',
  'Kunden booker og følger jobben på nett.',
];

const PRIS = 'Fra 4 490 kr/mnd. Fast pris per forhandler, ubegrenset antall brukere.';

export default function BasePage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  /**
   * `null` = vet ikke ennå. Da tegnes ingenting — en markedsside som blinker
   * innom før en redirect er verre enn et halvsekund med tom skjerm.
   */
  const [utlogget, setUtlogget] = useState<boolean | null>(null);

  useEffect(() => {
    let avbrutt = false;

    void (async () => {
      // Spør serveren, ikke klient-storen. Samme lærdom som dobbel-login-bugen:
      // en tom store betyr «ikke hentet», ikke «ikke innlogget».
      const sesjon = await authClient.getSession().catch(() => null);
      if (avbrutt) return;

      if (!sesjon?.data?.user) {
        setUtlogget(true);
        return;
      }

      // `landing` avhenger av jobbfunksjon og mekanikerprofil — ting klienten
      // ikke kjenner sikkert. Regelen bor på serveren, og bare der.
      // Mangler 2FA-oppsett, svarer serveren TWO_FACTOR_REQUIRED på
      // alle tRPC-ruter. Da skal brukeren til oppsett, ikke til et dashbord der
      // ingenting laster. Samme regel som i `/signin`.
      const landing = await utils.session.me
        .fetch()
        .then((me) => me.landing)
        .catch((error: unknown) => destinasjonNarSesjonFeiler(error));
      if (avbrutt) return;
      router.replace((landing ?? '/dashboard') as Route);
    })();

    return () => {
      avbrutt = true;
    };
  }, [router, utils]);

  if (utlogget !== true) {
    return <main className="min-h-screen bg-bg" aria-busy="true" />;
  }

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-16 px-6 py-16 sm:py-24">
        {/* Avsender */}
        <header className="flex items-center gap-3">
          {/*
           * Samme merkeboks som i sidebaren: liten, svart, hvit logo — i
           * Begge temaer. Logoen er en merkemarkør, ikke en flate som snur.
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
        </header>

        {/* Hero */}
        <section className="flex flex-col gap-5">
          <h1 className="max-w-[16ch] font-semibold text-[34px] text-fg leading-[1.15] tracking-tight sm:text-[44px]">
            Verkstedsystemet for MC, båt og ATV
          </h1>
          <p className="max-w-[52ch] text-body text-fg-muted leading-relaxed">
            Én plattform for booking, kunder, mekanikere og AI – bygget for verksteder, ikke
            tilpasset fra noe annet.
          </p>
          {/*
           * Bildet står mellom løftet og handlingen: du leser hva det er, ser
           * bygningen, og får så knappene. Motsatt rekkefølge ville skjøvet
           * «Logg inn» under skjermkanten på mobil.
           */}
          <Bildefelt bilde={BILDER.hero} format="hero" prioritet />
          <Knapper />
        </section>

        {/* Verdipunkter */}
        <section className="flex flex-col gap-6">
          <h2 className="text-label text-fg-muted">Hva du får</h2>
          <Bildefelt bilde={BILDER.verdi} format="stripe" />
          {/*
          * En liste, ikke ikon-kort. Seks kort med hver sin illustrasjon
          * ville tatt tre skjermhøyder og sagt det samme. To spalter over `sm`
          * er den eneste layout-finessen på hele siden.

          * Og derfor har verdipunktene heller ikke ett bilde hver: det er
          * seks punkter og tre bilder, og seks små illustrasjoner ville blitt
          * nettopp det ikon-rutenettet vi valgte bort. Bildet hører til
          * Seksjonen, ikke til punktet.
          */}
          <ul className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {VERDIPUNKTER.map((v) => (
              <li key={v.tittel} className="flex flex-col gap-1.5">
                <h3 className="text-label text-fg">{v.tittel}</h3>
                <p className="text-body text-fg-muted leading-relaxed">{v.tekst}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Slik henger det sammen */}
        <section className="flex flex-col gap-4">
          <h2 className="text-label text-fg-muted">Slik henger det sammen</h2>
          {/*
           * Loggiaen: like buer på rekke, én passasje gjennom. Tre linjer
           * tekst under, tre deler av samme system.
           */}
          <Bildefelt bilde={BILDER.sammenheng} format="stripe" />
          <ul className="flex flex-col gap-2.5">
            {SLIK_HENGER_DET_SAMMEN.map((linje) => (
              <li key={linje} className="text-body text-fg leading-relaxed">
                {linje}
              </li>
            ))}
          </ul>
        </section>

        {/* Pris */}
        <section className="flex flex-col gap-3 border-border border-t pt-8">
          <h2 className="text-label text-fg-muted">Pris</h2>
          <p className="max-w-[52ch] text-body text-fg leading-relaxed">{PRIS}</p>
        </section>

        {/* Avslutning */}
        <section className="flex flex-col gap-5 border-border border-t pt-8">
          <h2 className="font-semibold text-fg text-xl tracking-tight">Klar til å prøve?</h2>
          <p className="text-body text-fg-muted">Logg inn eller book en demo.</p>
          {/*
           * Siste bilde: pergolaen. Slutten på tråden — du er fremme, og det
           * eneste som gjenstår er de to knappene.
           */}
          <Bildefelt bilde={BILDER.avslutning} format="stripe" />
          <Knapper />
        </section>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-fg-muted">
          <span>Har du ikke konto? Verkstedet ditt oppretter brukeren din.</span>
          {/*
           * Diskret, i footeren. Veikartet er for den som allerede er
           * interessert — det skal ikke konkurrere med «Logg inn».
           */}
          <Link href={'/veikart' as Route} className="underline underline-offset-2 hover:text-fg">
            Veikart
          </Link>
        </footer>
      </div>
    </main>
  );
}

/**
 * Ett bilde på siden. Definert ÉN gang, brukt fire steder.
 * To formater, og forskjellen er hierarki
 * `hero` = 16:9. Hovedbildet, øverst, og det eneste som får ta plass.
 * `stripe` = 21:9. Et smalt bånd. Samme bilde, hardere beskjært, så seksjons-
 * bildene støtter teksten i stedet for å konkurrere med hero.
 * Fire like høye bilder nedover en 720px-spalte hadde lest som et galleri, og
 * da ville ingen av dem betydd noe. Ett stort og tre bånd har en tydelig topp.
 * Hvorfor det ser slik ut
 * `fill` + `object-cover` — bildene er 1672×941, mye bredere enn spalten.
 * Uten beskjæring ville 21:9-båndet blitt en klemt 16:9.
 * `sizes` er ekte: spalten er maks 720px minus 24px padding på hver side =
 * 672px. Et løgnaktig `sizes` (f.eks. `100vw`) laster ned et bilde som er
 * dobbelt så stort som det som vises, på hver eneste mobil.
 * Rammen er `border-border`, som snur med temaet av seg selv. Bildene er
 * kremhvite og lyse; uten en hårlinje flyter de ut i den lyse bakgrunnen.
 * Uskarp plassholder kommer gratis fra den statiske importen. Filene er
 * ~900 kB hver, og uten den ville seksjonene hoppet fram som hvite hull.
 * Ingen tekst oppå bildene, med vilje: da måtte kontrasten holdt mot begge
 * temaene og mot et motiv som er lyst i midten. Tekst ved siden av bildet er
 * ett problem mindre og gjør at eier kan bytte bilde uten å teste lesbarhet.
 */
function Bildefelt({
  bilde,
  format,
  prioritet = false,
}: {
  bilde: Sidebilde;
  format: 'hero' | 'stripe';
  prioritet?: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-border bg-surface-2 ${
        format === 'hero' ? 'aspect-[16/9]' : 'aspect-[21/9]'
      }`}
    >
      <Image
        src={bilde.kilde}
        alt={bilde.alt}
        fill
        placeholder="blur"
        // Hero lastes med én gang (det er det første du ser). Båndene lenger
        // nede lastes dovent — standarden, altså ingen `priority`.
        priority={prioritet}
        sizes="(max-width: 768px) 100vw, 672px"
        className="object-cover"
      />
    </div>
  );
}

/**
 * De to handlingene, definert ÉN gang og brukt to steder.
 * Rene lenker, ikke `StatefulButton`: de navigerer, de endrer ingen tilstand.
 * En knapp med lastetilstand ville lovet noe som ikke skjer, og gjort det
 * vanskeligere å restyle enn en `<a>` med to klasser.
 */
function Knapper() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={'/signin' as Route}
        className="inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
      >
        Logg inn
      </Link>
      <a
        href={DEMO_LENKE}
        className="inline-flex h-control items-center rounded-control border border-border px-4 text-label text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        Book en demo
      </a>
    </div>
  );
}
