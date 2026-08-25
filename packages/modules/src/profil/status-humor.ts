/**
 * F6-19 — STATUS PÅ ANSATTE, UTLEDT AV FELT SOM FINNES.
 *
 * Det finnes ingen `ledig`/`syk`/`ferie`-kolonne og ingen presence. Det som
 * faktisk bor i skjemaet er:
 *
 *   · `mechanics.active`  — tilgjengelig / ikke tilgjengelig
 *   · `mechanics.capacity` — samtidige jobber
 *   · dagens bookinger     — belastning
 *
 * ⛔ Status overstyrer KUN `humor` i visningen. Form, farge, tone og seed er
 * den persistente identiteten. Velgeren viser det brukeren selv valgte.
 *
 * Bookinger som teller: `draft` / `confirmed` / `in_progress`. Fullført,
 * avlyst og no-show frigir plassen — de skal ikke tegne noen som opptatt.
 */
export const STATUS_TELLENDE_BOOKING = ['draft', 'confirmed', 'in_progress'] as const;

export type MekanikerStatus = 'ledig' | 'på_jobb' | 'opptatt' | 'ikke_tilgjengelig';

export const MEKANIKER_STATUS_HUMOR = {
  ledig: 'happy',
  på_jobb: 'thinking',
  opptatt: 'thinking',
  ikke_tilgjengelig: 'sleepy',
} as const satisfies Record<MekanikerStatus, 'happy' | 'thinking' | 'sleepy'>;

export const MEKANIKER_STATUS_LABEL: Record<MekanikerStatus, string> = {
  ledig: 'Ledig',
  på_jobb: 'På jobb',
  opptatt: 'Opptatt',
  ikke_tilgjengelig: 'Ikke tilgjengelig',
};

export function tellerSomBelastning(status: string): boolean {
  return (STATUS_TELLENDE_BOOKING as readonly string[]).includes(status);
}

export function utledMekanikerStatus(input: {
  aktiv: boolean;
  jobberIDag: number;
  kapasitet: number;
}): MekanikerStatus {
  if (!input.aktiv) return 'ikke_tilgjengelig';
  if (input.jobberIDag >= input.kapasitet && input.kapasitet > 0) return 'opptatt';
  if (input.jobberIDag > 0) return 'på_jobb';
  return 'ledig';
}

export function mekanikerStatusVisning(input: {
  aktiv: boolean;
  jobberIDag: number;
  kapasitet: number;
}): {
  status: MekanikerStatus;
  statusHumor: (typeof MEKANIKER_STATUS_HUMOR)[MekanikerStatus];
  statusLabel: string;
} {
  const status = utledMekanikerStatus(input);
  return {
    status,
    statusHumor: MEKANIKER_STATUS_HUMOR[status],
    statusLabel: MEKANIKER_STATUS_LABEL[status],
  };
}
