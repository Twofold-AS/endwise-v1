/**
 * Posisjonering på Verkstedets dagsplan.
 * Samme arbeidsdag som Jobber › Kalender (F3-07): 07–18. Jobber utenfor
 * klippes inn i kanten, de forsvinner ikke. Holdt her så kalenderen under
 * Ansatte/Jobber ikke røres.
 */

import { osloVeggtid, sammeOsloDag } from '../_lib/oslo-dag';

export const VERKSTED_DAG_START = 7;
export const VERKSTED_DAG_SLUTT = 18;
export const VERKSTED_DAG_TIMER = VERKSTED_DAG_SLUTT - VERKSTED_DAG_START;
export const VERKSTED_PX_PER_TIME = 44;

export const VERKSTED_TIMELISTE = Array.from(
  { length: VERKSTED_DAG_TIMER },
  (_, i) => VERKSTED_DAG_START + i,
);

export function timeplanKloss(
  startsAt: Date | string,
  endsAt: Date | string,
  pxPerTime = VERKSTED_PX_PER_TIME,
): { top: number; height: number } {
  const start = osloVeggtid(startsAt);
  const slutt = osloVeggtid(endsAt);
  const startTimer = start.hour + start.minute / 60;
  const sluttTimer = slutt.hour + slutt.minute / 60;
  const fra = Math.max(VERKSTED_DAG_START, Math.min(startTimer, VERKSTED_DAG_SLUTT));
  const til = Math.min(VERKSTED_DAG_SLUTT, Math.max(sluttTimer, fra + 0.25));
  return {
    top: (fra - VERKSTED_DAG_START) * pxPerTime,
    height: Math.max(22, (til - fra) * pxPerTime),
  };
}

export function dagensSaker<T extends { startsAt: Date | string }>(rader: T[], dag: Date): T[] {
  return rader
    .filter((b) => sammeOsloDag(b.startsAt, dag))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
