/**
 * Tidssone-hjelper for Europe/Oslo. Frittstående (ingen workspace-
 * avhengigheter) så den er triviell å enhetsteste.
 * Vercel Cron er UTC-only og kan ikke uttrykke «08:00 Oslo» direkte — offset
 * skifter sommer/vinter (cet/cest). Vi lar cron trigge på alle aktuelle UTC-timer
 * og bruker `osloHour` i handleren til å kjøre kun på de ekte Oslo-timene.
 */

/** Timen (0–23) i Europe/Oslo for et gitt tidspunkt — dst-korrekt via iana-sonen. */
export function osloHour(date: Date = new Date()): number {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  const hour = Number.parseInt(hourStr, 10);
  // '24' kan forekomme ved midnatt i enkelte miljøer — normaliser til 0.
  return hour === 24 ? 0 : hour;
}

/** Timene (Oslo) den planlagte Quick-pullen skal kjøre: 08:00 og 16:00. */
export const QUICK_PULL_HOURS_OSLO = [8, 16] as const;

/** True hvis `date` faller på en av de planlagte Oslo-pull-timene. */
export function isQuickPullHour(date: Date = new Date()): boolean {
  const h = osloHour(date);
  return QUICK_PULL_HOURS_OSLO.some((x) => x === h);
}
