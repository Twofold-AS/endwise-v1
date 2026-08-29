import { osloKalenderdag, osloVegg, osloVeggklokke } from '../_lib/oslo-dag';

export function osloStartFraFelt(ymd: string, hour: number, minute: number): string {
  return osloVeggklokke(osloKalenderdag(ymd), hour, minute).toISOString();
}

export function tilOsloDato(instant: Date | string): string {
  return osloKalenderdag(instant);
}

export function tilOsloTime(instant: Date | string): number {
  return osloVegg(instant).h;
}

export function tilOsloMinutt(instant: Date | string): number {
  return osloVegg(instant).min;
}
