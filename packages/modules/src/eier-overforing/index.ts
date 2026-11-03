import { OMRADER, type Niva, type Omrade } from '../tillatelse/index.ts';

/**
 * F29 / white label F8c — overføring av daglig leder.
 * Frivillig krever fersk TOTP. Nød krever stedfortreder eller Endwise,
 * to endwise_admin og 7 dagers varsel. Atomisk bytte i overfor_daglig_leder.
 */

export const EIER_OVERFOR_FEIL = 'Ikke tillatt';
export const NOD_VARSEL_DAGER = 7;
export const OWNER_TRANSFER_AUDIT = {
  start: 'owner.transfer_started',
  utfort: 'owner.transfer_completed',
  nodStart: 'owner.transfer_emergency_started',
  nodGodkjent: 'owner.transfer_emergency_approved',
  nodUtfort: 'owner.transfer_emergency_completed',
} as const;

export type EierTillatelser = Partial<Record<Omrade, Niva>>;

export function kanStarteNod(input: {
  erEndwiseAdmin: boolean;
  erStedfortreder: boolean;
}): boolean {
  return input.erEndwiseAdmin || input.erStedfortreder;
}

export function nesteNodGodkjenning(input: {
  aktorId: string;
  godkjenner1: string | null;
  godkjenner2: string | null;
}): { ok: true; felt: 'godkjenner1' | 'godkjenner2' } | { ok: false; grunn: string } {
  if (input.aktorId === input.godkjenner1 || input.aktorId === input.godkjenner2) {
    return { ok: false, grunn: EIER_OVERFOR_FEIL };
  }
  if (!input.godkjenner1) return { ok: true, felt: 'godkjenner1' };
  if (!input.godkjenner2) return { ok: true, felt: 'godkjenner2' };
  return { ok: false, grunn: EIER_OVERFOR_FEIL };
}

export function kanUtforeNod(input: {
  status: string;
  godkjenner1: string | null;
  godkjenner2: string | null;
  utforEtter: Date | null;
  now?: Date;
}): boolean {
  if (input.status !== 'godkjent') return false;
  if (!input.godkjenner1 || !input.godkjenner2) return false;
  if (!input.utforEtter) return false;
  return (input.now ?? new Date()).getTime() >= input.utforEtter.getTime();
}

export function nodUtforEtter(varsletAt: Date, dager = NOD_VARSEL_DAGER): Date {
  return new Date(varsletAt.getTime() + dager * 24 * 60 * 60 * 1000);
}

export function rensTillatelser(raw: unknown): EierTillatelser {
  if (!raw || typeof raw !== 'object') return {};
  const ut: EierTillatelser = {};
  for (const omrade of OMRADER) {
    const niva = (raw as Record<string, unknown>)[omrade];
    if (niva === 'se' || niva === 'endre') ut[omrade] = niva;
  }
  return ut;
}
