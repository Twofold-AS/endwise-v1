import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * F4-02 — Kortlevd widget-token (HS256 JWT, signert med Node-crypto HMAC).
 *
 * Utstedt av `/widget/init` ETTER at publishable key + Origin er validert. Det
 * er dette tokenet klienten sender på hver etterfølgende forespørsel — ikke
 * publishable key direkte. Kortlevd (default 15 min) så en lekket token har kort
 * levetid. Bærer KUN tenant-ID + en anonym kunde-ID, aldri hemmeligheter.
 *
 * HS256 er nok her (samme part signerer og verifiserer). Vi håndruller det med
 * node:crypto framfor å dra inn `jose` — én mindre avhengighet, og signeringen
 * er triviell og enhetstestbar. Verifisering er konstant-tid (timingSafeEqual).
 */

export interface WidgetTokenPayload {
  /** Tenant nøkkelen tilhører. */
  tid: string;
  /** Anonym kunde-ID for denne widget-økten (`customer:<uuid>`). */
  cid: string;
  /** Utstedt (unix-sekund). */
  iat: number;
  /** Utløper (unix-sekund). */
  exp: number;
}

export class WidgetTokenError extends Error {}

const HEADER = { alg: 'HS256', typ: 'JWT' } as const;
const DEFAULT_TTL_SECONDS = 15 * 60;

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** Signerer et widget-token. `secret` er server-hemmelig (aldri i klienten). */
export function signWidgetToken(
  input: { tid: string; cid: string },
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  if (!secret) throw new WidgetTokenError('Mangler token-hemmelighet');
  const now = Math.floor(Date.now() / 1000);
  const payload: WidgetTokenPayload = {
    tid: input.tid,
    cid: input.cid,
    iat: now,
    exp: now + ttlSeconds,
  };
  const head = b64url(JSON.stringify(HEADER));
  const body = b64url(JSON.stringify(payload));
  const sig = sign(`${head}.${body}`, secret);
  return `${head}.${body}.${sig}`;
}

/**
 * Verifiserer et widget-token. Kaster `WidgetTokenError` ved ugyldig signatur,
 * feil algoritme, feilformat eller utløp. Returnerer payloaden ved suksess.
 */
export function verifyWidgetToken(token: string, secret: string): WidgetTokenPayload {
  if (!secret) throw new WidgetTokenError('Mangler token-hemmelighet');
  const parts = token.split('.');
  if (parts.length !== 3) throw new WidgetTokenError('Ugyldig token-format');
  const [head, body, sig] = parts;

  // Verifiser algoritme (hindrer alg-forvirring / `none`).
  let header: unknown;
  try {
    header = JSON.parse(Buffer.from(head, 'base64url').toString('utf8'));
  } catch {
    throw new WidgetTokenError('Ugyldig token-header');
  }
  if (
    typeof header !== 'object' ||
    header === null ||
    (header as { alg?: string }).alg !== 'HS256'
  ) {
    throw new WidgetTokenError('Uventet token-algoritme');
  }

  // Konstant-tids signaturverifisering.
  const expected = sign(`${head}.${body}`, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new WidgetTokenError('Ugyldig token-signatur');
  }

  let payload: WidgetTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as WidgetTokenPayload;
  } catch {
    throw new WidgetTokenError('Ugyldig token-payload');
  }
  if (!payload.tid || !payload.cid || typeof payload.exp !== 'number') {
    throw new WidgetTokenError('Ufullstendig token');
  }
  if (Math.floor(Date.now() / 1000) >= payload.exp) {
    throw new WidgetTokenError('Token utløpt');
  }
  return payload;
}
