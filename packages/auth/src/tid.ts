/**
 * Klokkevisning for auth-utløp (resetlenke, kvittering).
 * Produktets standardtidssone er Europe/Oslo. Kontoer har ikke egen
 * tidssone ennå — når de får det, sendes den inn som andre argument.
 *
 * Uten `timeZone` bruker `toLocaleTimeString` prosessens sone. På Vercel
 * er det UTC, så 07:46 CEST skrives som 05:46 og lenka ser utløpt ut.
 * Lagret `expiresAt` er et ekte UTC-øyeblikk; bare visningen var feil.
 */

export const PRODUKT_TIDSSONE = 'Europe/Oslo';

export function formaterKlokkeslett(instant: Date, timeZone: string = PRODUKT_TIDSSONE): string {
  return instant.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}
