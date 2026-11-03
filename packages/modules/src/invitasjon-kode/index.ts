import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * F16 / white label F0 — kort invitasjonskode (ikke det lange tokenet).
 * SHA-256 av tokenet (packages/modules/src/invitasjoner) holder for 256 bit
 * tilfeldighet. En 6–8 tegns kode krever HMAC med server-pepper og rad-salt.
 * Isolert: rører ikke eksisterende invitasjonsflyt.
 */

export const KODE_TEGN_MIN = 6;
export const KODE_TEGN_MAX = 8;
export const KODE_TEGN_ANBEFALT = 8;
export const KODE_GYLDIGHET_MS = 10 * 60 * 1000;
export const KODE_GYLDIGHET_MAX_MS = 15 * 60 * 1000;
export const MAX_FORSOK = 5;
export const PEPPER_ENV = 'INVITASJON_KODE_PEPPER';

/** Lettlest alfabet uten 0/O/1/I. Lengde 32 = jevnt 5 bit. */
const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** CSPRNG uten modulo (CWE-331 / CodeQL js/biased-cryptographic-random). */
function trekkKode(lengde: number): string {
  let kode = '';
  while (kode.length < lengde) {
    const b = randomBytes(1)[0];
    if (b === undefined) continue;
    const tegn = ALFABET[b & 31];
    if (tegn === undefined) continue;
    kode += tegn;
  }
  return kode;
}

export const INVITASJON_KODE_FEIL = 'ugyldig' as const;

export class InvitasjonKodeConfigError extends Error {}

export type InvitasjonKodeRad = {
  codeHash: string;
  codeSalt: string;
  attempts: number;
  expiresAt: Date;
  usedAt: Date | null;
};

function lesPepper(pepper?: string): string {
  const verdi = pepper ?? process.env[PEPPER_ENV] ?? '';
  if (verdi.length < 16) {
    throw new InvitasjonKodeConfigError(
      `${PEPPER_ENV} mangler eller er for kort (trenger minst 16 tegn).`,
    );
  }
  return verdi;
}

export function normaliserKode(kode: string): string {
  return kode
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}

export function hashInvitasjonskode(kode: string, salt: string, pepper?: string): string {
  const p = lesPepper(pepper);
  const norm = normaliserKode(kode);
  return createHmac('sha256', p).update(`${salt}:${norm}`, 'utf8').digest('hex');
}

function kodeErLike(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function genererInvitasjonskode(input: {
  pepper?: string;
  lengde?: number;
  gyldighetMs?: number;
  now?: Date;
}): {
  kode: string;
  salt: string;
  hash: string;
  expiresAt: Date;
} {
  const lengde = input.lengde ?? KODE_TEGN_ANBEFALT;
  if (lengde < KODE_TEGN_MIN || lengde > KODE_TEGN_MAX) {
    throw new InvitasjonKodeConfigError(
      `Invitasjonskode må være ${KODE_TEGN_MIN}–${KODE_TEGN_MAX} tegn.`,
    );
  }
  const gyldighet = input.gyldighetMs ?? KODE_GYLDIGHET_MS;
  if (gyldighet <= 0 || gyldighet > KODE_GYLDIGHET_MAX_MS) {
    throw new InvitasjonKodeConfigError(
      `Gyldighet må være mellom 1 ms og ${KODE_GYLDIGHET_MAX_MS} ms.`,
    );
  }

  const kode = trekkKode(lengde);
  const salt = randomBytes(16).toString('base64url');
  const hash = hashInvitasjonskode(kode, salt, input.pepper);
  const now = input.now ?? new Date();
  return { kode, salt, hash, expiresAt: new Date(now.getTime() + gyldighet) };
}

/**
 * Vurderer kode mot hash, utløp, brukt-stempel og forsøk.
 * HMAC kjøres alltid (unngår tidlig retur). Offentlig utfall er bare ok / ikke ok.
 */
export function vurderInvitasjonskode(
  kode: string,
  rad: InvitasjonKodeRad,
  opts: { pepper?: string; now?: Date } = {},
): { ok: true } | { ok: false; feil: typeof INVITASJON_KODE_FEIL } {
  const now = opts.now ?? new Date();
  const beregnet = hashInvitasjonskode(kode, rad.codeSalt, opts.pepper);
  const hashOk = kodeErLike(beregnet, rad.codeHash);
  const utlopt = now.getTime() >= rad.expiresAt.getTime();
  const brukt = rad.usedAt !== null;
  const last = rad.attempts >= MAX_FORSOK;
  if (!hashOk || utlopt || brukt || last) {
    return { ok: false, feil: INVITASJON_KODE_FEIL };
  }
  return { ok: true };
}

export function nesteAntallForsoek(attempts: number): number {
  return attempts + 1;
}

export function erKodeLaast(attempts: number): boolean {
  return attempts >= MAX_FORSOK;
}
