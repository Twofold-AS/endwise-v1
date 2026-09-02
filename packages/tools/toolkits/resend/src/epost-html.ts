/**
 * HTML-skall for booking-/avvik-varsler.
 * Speiler tokenene i `packages/auth/src/senders/epost-mal.ts` (Mikael Apple-lås).
 * Toolkit importerer ikke `@endwise/auth` — det ville dratt Better-Auth hit.
 * Duplikatet er trygt så lenge `resend-port.test.ts` låser de samme hex-verdiene.
 */

const FARGE = {
  side: '#f5f5f7',
  kort: '#ffffff',
  tekst: '#1d1d1f',
  dempet: '#7a7a7a',
  kant: '#e0e0e0',
  kodeflate: '#fafafc',
  aksent: '#0066cc',
} as const;

const FONT =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Parchment/white-kort for varseltekst. Ingen logo-cid — toolkit har ikke auth-vedlegget. */
export function byggVarselHtml(input: { tittel: string; tekst: string }): string {
  const tittel = esc(input.tittel);
  const tekst = esc(input.tekst);
  return `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${tittel}</title>
</head>
<body style="margin:0;padding:0;background-color:${FARGE.side};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${tittel}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${FARGE.side}" style="background-color:${FARGE.side};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${FARGE.kort}" style="max-width:480px;background-color:${FARGE.kort};border:1px solid ${FARGE.kant};border-radius:18px;">
        <tr>
          <td align="center" bgcolor="${FARGE.kort}" style="background-color:${FARGE.kort};padding:28px 28px 8px 28px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:600;color:${FARGE.tekst};">
            Endwise
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 8px 28px;font-family:${FONT};">
            <h1 style="margin:0 0 8px 0;font-size:16px;line-height:20px;font-weight:600;color:${FARGE.tekst};">${tittel}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 28px 28px;font-family:${FONT};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:${FARGE.kodeflate};border:1px solid ${FARGE.kant};border-radius:8px;padding:16px 18px;">
                  <div style="font-family:${FONT};font-size:17px;line-height:1.47;color:${FARGE.tekst};white-space:pre-wrap;">${tekst}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;color:${FARGE.dempet};">Sendt via Endwise</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}
