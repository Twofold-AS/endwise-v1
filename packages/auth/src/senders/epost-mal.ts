import { LOGO_EPOST_CID } from '../assets/logo-epost.ts';

/**
 * Felles HTML-skall for e-postene vi faktisk sender (magic link, bekreftelseskode,
 * invitasjon, e-postbytte, innboks). Booking-varsler i toolkit-resend speiler
 * de samme tokenene.
 *
 * E-post er ikke web. Reglene som styrer valgene her
 * Tabeller, ikke flexbox/grid. Outlook rendrer med Word-motoren.
 * Inline `style`, ikke klasser. Gmail stripper `<style>` i mange
 * sammenhenger, og alltid i videresendte meldinger.
 * Ingen SVG. Gmail, Outlook og Apple Mail viser den ikke. Logoen er PNG.
 * Ingen `data:`-URI i `<img src>`. Gmail og Outlook fjerner dem. Logoen
 * sendes derfor som et inline vedlegg med `contentId`, referert som
 * `cid:`. Se `assets/logo-epost.ts`.
 * Ingen ekstern URL for logoen. Den ville måttet ligge på et offentlig
 * domene; `BETTER_AUTH_URL` er localhost fram til F13.
 *
 * Visuell lås (Mikael 02.09.2026) — samme Apple/shadcn.io-system som appen
 * Parchment `#f5f5f7` · canvas `#ffffff` · ink `#1d1d1f` · muted `#7a7a7a`
 * · hairline `#e0e0e0` · Action Blue `#0066cc` på pille-CTA.
 * Logo på hvit flate (ikke mørk chrome). Ingen drop-shadow. Ingen grønn
 * aksent. Ingen dealer-fliser. Ingen Morph. Lyst tema only — produktet har
 * ingen dark-mode-sti, så `color-scheme` er `light`.
 * Inter er SF Pro-erstatningen; klienter uten Inter faller til system-sans.
 * Brødtekst 17px / 1.47. Titler 16/20 Semibold. Knapper 32px / pille.
 */

/** Tokens, duplisert som literaler fordi e-post ikke kan lese CSS-variabler. */
export const FARGE = {
  side: '#f5f5f7',
  kort: '#ffffff',
  merke: '#ffffff',
  tekst: '#1d1d1f',
  dempet: '#7a7a7a',
  kant: '#e0e0e0',
  kodeflate: '#fafafc',
  aksent: '#0066cc',
  aksentTekst: '#ffffff',
  utility: '#1d1d1f',
} as const;

const FONT =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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
 * @param tittel Overskriften i kortet — også `<title>`.
 * @param ingress Én setning under overskriften.
 * @param innhold Ferdig HTML: kodeboks, knapp eller lenke.
 * @param fotnote Liten tekst nederst, typisk «har du ikke bedt om dette …».
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
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(input.tittel)}</title>
</head>
<body style="margin:0;padding:0;background-color:${FARGE.side};">
<!-- Forhåndsvisningsteksten i innboksen. Uten den viser klienten de første
     ordene i markupen, som ofte er «Endwise-logo». -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(input.ingress)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${FARGE.side}" style="background-color:${FARGE.side};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${FARGE.kort}" style="max-width:480px;background-color:${FARGE.kort};border:1px solid ${FARGE.kant};border-radius:18px;">

        <tr>
          <td align="center" bgcolor="${FARGE.merke}" style="background-color:${FARGE.merke};padding:28px 28px 8px 28px;">
            <img src="cid:${LOGO_EPOST_CID}"
                 width="32" height="40"
                 alt="Endwise"
                 style="display:block;width:32px;height:40px;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>

        <tr>
          <td style="padding:16px 28px 8px 28px;font-family:${FONT};">
            <h1 style="margin:0 0 8px 0;font-size:16px;line-height:20px;font-weight:600;letter-spacing:-0.2px;color:${FARGE.tekst};">${esc(input.tittel)}</h1>
            <p style="margin:0;font-size:17px;line-height:1.47;font-weight:400;letter-spacing:-0.374px;color:${FARGE.dempet};">${esc(input.ingress)}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 28px 4px 28px;font-family:${FONT};">${input.innhold}</td>
        </tr>

        <tr>
          <td style="padding:16px 28px 28px 28px;font-family:${FONT};">
            <p style="margin:0;font-size:12px;line-height:1.55;color:${FARGE.dempet};">${esc(input.fotnote)}</p>
          </td>
        </tr>
      </table>

      <p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;line-height:1;letter-spacing:-0.12px;color:${FARGE.dempet};">Endwise</p>
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
    <td align="center" style="background-color:${FARGE.kodeflate};border:1px solid ${FARGE.kant};border-radius:8px;padding:18px 12px;">
      <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;line-height:1;font-weight:600;letter-spacing:7px;color:${FARGE.tekst};">${esc(kode)}</span>
    </td>
  </tr>
</table>`;
}

/**
 * Meldingsteksten fra innboksen, slik den ble skrevet.
 * `white-space: pre-wrap` er poenget: en melding fra et verksted er ofte en
 * punktliste med linjeskift («byttet olje / fant slitt kjede / pris 4200»).
 * Uten den kollapser alt til én blokk, og meningen med oppsettet forsvinner.
 * `esc` gjør at innholdet aldri kan bli markup.
 */
export function meldingsboks(tekst: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:${FARGE.kodeflate};border:1px solid ${FARGE.kant};border-radius:8px;padding:16px 18px;">
      <div style="font-family:${FONT};font-size:17px;line-height:1.47;color:${FARGE.tekst};white-space:pre-wrap;">${esc(tekst)}</div>
    </td>
  </tr>
</table>`;
}

/**
 * Knapp som lenke — pille-CTA i Action Blue, 32px, som primærknappen i appen.
 * URL-en gjentas som ren tekst under. Mange klienter og bedriftsfiltre
 * gjør knapper uklikkbare eller skriver om lenker, og da er en synlig adresse
 * forskjellen på en e-post som virker og en som ikke gjør det.
 */
export function knapp(url: string, etikett: string): string {
  const trygg = esc(url);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding-bottom:14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" bgcolor="${FARGE.aksent}" style="background-color:${FARGE.aksent};border-radius:9999px;">
            <a href="${trygg}" style="display:inline-block;background-color:${FARGE.aksent};color:${FARGE.aksentTekst};font-family:${FONT};font-size:13px;font-weight:600;line-height:16px;text-decoration:none;padding:8px 22px;border-radius:9999px;">${esc(etikett)}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="font-size:12px;line-height:1.5;color:${FARGE.dempet};word-break:break-all;font-family:${FONT};">
      Virker ikke knappen? Lim inn denne adressen i nettleseren:<br>
      <a href="${trygg}" style="color:${FARGE.aksent};">${trygg}</a>
    </td>
  </tr>
</table>`;
}
