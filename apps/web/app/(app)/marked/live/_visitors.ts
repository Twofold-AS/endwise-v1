/**
 * Live besøks-events for globen.
 * Simulert NÅ. Ekte data kommer fra widgeten via SSE (apps/stream). Bytt
 * `subscribeVisitors` sin body til en EventSource uten å røre globe-komponenten:
 * export function subscribeVisitors(onEvent) {
 * const es = new EventSource('/stream/visitors'); // apps/stream (F4-14/F11)
 * es.onmessage = (m) => onEvent(JSON.parse(m.data) as VisitorEvent);
 * return => es.close;
 * }
 * Kontrakten (VisitorEvent + subscribe→unsubscribe) er den samme, så byttet er
 * én funksjon.
 */
export type VisitorEvent = {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** Hvor lenge prikken vises (ms). */
  ttlMs?: number;
};

const CITIES: Omit<VisitorEvent, 'id' | 'ttlMs'>[] = [
  { city: 'Oslo', country: 'NO', lat: 59.91, lng: 10.75 },
  { city: 'Bergen', country: 'NO', lat: 60.39, lng: 5.32 },
  { city: 'Trondheim', country: 'NO', lat: 63.43, lng: 10.39 },
  { city: 'Stavanger', country: 'NO', lat: 58.97, lng: 5.73 },
  { city: 'Stockholm', country: 'SE', lat: 59.33, lng: 18.06 },
  { city: 'København', country: 'DK', lat: 55.68, lng: 12.57 },
  { city: 'Hamburg', country: 'DE', lat: 53.55, lng: 9.99 },
  { city: 'London', country: 'GB', lat: 51.51, lng: -0.13 },
  { city: 'Amsterdam', country: 'NL', lat: 52.37, lng: 4.9 },
  { city: 'Paris', country: 'FR', lat: 48.86, lng: 2.35 },
  { city: 'Berlin', country: 'DE', lat: 52.52, lng: 13.4 },
  { city: 'New York', country: 'US', lat: 40.71, lng: -74.0 },
];

export function subscribeVisitors(onEvent: (e: VisitorEvent) => void): () => void {
  const iv = setInterval(
    () => {
      const c = CITIES[Math.floor(Math.random() * CITIES.length)];
      onEvent({
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Math.random()),
        ...c,
        // liten jitter så prikkene ikke stables oppå hverandre
        lat: c.lat + (Math.random() - 0.5) * 0.8,
        lng: c.lng + (Math.random() - 0.5) * 0.8,
        ttlMs: 6000 + Math.random() * 6000,
      });
    },
    700 + Math.random() * 500,
  );
  return () => clearInterval(iv);
}
