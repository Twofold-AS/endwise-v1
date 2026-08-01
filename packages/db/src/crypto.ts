import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * F1-07 — Envelope-crypto for tenant-hemmeligheter (techstack §«Envelope-crypto
 * (AES-256-GCM, BYOK)» — inkl. forhandlerens Quick API-nøkkel).
 *
 * Mønsteret (envelope / to-lags nøkkel):
 *   1. En KEK (Key Encryption Key) ligger UTENFOR databasen — i miljøet
 *      (`ENDWISE_KEK`, base64, 32 byte). Dette er «BYOK»-punktet: bytter
 *      driftsansvarlig ut KEK-en, roteres alt uten at klartekst rører DB.
 *   2. For HVER hemmelighet lages en fersk DEK (Data Encryption Key, 32 byte).
 *      Klarteksten krypteres med DEK-en (AES-256-GCM). DEK-en «pakkes» så inn
 *      (krypteres) med KEK-en (AES-256-GCM).
 *   3. Det som lagres i DB er KUN {pakket DEK + kryptert data} — aldri KEK,
 *      aldri klartekst, aldri en naken DEK.
 *
 * Hvorfor envelope og ikke bare kryptere direkte med KEK: DEK-per-hemmelighet
 * begrenser skade ved en kompromittert nøkkel og gjør rotasjon mulig uten å
 * re-kryptere alt tvers igjennom. KEK-en er den eneste tingen som må roteres.
 *
 * AES-256-GCM gir konfidensialitet + integritet (auth-tag). Vi verifiserer
 * derfor ikke bare at vi KAN dekryptere, men at ingenting er tuklet med.
 */

const ALGO = 'aes-256-gcm';
const KEY_BYTES = 32; // AES-256
const IV_BYTES = 12; // GCM-anbefaling
const KEK_ENV = 'ENDWISE_KEK';
const ENVELOPE_VERSION = 1;

/** Serialisert form som havner i en text-kolonne. Alle felt er base64. */
interface Envelope {
  /** Skjemaversjon — gjør fremtidig nøkkel-/algoritmerotasjon trygg. */
  v: number;
  /** DEK pakket med KEK: `dekIv` + `dekTag` beskytter denne. */
  wrappedDek: string;
  dekIv: string;
  dekTag: string;
  /** Selve hemmeligheten kryptert med DEK. */
  ciphertext: string;
  iv: string;
  tag: string;
}

export class CryptoConfigError extends Error {}

/**
 * Leser KEK-en fra miljøet LAT (ikke ved import), slik at det å importere
 * `@endwise/db` ikke krever nøkkelen. Bare faktisk kryptering/dekryptering gjør.
 */
function loadKek(explicit?: Buffer): Buffer {
  if (explicit) {
    if (explicit.length !== KEY_BYTES) {
      throw new CryptoConfigError(`KEK må være ${KEY_BYTES} byte, fikk ${explicit.length}`);
    }
    return explicit;
  }
  const raw = process.env[KEK_ENV];
  if (!raw) {
    throw new CryptoConfigError(
      `${KEK_ENV} mangler — sett en base64-kodet 32-byte nøkkel for å kryptere tenant-hemmeligheter`,
    );
  }
  let key: Buffer;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    throw new CryptoConfigError(`${KEK_ENV} er ikke gyldig base64`);
  }
  if (key.length !== KEY_BYTES) {
    throw new CryptoConfigError(
      `${KEK_ENV} må dekode til ${KEY_BYTES} byte (AES-256), fikk ${key.length}`,
    );
  }
  return key;
}

function gcmEncrypt(key: Buffer, plaintext: Buffer): { iv: Buffer; tag: Buffer; ct: Buffer } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ct };
}

function gcmDecrypt(key: Buffer, iv: Buffer, tag: Buffer, ct: Buffer): Buffer {
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/**
 * Krypterer en klartekst-hemmelighet (f.eks. en Quick API-token) og returnerer
 * en serialisert envelope trygg å lagre i en text-kolonne.
 */
export function encryptSecret(plaintext: string, kek?: Buffer): string {
  const key = loadKek(kek);
  const dek = randomBytes(KEY_BYTES);

  const data = gcmEncrypt(dek, Buffer.from(plaintext, 'utf8'));
  const wrapped = gcmEncrypt(key, dek);

  const envelope: Envelope = {
    v: ENVELOPE_VERSION,
    wrappedDek: wrapped.ct.toString('base64'),
    dekIv: wrapped.iv.toString('base64'),
    dekTag: wrapped.tag.toString('base64'),
    ciphertext: data.ct.toString('base64'),
    iv: data.iv.toString('base64'),
    tag: data.tag.toString('base64'),
  };
  return JSON.stringify(envelope);
}

/** Dekrypterer en envelope tilbake til klartekst. Kaster hvis den er tuklet med. */
export function decryptSecret(serialized: string, kek?: Buffer): string {
  const key = loadKek(kek);
  let env: Envelope;
  try {
    env = JSON.parse(serialized) as Envelope;
  } catch {
    throw new CryptoConfigError('Ugyldig envelope (ikke JSON)');
  }
  if (env.v !== ENVELOPE_VERSION) {
    throw new CryptoConfigError(`Ukjent envelope-versjon: ${env.v}`);
  }

  const dek = gcmDecrypt(
    key,
    Buffer.from(env.dekIv, 'base64'),
    Buffer.from(env.dekTag, 'base64'),
    Buffer.from(env.wrappedDek, 'base64'),
  );
  const plaintext = gcmDecrypt(
    dek,
    Buffer.from(env.iv, 'base64'),
    Buffer.from(env.tag, 'base64'),
    Buffer.from(env.ciphertext, 'base64'),
  );
  return plaintext.toString('utf8');
}

/** True hvis en KEK er konfigurert. Til «mock-modus»-sjekker uten å kaste. */
export function envelopeCryptoConfigured(): boolean {
  try {
    loadKek();
    return true;
  } catch {
    return false;
  }
}

/**
 * Konstant-tids sammenligning av to hemmeligheter (unngår timing-lekkasje ved
 * f.eks. token-verifisering). Eksponert her siden det hører til hemmelighets-
 * håndteringen.
 */
export function secretsEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
