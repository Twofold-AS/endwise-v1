import { LOGO_EPOST_CID } from '../assets/logo-epost.ts';

/**
 * Felles HTML-skall for auth-e-postene (engangskode, passordreset, invitasjon).
 *
 * ── ⚠️ E-post er ikke web. Reglene som styrer valgene her ────────────────
 * · **Tabeller, ikke flexbox/grid.** Outlook rendrer med Word-motoren.
 * · **Inline `style`, ikke klasser.** Gmail stripper `<style>` i mange
 *   sammenhenger, og alltid i videresendte meldinger.
 * · **Ingen SVG.** Gmail, Outlook og Apple Mail viser den ikke. Logoen er PNG.
 * · **Ingen `data:`-URI i `<img src>`.** Gmail og Outlook FJERNER dem. Logoen
 *   sendes derfor som et inline VEDLEGG med `contentId`, referert som
 *   `cid:`. Se `assets/logo-epost.ts` for hvorfor det ikke er samme sak som
 *   «inline base64».
 * · **Ingen ekstern URL for logoen.** Den ville måttet ligge på et offentlig
 *   domene; `BETTER_AUTH_URL` er localhost fram til F13.
 *
 * ── ⛔ Mørk modus ────────────────────────────────────────────────────────
 * Gmail, Outlook og Apple Mail inverterer lyse flater på hver sin måte, og
 * `prefers-color-scheme` er upålitelig — Gmail respekterer den ikke i alle
 * klienter. Vi løser det ved ikke å være avhengige av den:
 *
 *   **Logoen står alltid på sin egen mørke flate.** Den er hvit, og blokka bak
 *   har eksplisitt `bgcolor="#0b0b0b"` på en `<td>` — det attributtet
 *   overlever i praktisk talt alle klienter. Uansett om resten av e-posten
 *   inverteres eller ikke, ligger logoen på en kjent bakgrunn.
 *
 * En hvit logo på en lys flate ville vært usynlig i akkurat den klienten som
 * ikke inverterer. En svart logo på en lys flate ville vært usynlig i den som
 * gjør det. Egen flate er den eneste varianten som er trygg i begge.
 *
 * `color-scheme`/`supported-color-schemes` er satt i tillegg — de hjelper der
 * de leses, og skader ingen steder.
 */

/** Tokens, duplisert som literaler fordi e-post ikke kan lese CSS-variabler. */
const FARGE = {
  side: '#f4f4f5',
  kort: '#ffffff',
  merke: '#0b0b0b',
  tekst: '#18181b',
  dempet: '#71717a',
  kant: '#e4e4e7',
  kodeflate: '#fafafa',
} as const;

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif";

/** Escaper alt som interpoleres, så en verdi aldri kan bli markup. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Bygger hele HTML-dokumentet.
 *
 * @param tittel    Overskriften i kortet — også `<title>`.
 * @param ingress   Én setning under overskriften.
 * @param innhold   Ferdig HTML: kodeboks, knapp eller lenke.
 * @param fotnote   Liten tekst nederst, typisk «har du ikke bedt om dette …».
 */
export function byggEpostHtml(input: {
  tittel: string;
  ingress: string;
  innhold: string;
  fotnote: string;
}): string {
  return `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(input.tittel)}</title>
</head>
<body style="margin:0;padding:0;background-color:${FARGE.side};">
<!-- Forhåndsvisningsteksten i innboksen. Uten den viser klienten de første
     ordene i markupen, som ofte er «Endwise-logo». -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(input.ingress)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${FARGE.side};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:${FARGE.kort};border:1px solid ${FARGE.kant};border-radius:14px;overflow:hidden;">

        <!-- ⛔ Logoflata. Eksplisitt bgcolor: se filkommentaren om mørk modus. -->
        <tr>
          <td align="center" bgcolor="${FARGE.merke}" style="background-color:${FARGE.merke};padding:24px 24px 20px 24px;">
            <img src="cid:${LOGO_EPOST_CID}"
                 width="32" height="40"
                 alt="Endwise"
                 style="display:block;width:32px;height:40px;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>

        <tr>
          <td style="padding:28px 28px 8px 28px;font-family:${FONT};">
            <h1 style="margin:0 0 8px 0;font-size:19px;line-height:1.3;font-weight:600;color:${FARGE.tekst};">${esc(input.tittel)}</h1>
            <p style="margin:0;font-size:14px;line-height:1.55;color:${FARGE.dempet};">${esc(input.ingress)}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 28px 4px 28px;font-family:${FONT};">${input.innhold}</td>
        </tr>

        <tr>
          <td style="padding:12px 28px 28px 28px;font-family:${FONT};">
            <p style="margin:0;font-size:12px;line-height:1.55;color:${FARGE.dempet};">${esc(input.fotnote)}</p>
          </td>
        </tr>
      </table>

      <p style="margin:16px 0 0 0;font-family:${FONT};font-size:11px;color:${FARGE.dempet};">Endwise</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Engangskoden, stor og lett å lese av fra en annen skjerm. */
export function kodeboks(kode: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="background-color:${FARGE.kodeflate};border:1px solid ${FARGE.kant};border-radius:10px;padding:18px 12px;">
      <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;line-height:1;font-weight:600;letter-spacing:7px;color:${FARGE.tekst};">${esc(kode)}</span>
    </td>
  </tr>
</table>`;
}

/**
 * F6-26 — meldingsteksten fra innboksen, slik den ble skrevet.
 *
 * ⚠️ `white-space: pre-wrap` er poenget: en melding fra et verksted er ofte en
 * punktliste med linjeskift («byttet olje / fant slitt kjede / pris 4200»).
 * Uten den kollapser alt til én blokk, og meningen med oppsettet forsvinner.
 * `esc()` gjør at innholdet aldri kan bli markup.
 */
export function meldingsboks(tekst: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:${FARGE.kodeflate};border:1px solid ${FARGE.kant};border-radius:10px;padding:16px 18px;">
      <div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${FARGE.tekst};white-space:pre-wrap;">${esc(tekst)}</div>
    </td>
  </tr>
</table>`;
}

/**
 * Knapp som lenke.
 *
 * ⚠️ URL-en gjentas som ren tekst under. Mange klienter og bedriftsfiltre
 * gjør knapper uklikkbare eller skriver om lenker, og da er en synlig adresse
 * forskjellen på en e-post som virker og en som ikke gjør det.
 */
export function knapp(url: string, etikett: string): string {
  const trygg = esc(url);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding-bottom:14px;">
      <a href="${trygg}" style="display:inline-block;background-color:${FARGE.merke};color:#ffffff;font-size:14px;font-weight:600;line-height:1;text-decoration:none;padding:13px 22px;border-radius:10px;">${esc(etikett)}</a>
    </td>
  </tr>
  <tr>
    <td style="font-size:11px;line-height:1.5;color:${FARGE.dempet};word-break:break-all;">
      Virker ikke knappen? Lim inn denne adressen i nettleseren:<br>
      <a href="${trygg}" style="color:${FARGE.dempet};">${trygg}</a>
    </td>
  </tr>
</table>`;
}
