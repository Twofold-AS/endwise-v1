/**
 * Skriver HTML-forhåndsvisning av hver e-post vi faktisk sender.
 * Logoen i forhåndsvisningen er data-URI (kun her — Gmail stripper den i ekte sending).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { byggVarselHtml } from '../../tools/toolkits/resend/src/epost-html.ts';
import { LOGO_EPOST_CID, LOGO_EPOST_PNG_BASE64 } from '../src/assets/logo-epost.ts';
import { byggEpostHtml, knapp, kodeboks, meldingsboks } from '../src/senders/epost-mal.ts';

const her = dirname(fileURLToPath(import.meta.url));
const ut = resolve(her, '../../../docs/epost-forhaandvisning');

const maler: Array<{ id: string; html: string }> = [
  {
    id: 'magic-link',
    html: byggEpostHtml({
      tittel: 'Logg inn på Endwise',
      ingress:
        'Koden din er ABCD-EFGH-2345. Trykk på knappen eller skriv den manuelt. Gyldig til kl. 21:00. Bare den nyeste e-posten gjelder.',
      innhold: `${kodeboks('ABCD-EFGH-2345')}<div style="height:16px"></div>${knapp('https://endwise.no/api/auth/magic-link/verify?token=eksempel', 'Logg inn')}`,
      fotnote:
        'Har du ikke bedt om denne lenken, kan du se bort fra e-posten. Bare den nyeste e-posten gjelder — eldre lenker slutter å virke.',
    }),
  },
  {
    id: 'bekreftelseskode',
    html: byggEpostHtml({
      tittel: 'Bekreft handlingen i Endwise',
      ingress: 'Koden din er 482913. Den er gyldig i 5 minutter og kan brukes én gang.',
      innhold: kodeboks('482913'),
      fotnote:
        'Har du ikke bedt om denne koden, se bort fra e-posten. Den gjelder bare en lederhandling i Endwise.',
    }),
  },
  {
    id: 'invitasjon',
    html: byggEpostHtml({
      tittel: 'Du er invitert til Verksted A i Endwise',
      ingress: 'Verksted A har invitert deg til Endwise som support.',
      innhold: knapp('https://endwise.no/invitasjon/eksempel', 'Åpne invitasjonen'),
      fotnote:
        'Lenken er personlig, kan brukes én gang, og er gyldig til 1. september 2026. Har du ikke ventet denne invitasjonen, kan du se bort fra e-posten.',
    }),
  },
  {
    id: 'e-postbytte-gammel',
    html: byggEpostHtml({
      tittel: 'Bekreft e-postbytte',
      ingress:
        'Noen har bedt om å bytte e-posten din til ny@twofold.no. Adressen er uendret til du åpner lenken.',
      innhold: knapp('https://endwise.no/bekreft-epost?token=eksempel', 'Bekreft e-postbytte'),
      fotnote: 'Har du ikke bedt om å bytte e-post, se bort fra lenken — adressen din er uendret.',
    }),
  },
  {
    id: 'e-postbytte-ny',
    html: byggEpostHtml({
      tittel: 'Bekreft ny e-post',
      ingress: 'Åpne lenken for å knytte denne adressen til Endwise-kontoen din.',
      innhold: knapp('https://endwise.no/bekreft-epost?token=eksempel', 'Bekreft ny e-post'),
      fotnote:
        'Har du ikke bedt om denne e-posten, kan du se bort fra den. Ingen konto er knyttet til adressen ennå.',
    }),
  },
  {
    id: 'innboks',
    html: byggEpostHtml({
      tittel: 'EU-kontroll',
      ingress: 'Kari hos Verksted A har sendt deg en melding.',
      innhold: meldingsboks('Hei!\n\nBilen er klar etter EU-kontroll.\nHenter du den i dag?'),
      fotnote:
        'Svarer du på denne e-posten, går svaret til Kari (kari@verksted.no). Sendt via Endwise.',
    }),
  },
  {
    id: 'booking-varsel',
    html: byggVarselHtml({
      tittel: 'Booking bekreftet hos Verksted A',
      tekst: 'EU-kontroll 3. september kl. 10:00.\nMøt opp i resepsjonen.',
    }),
  },
];

mkdirSync(ut, { recursive: true });

for (const mal of maler) {
  const medLogo = mal.html.replace(
    `src="cid:${LOGO_EPOST_CID}"`,
    `src="data:image/png;base64,${LOGO_EPOST_PNG_BASE64}"`,
  );
  writeFileSync(resolve(ut, `${mal.id}.html`), medLogo);
}

const index = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<title>Endwise e-post — forhåndsvisning</title>
<style>
  body { margin: 0; font-family: Inter, -apple-system, sans-serif; background: #f5f5f7; color: #1d1d1f; }
  header { padding: 24px 20px 8px; }
  h1 { font-size: 16px; line-height: 20px; margin: 0 0 8px; }
  p { font-size: 17px; line-height: 1.47; color: #7a7a7a; margin: 0 0 16px; }
  section { margin: 0 16px 32px; }
  h2 { font-size: 13px; margin: 0 0 8px; }
  .rad { display: flex; flex-wrap: wrap; gap: 16px; }
  iframe { border: 1px solid #e0e0e0; border-radius: 18px; background: #fff; }
  .desktop { width: 600px; height: 720px; }
  .phone { width: 375px; height: 720px; }
</style>
</head>
<body>
<header>
  <h1>Transaksjonell e-post — Apple / Endwise-chrome</h1>
  <p>Desktop 600px og telefon 375px. Samme mal som Resend sender (logo som data-URI bare her).</p>
</header>
${maler
  .map(
    (m) => `<section id="${m.id}">
  <h2>${m.id}</h2>
  <div class="rad">
    <iframe class="desktop" title="${m.id} desktop" src="./${m.id}.html"></iframe>
    <iframe class="phone" title="${m.id} telefon" src="./${m.id}.html"></iframe>
  </div>
</section>`,
  )
  .join('\n')}
</body>
</html>`;

writeFileSync(resolve(ut, 'index.html'), index);
console.log(`Skrev ${maler.length} maler + index → ${ut}`);
