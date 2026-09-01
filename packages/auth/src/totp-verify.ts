import { createHmac, timingSafeEqual } from 'node:crypto';

const PERIODE_SEKUNDER = 30;
const SIFFER = 6;
const VINDU = 1;

/**
 * Samme algoritme som Better-Auth `createOTP(secret, { period: 30, digits: 6 }).verify`.
 * Hemmeligheten er UTF-8-rå nøkkel (ikke base32-dekoding) — slik autentikator-URI
 * koder `secret` som base32 av de samme bytene.
 */
export function verifiserTotpKode(hemmelighet: string, totp: string): boolean {
  if (!/^\d{6}$/.test(totp)) return false;
  const naa = Math.floor(Date.now() / (PERIODE_SEKUNDER * 1000));
  const forventet = Buffer.from(totp, 'utf8');
  let treff = false;
  for (let i = -VINDU; i <= VINDU; i++) {
    const kode = hotp(hemmelighet, naa + i);
    const kandidat = Buffer.from(kode, 'utf8');
    if (kandidat.length === forventet.length && timingSafeEqual(kandidat, forventet)) {
      treff = true;
    }
  }
  return treff;
}

function hotp(hemmelighet: string, counter: number): string {
  const teller = Buffer.alloc(8);
  teller.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', hemmelighet).update(teller).digest();
  const offset = hmac[hmac.length - 1]! & 15;
  const trunkert =
    ((hmac[offset]! & 127) << 24) |
    ((hmac[offset + 1]! & 255) << 16) |
    ((hmac[offset + 2]! & 255) << 8) |
    (hmac[offset + 3]! & 255);
  const otp = trunkert % 10 ** SIFFER;
  return otp.toString().padStart(SIFFER, '0');
}
