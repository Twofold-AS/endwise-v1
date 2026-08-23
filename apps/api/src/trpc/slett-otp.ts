import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/** 6-sifret kode til slett-bekreftelse. Aldri logg eller returner den. */
export function lagSlettKode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashSlettKode(kode: string): string {
  return createHash('sha256').update(kode.trim()).digest('hex');
}

export function slettKodeErGyldig(kode: string, hash: string): boolean {
  const gitt = kode.trim();
  if (!/^\d{6}$/.test(gitt) || !hash) return false;
  const a = Buffer.from(hashSlettKode(gitt), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
