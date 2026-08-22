import { authPublicUrl } from './auth-origins.ts';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Miljøvariabel mangler: ${name}`);
  return value;
}

/**
 * Domenene som er verifisert i Resend.
 *
 * ── ⚠️ Historikken her er verdt å lese før noen «rydder» ────────────────
 * Om morgenen 22.08.2026 var KUN `no-reply.endwise.no` verifisert, og en
 * avsender på apex-domenet `endwise.no` ga `403 validation_error` på hver
 * eneste auth-e-post. Det var den feilen som gjorde at engangskoden ikke kom
 * fram. Senere samme dag ble **apex-domenet også verifisert**, og begge virker
 * nå (bekreftet mot `GET /domains`: begge `verified`).
 *
 * ⛔ Derfor er dette en LISTE med EKSAKTE domener, ikke ett domene med en
 * subdomene-regel. Resend verifiserer hvert domene for seg — at
 * `no-reply.endwise.no` er verifisert sier ingenting om `endwise.no`, og
 * motsatt. En `endsWith`-regel ville påstått noe om Resend som ikke er sant,
 * og sluppet gjennom et domene som ville 403-et i produksjon.
 *
 * Legger noen til et domene i Resend, skal det inn her — og motsatt.
 */
export const RESEND_VERIFISERTE_DOMENER = ['endwise.no', 'no-reply.endwise.no'] as const;

/** Domenet standard-avsenderen bruker når `RESEND_FROM` ikke er satt. */
export const RESEND_STANDARD_DOMENE = 'endwise.no';

/**
 * Plukker domenet ut av en `from`-streng, enten den er `a@b.no` eller
 * `Navn <a@b.no>`. Returnerer `null` hvis strengen ikke inneholder en adresse.
 */
export function avsenderDomene(from: string): string | null {
  const treff = from.match(/<([^>]+)>/);
  const adresse = (treff ? treff[1] : from).trim();
  const at = adresse.lastIndexOf('@');
  if (at < 0 || at === adresse.length - 1) return null;
  return adresse.slice(at + 1).toLowerCase();
}

/**
 * Er avsenderen på et domene Resend vil godta?
 *
 * Eksakt treff mot lista. Ingen subdomene-logikk — se kommentaren over.
 */
export function avsenderErVerifisert(from: string): boolean {
  const domene = avsenderDomene(from);
  if (!domene) return false;
  return (RESEND_VERIFISERTE_DOMENER as readonly string[]).includes(domene);
}

export const authEnv = {
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  get secret() {
    return required('BETTER_AUTH_SECRET');
  },
  /**
   * Offentlig URL for denne kjøringen. Preview bruker `VERCEL_URL`,
   * ikke produksjons-`BETTER_AUTH_URL` — se `authPublicUrl`.
   */
  get baseUrl() {
    return authPublicUrl();
  },
  get twilio() {
    return {
      accountSid: required('TWILIO_ACCOUNT_SID'),
      authToken: required('TWILIO_AUTH_TOKEN'),
      verifyServiceSid: required('TWILIO_VERIFY_SERVICE_SID'),
    };
  },
  get resend() {
    return {
      apiKey: required('RESEND_API_KEY'),
      /**
       * ⚠️ **Standardverdien var `noreply@endwise.no` fram til 22.08.2026, og
       * den var feil.** Domenet som er verifisert i Resend heter
       * `no-reply.endwise.no` — et SUBDOMENE. En avsender på apex-domenet
       * `endwise.no` avvises med `403 validation_error`, og da feiler ALLE
       * auth-e-poster samtidig: engangskode, passordreset og invitasjon.
       *
       * Verifiser mot `GET https://api.resend.com/domains` før du endrer
       * denne eller `RESEND_FROM`. De to strengene ser nesten like ut.
       */
      /**
       * ⚠️ `||`, ikke `??`. `??` faller kun tilbake på `null`/`undefined` —
       * en TOM streng ville sluppet gjennom som avsenderadresse. Og tom er
       * nettopp det `.env.example` leverer for de andre nøklene, så dette er
       * en helt vanlig tilstand i et halvkonfigurert miljø. Fanget av
       * `epost-innhold.test.ts` 22.08.2026.
       */
      from: process.env.RESEND_FROM || `Endwise <no-reply@${RESEND_STANDARD_DOMENE}>`,
    };
  },
} as const;
