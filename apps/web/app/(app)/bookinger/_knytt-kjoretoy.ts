/**
 * Fest kjøretøy til Opprett jobb: valgt id, eller eksisterende regnr, eller opprett.
 * Regnr skal følge jobben — ikke kreve egen «Registrer kjøretøy»-runde etterpå.
 */
export function velgKjoretoyForJobb(opts: {
  vehicleId: string;
  regNumber: string;
  kjoretoy: readonly { id: string; regNumber: string | null }[];
}): { vehicleId?: string; maaOpprette: boolean; regNumber: string } {
  if (opts.vehicleId) {
    return { vehicleId: opts.vehicleId, maaOpprette: false, regNumber: opts.regNumber.trim() };
  }
  const reg = opts.regNumber.trim().toUpperCase();
  if (!reg) return { maaOpprette: false, regNumber: '' };
  const funnet = opts.kjoretoy.find((v) => (v.regNumber ?? '').toUpperCase() === reg);
  if (funnet) return { vehicleId: funnet.id, maaOpprette: false, regNumber: reg };
  return { maaOpprette: true, regNumber: reg };
}
