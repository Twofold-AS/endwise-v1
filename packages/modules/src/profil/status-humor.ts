/**
 * F6-19 — STATUS PÅ ANSATTE, UTLEDT AV FELT SOM FINNES.
 *
 * Det finnes ingen `ledig`/`syk`/`ferie`-kolonne og ingen presence. Det som
 * faktisk bor i skjemaet er:
 *
 *   · `mechanics.active`  — på jobb / fri
 *   · `mechanics.capacity` — samtidige jobber
 *   · dagens bookinger     — belastning
 *
 * ⛔ Status overstyrer KUN `humor` i visningen, og BARE der status vises
 * (mekaniker-/ansattliste, Detaljer-panelet). Form, farge, tone og seed er
 * den persistente identiteten. Sidebar, profil og velgeren viser det
 * brukeren selv valgte.
 *
 * Bookinger som teller: `draft` / `confirmed` / `in_progress`. Fullført,
 * avlyst og no-show frigir plassen — de skal ikke tegne noen som opptatt.
 *
 * ⛔ `fri` er `idle` (nøytralt), ikke `sleepy`. Sleepy leses som trøtt, ikke
 * som «ikke på jobb». `sad` brukes ikke til arbeidsstatus.
 */
export const STATUS_TELLENDE_BOOKING = ['draft', 'confirmed', 'in_progress'] as const;

export type MekanikerStatus = 'ledig' | 'på_jobb' | 'opptatt' | 'fri';

export const MEKANIKER_STATUS_HUMOR = {
  ledig: 'happy',
  på_jobb: 'thinking',
  opptatt: 'thinking',
  fri: 'idle',
} as const satisfies Record<MekanikerStatus, 'happy' | 'thinking' | 'idle'>;

export const MEKANIKER_STATUS_LABEL: Record<MekanikerStatus, string> = {
  ledig: 'Ledig',
  på_jobb: 'På jobb',
  opptatt: 'Opptatt',
  fri: 'Fri',
};

export type StatusHumor = (typeof MEKANIKER_STATUS_HUMOR)[MekanikerStatus];

export function tellerSomBelastning(status: string): boolean {
  return (STATUS_TELLENDE_BOOKING as readonly string[]).includes(status);
}

export function utledMekanikerStatus(input: {
  aktiv: boolean;
  jobberIDag: number;
  kapasitet: number;
}): MekanikerStatus {
  if (!input.aktiv) return 'fri';
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
  statusHumor: StatusHumor;
  statusLabel: string;
} {
  const status = utledMekanikerStatus(input);
  return {
    status,
    statusHumor: MEKANIKER_STATUS_HUMOR[status],
    statusLabel: MEKANIKER_STATUS_LABEL[status],
  };
}

/**
 * Visnings-humor: status vinner når den er satt, ellers det lagrede valget.
 * Identitet (form/farge/tone/seed) røres aldri her.
 */
export function visningsHumor<T extends string | null | undefined>(
  lagret: T,
  statusHumor: StatusHumor | null | undefined,
): T | StatusHumor {
  return statusHumor ?? lagret;
}
