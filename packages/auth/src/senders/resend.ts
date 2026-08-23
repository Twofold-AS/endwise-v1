import { Resend } from 'resend';
import { LOGO_EPOST_CID, LOGO_EPOST_FILNAVN, LOGO_EPOST_PNG_BASE64 } from '../assets/logo-epost.ts';
import { authEnv } from '../env.ts';
import { byggEpostHtml, knapp, kodeboks, meldingsboks } from './epost-mal.ts';

/** F1-11 — e-post-2FA og auth-eposter går via Resend (techstack §5). */
let client: Resend | undefined;

function getClient(): Resend {
  if (!client) client = new Resend(authEnv.resend.apiKey);
  return client;
}

/**
 * ⚠️ **AVSENDERDOMENET ER IKKE `endwise.no`.**
 *
 * Feilen som sto 22.08.2026, og som er lett å gjøre igjen: domenet som er
 * verifisert i Resend heter **`no-reply.endwise.no`** — et subdomene. En
 * `from` på `no-reply@endwise.no` er derfor en adresse på APEX-domenet, som
 * ikke er verifisert, og Resend svarer:
 *
 *   403 validation_error — «The endwise.no domain is not verified»
 *
 * De to strengene ser nesten like ut (`no-reply@endwise.no` mot
 * `no-reply@no-reply.endwise.no`), og feilen rammer ALLE auth-e-poster
 * samtidig: engangskode, passordreset og invitasjon. Verifiser mot
 * `GET https://api.resend.com/domains` før du endrer `RESEND_FROM`.
 */
function feilmeldingFra(error: {
  name?: string;
  message?: string;
  /** ⚠️ Resend typer denne som `number | null`, ikke `number | undefined`. */
  statusCode?: number | null;
}): string {
  /**
   * ⚠️ Hele feilen, ikke bare `message`. `name` (`validation_error`,
   * `missing_api_key`, `restricted_api_key`, `rate_limit_exceeded` …) og
   * statuskoden er det som skiller «domenet er ikke verifisert» fra «nøkkelen
   * mangler send-rettighet» — to helt ulike fikser med nokså lik ordlyd.
   */
  const deler = [
    error.name ? `[${error.name}]` : null,
    error.statusCode ? `HTTP ${error.statusCode}` : null,
    error.message ?? 'ukjent feil',
  ].filter(Boolean);
  return deler.join(' ');
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  /** Valgfri HTML-del. Settes den, legges logoen ved som inline `cid:`-vedlegg. */
  html?: string;
  /** Hvor et svar skal gå, når det ikke er avsenderadressen. Se `sendInboxMessage`. */
  replyTo?: string;
  /**
   * Resends egen idempotensnøkkel. Vår DB-vakt er beltet, denne er selen —
   * samme oppsett som `toolkit-resend` bruker for varsler (F3-04).
   */
  idempotencyKey?: string;
}): Promise<string | undefined> {
  const { data, error } = await getClient().emails.send({
    from: authEnv.resend.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(input.idempotencyKey ? { headers: { 'Idempotency-Key': input.idempotencyKey } } : {}),
    ...(input.html
      ? {
          html: input.html,
          /**
           * Logoen som INLINE vedlegg, ikke som `data:`-URI i `src` — Gmail og
           * Outlook fjerner sistnevnte. `contentId` gjør at Resend sender den
           * med `Content-Disposition: inline`, og HTML-en refererer den som
           * `cid:endwise-logo`. Se `assets/logo-epost.ts`.
           */
          attachments: [
            {
              content: LOGO_EPOST_PNG_BASE64,
              filename: LOGO_EPOST_FILNAVN,
              contentType: 'image/png',
              contentId: LOGO_EPOST_CID,
            },
          ],
        }
      : {}),
  });
  if (error) throw new Error(`Resend feilet: ${feilmeldingFra(error)}`);
  return data?.id;
}

/**
 * F1-11 — LOKAL LEVERANSE av engangskoden.
 *
 * ── ⚠️ Problemet dette løser ─────────────────────────────────────────────
 * 12.08.2026 ble 2FA gjort obligatorisk server-side for alle roller unntatt
 * `customer`. Uten dette hadde vi låst oss selv ute av vår egen dev-maskin i
 * samme slengen: `RESEND_API_KEY` er ikke satt lokalt, så koden ville aldri
 * kommet noe sted, og ingen kunne logget inn.
 *
 * ── ⛔ Regelen, og hvorfor den er formulert slik ─────────────────────────
 * Koden skrives til serverloggen **kun** når BEGGE er sanne:
 *   1. `NODE_ENV !== 'production'`
 *   2. `RESEND_API_KEY` mangler
 *
 * Betingelse 2 er den viktige. Med bare betingelse 1 ville en feilsatt
 * `NODE_ENV` i et prod-miljø vært nok til at engangskoder havnet i en
 * driftslogg — og en logg er ikke en hemmelighet: den leses av flere, samles
 * opp hos leverandøren, og overlever lenger enn koden gjør. Med begge må man
 * både kjøre i ikke-prod OG ha fjernet nøkkelen for at det skal skje.
 *
 * ⛔ **Ingen dev-endepunkt.** Vurdert og valgt bort: et endepunkt som spytter
 * ut siste engangskode er én feilkonfigurasjon unna å være en bakdør i
 * produksjon. En `console.warn` kan ikke kalles utenfra.
 *
 * ⛔ **Ingen fallback i prod.** Mangler nøkkelen der, kaster `sendEmail` — og
 * innloggingen feiler LUKKET. Å la den passere ville betydd 2FA uten andre
 * faktor, altså akkurat hullet vi tetter.
 */
function skalLeggesILogg(): boolean {
  const erProd = process.env.NODE_ENV === 'production';
  const harResend = Boolean(process.env.RESEND_API_KEY);
  return !erProd && !harResend;
}

/**
 * Skriver en hemmelighet i en ramme i serverloggen. Brukes av BÅDE
 * engangskoden (F1-11) og invitasjonslenka (F1-10) — én implementasjon, så
 * regelen over ikke kan bli formulert ulikt to steder.
 */
function devRamme(tittel: string, linjer: Array<[string, string]>, fotnote: string): void {
  const bredde = 68;
  const kant = '─'.repeat(bredde);
  const pad = (s: string) => s.padEnd(bredde - 2);
  console.warn(
    [
      '',
      `┌${kant}┐`,
      `│ ${pad(tittel)} │`,
      `├${kant}┤`,
      ...linjer.map(([etikett, verdi]) => `│ ${pad(`${etikett.padEnd(7)}${verdi}`)} │`),
      `│ ${pad(fotnote)} │`,
      `└${kant}┘`,
      '',
    ].join('\n'),
  );
}

function devLevering(to: string, otp: string): boolean {
  if (!skalLeggesILogg()) return false;
  devRamme(
    'ENGANGSKODE (KUN DEV — Resend er ikke konfigurert)',
    [
      ['Til:', to],
      ['Kode:', otp],
    ],
    'Gyldig i 5 minutter.',
  );
  return true;
}

export async function sendTwoFactorOtp(to: string, otp: string): Promise<void> {
  if (devLevering(to, otp)) return;

  const fotnote =
    'Har du ikke bedt om denne koden, kan noen ha passordet ditt. Bytt det med én gang, og si fra til oss.';

  await sendEmail({
    to,
    subject: `${otp} er engangskoden din til Endwise`,
    /**
     * ⚠️ Ren tekst sendes ALLTID ved siden av HTML-en. Noen leser e-post i
     * klienter uten HTML, noen har slått den av, og noen filtre stripper den.
     * En engangskode som bare finnes i markupen, finnes ikke for dem.
     */
    text: [
      `Din engangskode til Endwise er ${otp}.`,
      '',
      'Koden er gyldig i 5 minutter og kan brukes én gang.',
      '',
      fotnote,
    ].join('\n'),
    html: byggEpostHtml({
      tittel: 'Engangskode til Endwise',
      // ⚠️ Koden står også her, fordi dette er forhåndsvisningsteksten i
      // innboksen — mange skriver den av uten å åpne e-posten.
      ingress: `Koden din er ${otp}. Den er gyldig i 5 minutter og kan brukes én gang.`,
      innhold: kodeboks(otp),
      fotnote,
    }),
  });
}

/**
 * F1-16 — RESETLENKE FOR PASSORD.
 *
 * ⚠️ Lenka INNEHOLDER tokenet, og tokenet ER nøkkelen til kontoen. Den er
 * derfor like hemmelig som en engangskode og følger nøyaktig samme regel som
 * invitasjonen: i loggen kun når vi ikke er i prod OG Resend mangler.
 *
 * ── ⛔ Denne kan IKKE feile lukket, og det er RIKTIG ─────────────────────
 * Invitasjonen over feiler lukket: kaster `sendEmail`, får lederen se det.
 * Her er det motsatt, og forskjellen er verdt å forstå før noen «retter» den.
 *
 * Better-Auth kaller denne gjennom `runInBackgroundOrAwait`, altså **etter**
 * at `/request-password-reset` allerede har svart 200. En feil her havner i
 * serverloggen og påvirker ikke svaret. Målt 22.08.2026: med en Resend-nøkkel
 * som ikke får sende fra domenet, svarte endepunktet 200 mens loggen viste
 * «Failed to run background task: Resend feilet: … domain is not verified».
 *
 * ⛔ **Å gjøre den lukket ville vært et enumereringshull.** Sendingen skjer
 * bare for adresser som FINNES. Lot vi feilen slå gjennom til svaret, ville
 * en ukjent adresse gitt 200 og en kjent adresse gitt 500 — og da har
 * endepunktet fortalt en fremmed nøyaktig det hele flyten er bygget for å
 * skjule. Se enumereringskommentaren i `auth.ts`.
 *
 * ⚠️ Prisen er reell: en ødelagt e-postoppsett er USYNLIG for brukeren, som
 * bare ser «sjekk e-posten din» og venter på noe som aldri kommer. Det er
 * derfor feilen må være høylytt i loggen — og derfor levering er noe som må
 * overvåkes (F0-14), ikke noe brukeren kan oppdage for oss.
 *
 * ⚠️ **Lokalt:** `skalLeggesILogg()` krever at nøkkelen MANGLER. Står det en
 * nøkkel i `.env` som ikke kan sende fra `endwise.no`, får du verken e-post
 * eller logglinje. Fjern `RESEND_API_KEY` for å teste flyten i dev.
 */
export async function sendPasswordReset(input: {
  to: string;
  lenke: string;
  utloper: Date;
}): Promise<void> {
  const klokkeslett = input.utloper.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (skalLeggesILogg()) {
    devRamme(
      'PASSORDRESET (KUN DEV — Resend er ikke konfigurert)',
      [
        ['Til:', input.to],
        ['Lenke:', input.lenke],
      ],
      `Gyldig til kl. ${klokkeslett}. Kan brukes én gang.`,
    );
    return;
  }

  const fotnote =
    'Har du ikke bedt om dette, kan du se bort fra e-posten. Passordet ditt er uendret så lenge lenken ikke brukes.';

  await sendEmail({
    to: input.to,
    subject: 'Tilbakestill passordet ditt i Endwise',
    text: [
      'Hei!',
      '',
      'Noen har bedt om å tilbakestille passordet til Endwise-kontoen din.',
      '',
      'Åpne lenken for å velge et nytt passord:',
      input.lenke,
      '',
      `Lenken kan brukes én gang og er gyldig til kl. ${klokkeslett}.`,
      '',
      'Når passordet er byttet, blir du logget ut på alle enheter og må logge',
      'inn på nytt — med engangskode, som vanlig.',
      '',
      fotnote,
    ].join('\n'),
    html: byggEpostHtml({
      tittel: 'Velg nytt passord',
      ingress: `Lenken kan brukes én gang og er gyldig til kl. ${klokkeslett}. Når passordet er byttet, blir du logget ut på alle enheter.`,
      innhold: knapp(input.lenke, 'Velg nytt passord'),
      fotnote,
    }),
  });
}

/**
 * F1-10 — INVITASJONSLENKE.
 *
 * ⚠️ Lenka INNEHOLDER tokenet. Den er derfor like hemmelig som en engangskode,
 * og følger nøyaktig samme regel: i loggen kun når vi ikke er i prod OG Resend
 * mangler. I prod uten Resend kaster `sendEmail` — invitasjonen feiler LUKKET,
 * i stedet for at lederen tror den er sendt.
 *
 * ⚠️ Merk kontrasten til `sendPasswordReset` rett over: DEN kan ikke feile
 * lukket, fordi et ærlig feilsvar der ville avslørt om adressen finnes.
 * Invitasjonen har ikke det problemet — mottakeren er valgt av lederen, som
 * allerede vet hvem hen inviterte.
 *
 * ⛔ Tokenet skal ALDRI logges noe annet sted. Ser du en `console.log` med en
 * invitasjonslenke utenfor denne funksjonen, er det en lekkasje.
 */
export async function sendInvitation(input: {
  to: string;
  lenke: string;
  forhandler: string;
  funksjon: string;
  utloper: Date;
  /** `owner` = forhandler-eier (F5-26). Default staff (F1-10). */
  kind?: 'staff' | 'owner';
}): Promise<void> {
  const dato = input.utloper.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const eier = input.kind === 'owner';
  const rolle = eier ? 'eier' : input.funksjon;

  if (skalLeggesILogg()) {
    devRamme(
      'INVITASJON (KUN DEV — Resend er ikke konfigurert)',
      [
        ['Til:', input.to],
        ['Rolle:', `${input.forhandler} · ${rolle}`],
        ['Lenke:', input.lenke],
      ],
      `Gyldig til ${dato}.`,
    );
    return;
  }

  const subject = eier
    ? `Du er invitert som eier av ${input.forhandler} i Endwise`
    : `Du er invitert til ${input.forhandler} i Endwise`;
  const ingress = eier
    ? `${input.forhandler} er opprettet i Endwise, og du er invitert som eier.`
    : `${input.forhandler} har invitert deg til Endwise som ${input.funksjon}.`;
  const fotnote = `Lenken er personlig, kan brukes én gang, og er gyldig til ${dato}. Har du ikke ventet denne invitasjonen, kan du se bort fra e-posten.`;

  await sendEmail({
    to: input.to,
    subject,
    text: [
      `Hei!`,
      ``,
      ingress,
      ``,
      `Åpne lenken for å sette eller bytte passordet ditt:`,
      input.lenke,
      ``,
      `Lenken er personlig, kan brukes én gang, og er gyldig til ${dato}.`,
      ``,
      `Har du ikke ventet denne invitasjonen, kan du se bort fra e-posten.`,
    ].join('\n'),
    html: byggEpostHtml({
      tittel: subject,
      ingress,
      innhold: knapp(input.lenke, 'Åpne invitasjonen'),
      fotnote,
    }),
  });
}

/**
 * F6-26 — UTGÅENDE MELDING FRA INNBOKSEN.
 *
 * En ansatt skriver i innboksen på en tråd som har `channel = 'email'`, og
 * kunden får det som e-post. Fram til 22.08.2026 ble kanalen bare LAGRET —
 * ingenting gikk ut, og innboksen viste et konvoluttikon på en melding som
 * aldri forlot databasen.
 *
 * ── ⛔ `replyTo` er ikke en detalj. Den er hele svaret på «kunden kan ikke
 *    svare ennå» ──────────────────────────────────────────────────────────
 * Innkommende e-post er ikke bygget (F6-27). Uten `replyTo` ville kunden fått
 * en e-post fra `no-reply@…`, trykket svar, og skrevet inn i et tomrom — verst
 * mulig utfall, fordi hen TROR meldingen kom fram.
 *
 * Svaret rutes derfor til **den ansatte som skrev meldingen**, i hens vanlige
 * jobb-innboks. Det er ikke et provisorium som må ryddes bort: det er riktig
 * oppførsel akkurat nå, og når F6-27 lander byttes adressen til trådens egen.
 *
 * Teksten sier det også i klartekst, for den som leser før hen trykker svar.
 */
export async function sendInboxMessage(input: {
  /** Kundens adresse — `threads.external_ref`. */
  to: string;
  /** Den ansattes e-post. Dit svaret går. */
  svarTil: string;
  /** Den ansattes navn, som avsender i teksten. */
  avsenderNavn: string;
  /** Forhandlerens navn — kunden kjenner verkstedet, ikke Endwise. */
  forhandler: string;
  /** Trådens emne, hvis den har ett. */
  emne: string | null;
  /** Meldingsteksten slik den ble skrevet i panelet. */
  tekst: string;
  /** Meldings-ID-en. Gjør en Resend-retry idempotent. */
  idempotencyKey: string;
}): Promise<string | undefined> {
  const emne = input.emne?.trim()
    ? `${input.forhandler}: ${input.emne.trim()}`
    : `Melding fra ${input.forhandler}`;

  const svarlinje = `Svarer du på denne e-posten, går svaret til ${input.avsenderNavn} (${input.svarTil}).`;

  return sendEmail({
    to: input.to,
    subject: emne,
    replyTo: input.svarTil,
    idempotencyKey: input.idempotencyKey,
    text: [
      input.tekst,
      '',
      '—',
      `${input.avsenderNavn}, ${input.forhandler}`,
      '',
      svarlinje,
      'Sendt via Endwise.',
    ].join('\n'),
    html: byggEpostHtml({
      tittel: input.emne?.trim() || `Melding fra ${input.forhandler}`,
      ingress: `${input.avsenderNavn} hos ${input.forhandler} har sendt deg en melding.`,
      innhold: meldingsboks(input.tekst),
      fotnote: `${svarlinje} Sendt via Endwise.`,
    }),
  });
}
