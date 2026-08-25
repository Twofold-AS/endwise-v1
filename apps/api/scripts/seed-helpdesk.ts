import { type Database, type HelpdeskKategori, schema } from '@endwise/db';

/**
 * F5-23 — BASISARTIKLENE i helpdesken.
 *
 * ⚠️ Egen fil, ikke enda en blokk i `seed.ts` (som allerede er 1300 linjer).
 * Artiklene er GLOBALE — ingen `tenant_id` — så de hører ikke hjemme i
 * per-tenant-løkkene der uansett.
 *
 * ⚠️ Idempotent på `slug`: kjører du `db:seed` to ganger, oppdateres artikkelen
 * i stedet for å dupliseres. Slug er nettopp derfor utledet av tittelen én gang
 * og deretter fast — den er lenka.
 *
 * ⛔ Bildene er de fire som ligger i `apps/web/public/images/`. Seks artikler
 * deler fire bilder, så to gjentas. Det er en MIDLERTIDIG tilstand i påvente av
 * ekte opplasting (se `schema/helpdesk.ts`), ikke et designvalg.
 *
 * `publishedAt` settes med synkende alder, slik at «de 4 nyeste» i sidebarens
 * slider faktisk har noe å velge mellom.
 */
type Artikkel = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  image: string;
  category: HelpdeskKategori;
  dagerSiden: number;
};

/** Avsnitt skrives som liste og settes sammen — lettere å lese i kildekoden. */
const avsnitt = (...deler: string[]) => deler.join('\n\n');

const ARTIKLER: Artikkel[] = [
  {
    slug: 'kom-i-gang-med-innboksen',
    title: 'Kom i gang med innboksen',
    summary: 'Kunder, mekanikere og Endwise i samme innboks — tre parter, samme trådmodell.',
    image: '/images/img_1.jpg',
    category: 'brukerguide',
    dagerSiden: 1,
    body: avsnitt(
      'Innboksen samler tre typer samtaler på ett sted: med KUNDER, INTERNT med mekanikerne dine, og med ENDWISE. Knappene øverst i samtalelista filtrerer mellom dem. Trykker du på den som allerede er valgt, går du tilbake til «Alle».',
      'Alle tre er samme trådmodell — det er bare deltakerne som er ulike. Derfor svarer du likt overalt, og en samtale kan ikke havne i «feil» innboks.',
      'Kanalmerket foran hver rad viser hvordan samtalen kom inn: app, SMS, e-post eller widget. Det avgjør hvordan svaret ditt går ut, så det står først på raden og ikke gjemt bak en knapp. Bytter en samtale kanal underveis, sier lista fra.',
      'Til høyre ligger Detaljer-panelet, som viser hva samtalen handler om — kunden med kjøretøyene sine, eller mekanikeren med dagens belastning. Panelet kan lukkes, og valget følger kontoen din til neste innlogging.',
    ),
  },
  {
    slug: 'slik-fungerer-tjenestekatalogen',
    title: 'Slik fungerer tjenestekatalogen',
    summary:
      'Prisene dine er versjonert. Endrer du en pris i dag, står fjorårets faktura fortsatt riktig.',
    image: '/images/img_2.jpg',
    category: 'booking',
    dagerSiden: 3,
    body: avsnitt(
      'Tjenestekatalogen ligger under Innstillinger og inneholder tjenestene KUNDEN kan bestille hos deg: EU-kontroll, liten service, og det du ellers tilbyr. Hver tjeneste har en varighet, en pris og eventuelle ferdigheter jobben krever.',
      'Det viktigste å vite: en endring lager en NY VERSJON. Den gamle lukkes, men slettes aldri. Bookinger som allerede er gjort peker på versjonen som gjaldt da de ble bestilt, så en prisjustering i dag endrer ikke det kunden ble lovet i fjor. Derfor heter knappen «Ny versjon» og ikke «Lagre».',
      'Lar du prisfeltet stå tomt, betyr det «pris på forespørsel» — ikke null kroner. Det er en reell forskjell for en jobb som faktureres etter medgått tid.',
      'Ferdigheter velges fra kompetanseregisteret og ikke som fritekst. Grunnen er praktisk: matchingen som finner en ledig mekaniker leter etter nøyaktig disse nøklene, og en skrivefeil ville gitt en tjeneste ingen mekaniker matcher — uten at noe sier fra.',
      'Slutter du å tilby noe, deaktiverer du det. Da forsvinner det fra nye saker, men historikken består, og du kan slå det på igjen.',
    ),
  },
  {
    slug: 'tofaktor-og-hvorfor-den-ikke-kan-slas-av',
    title: 'Tofaktor, og hvorfor den ikke kan slås av',
    summary:
      'Alle forhandlerkontoer krever engangskode i tillegg til passord. Det finnes ingen «husk denne enheten».',
    image: '/images/img_3.jpg',
    category: 'brukerguide',
    dagerSiden: 6,
    body: avsnitt(
      'Alle som jobber i et verksted — leder, selger, support og mekaniker — logger inn med passord OG en engangskode på e-post. Kun sluttkunder er unntatt.',
      'Det finnes med vilje ingen «husk denne enheten»-avkrysning. En slik knapp gjør tofaktor til noe man har hatt én gang, og verkstedsmaskiner er ofte delt mellom flere.',
      'Setter du opp tofaktor for første gang, blir du bedt om det før du slipper inn — ikke etterpå. Og i det tofaktor slås på, logges alle eksisterende økter ut. Det er tilsiktet: en økt som ble opprettet før sikringen, skal ikke overleve den.',
      'Blir du logget ut etter en time uten aktivitet, er også det med vilje.',
    ),
  },
  {
    slug: 'inviter-en-ansatt',
    title: 'Inviter en ansatt',
    summary:
      'Send en engangslenke fra Team & tilgang. Den ansatte setter passord selv, og går rett gjennom tofaktor.',
    image: '/images/hero.jpg',
    category: 'brukerguide',
    dagerSiden: 9,
    body: avsnitt(
      'Under Innstillinger › Team & tilgang inviterer du en ny ansatt med e-post og jobbfunksjon. Lenka som sendes er personlig, gyldig i sju dager, og kan bare brukes én gang.',
      'Den ansatte setter navn og passord selv. Vi oppretter aldri en konto med et passord du har valgt for noen andre.',
      'Jobbfunksjonen — selger, support eller mekaniker — styrer HVOR i produktet den ansatte lander etter innlogging, ikke hva de har lov til. Tilgangen er den samme for alle ansatte; det er dagens arbeid som er forskjellig.',
      'Angrer du, kan invitasjonen tilbakekalles fra samme flate helt til den er brukt.',
    ),
  },
  {
    slug: 'lageret-og-hva-tilgjengelig-betyr',
    title: 'Lageret: hva «tilgjengelig» faktisk betyr',
    summary:
      'Tilgjengelig = på lager minus reservert. Det er tallet som gjelder når du lover en kunde en dato.',
    image: '/images/img_1.jpg',
    category: 'lager',
    dagerSiden: 13,
    body: avsnitt(
      'Lageret er en egen kontekst i menyen øverst til venstre, med deler, lokasjoner og bevegelser. Det er kjernefunksjonalitet — alle forhandlere har det, uavhengig av abonnement.',
      'Kolonnen «Tilgjengelig» er ikke det samme som antallet på hylla. Den er antall på lager MINUS det som allerede er reservert til en sak. Det er tilgjengelig-tallet du skal love bort.',
      'Hver bevegelse inn eller ut lagres med hvem som gjorde den og hvorfor. Det er ikke overvåkning — det er det som gjør at en telling som ikke stemmer, kan spores.',
      'Minimumsnivå per del gir varsel når beholdningen faller under. Sett det på de delene der en tom hylle stopper en jobb, ikke på alt.',
    ),
  },
  {
    slug: 'avataren-din',
    title: 'Avataren din',
    summary:
      'Ansiktet ved siden av navnet ditt lages av kontoen din. Du kan endre form, farge og tone.',
    image: '/images/img_2.jpg',
    category: 'brukerguide',
    dagerSiden: 16,
    body: avsnitt(
      'Alle personer i Endwise får et lite geometrisk ansikt ved siden av navnet — i innboksen, på kundekortet og nederst i sidebaren. Det er ikke et bilde du laster opp; det regnes ut fra kontoen din, og blir det samme hver gang.',
      'Poenget er gjenkjennelse i en liste. To mekanikere som begge forkortes «MH» får ulike ansikter, mens initialer ville gitt dem samme rute.',
      'Vil du endre ditt eget, ligger valgene under Profil: form, farge og tone. Alt du ikke velger, utledes fra kontoen din. Endringen følger DEG, ikke arbeidsplassen — jobber du hos to forhandlere, tar du ansiktet med deg.',
      'Kunder får også et ansikt, men velger det ikke selv.',
    ),
  },
];

export async function seedHelpdesk(db: Database): Promise<number> {
  for (const [i, a] of ARTIKLER.entries()) {
    const publisert = new Date(Date.now() - a.dagerSiden * 86_400_000);
    await db
      .insert(schema.helpdeskArticles)
      .values({
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        body: a.body,
        image: a.image,
        category: a.category,
        published: true,
        publishedAt: publisert,
        sortOrder: ARTIKLER.length - i,
      })
      .onConflictDoUpdate({
        target: schema.helpdeskArticles.slug,
        set: {
          title: a.title,
          summary: a.summary,
          body: a.body,
          image: a.image,
          category: a.category,
          publishedAt: publisert,
          sortOrder: ARTIKLER.length - i,
          updatedAt: new Date(),
        },
      });
  }
  return ARTIKLER.length;
}
