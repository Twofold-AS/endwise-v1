import { Resend } from 'resend';
import { authEnv } from '../env.ts';

/** F1-11 — e-post-2FA og auth-eposter går via Resend (techstack §5). */
let client: Resend | undefined;

function getClient(): Resend {
  if (!client) client = new Resend(authEnv.resend.apiKey);
  return client;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const { error } = await getClient().emails.send({
    from: authEnv.resend.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  if (error) throw new Error(`Resend feilet: ${error.message}`);
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

  await sendEmail({
    to,
    subject: 'Engangskode til Endwise',
    text: `Din engangskode er ${otp}. Den er gyldig i 5 minutter.\n\nHar du ikke bedt om denne koden, kontakt oss umiddelbart.`,
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
 * ⛔ Tokenet skal ALDRI logges noe annet sted. Ser du en `console.log` med en
 * invitasjonslenke utenfor denne funksjonen, er det en lekkasje.
 */
export async function sendInvitation(input: {
  to: string;
  lenke: string;
  forhandler: string;
  funksjon: string;
  utloper: Date;
}): Promise<void> {
  const dato = input.utloper.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (skalLeggesILogg()) {
    devRamme(
      'INVITASJON (KUN DEV — Resend er ikke konfigurert)',
      [
        ['Til:', input.to],
        ['Rolle:', `${input.forhandler} · ${input.funksjon}`],
        ['Lenke:', input.lenke],
      ],
      `Gyldig til ${dato}.`,
    );
    return;
  }

  await sendEmail({
    to: input.to,
    subject: `Du er invitert til ${input.forhandler} i Endwise`,
    text: [
      `Hei!`,
      ``,
      `${input.forhandler} har invitert deg til Endwise som ${input.funksjon}.`,
      ``,
      `Åpne lenken for å sette opp kontoen din:`,
      input.lenke,
      ``,
      `Lenken er personlig, kan brukes én gang, og er gyldig til ${dato}.`,
      ``,
      `Har du ikke ventet denne invitasjonen, kan du se bort fra e-posten.`,
    ].join('\n'),
  });
}
