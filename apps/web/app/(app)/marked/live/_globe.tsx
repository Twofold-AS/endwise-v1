'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import type { StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { subscribeVisitors } from './_visitors';

/**
 * Mørkt globe-kart bygget på MapLibre GL JS (open-source, ingen API-nøkkel) —
 * samme motor som mapcn. mapcn.dev/registry var utilgjengelig (web_fetch-timeout),
 * så komponenten er skrevet direkte på MapLibre i mapcn-ånd; bytt gjerne inn den
 * offisielle wrapperen senere (`npx shadcn@latest add https://mapcn.dev/maps/map.json`).
 *
 * Grønne prikker = besøkende akkurat nå. Data via `subscribeVisitors` (simulert
 * nå, SSE-klar). Prikkene dukker opp per by og forsvinner etter en TTL → live-følelse.
 */
const DARK_GLOBE_STYLE: StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    maplibre: { type: 'vector', url: 'https://demotiles.maplibre.org/tiles/tiles.json' },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0e0e0e' } },
    {
      id: 'countries',
      type: 'fill',
      source: 'maplibre',
      'source-layer': 'countries',
      paint: { 'fill-color': '#1c1c1c', 'fill-outline-color': '#2f2f2f' },
    },
  ],
  sky: {},
};

export function LiveVisitorsGlobe() {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // biome-ignore lint/suspicious/noExplicitAny: MapLibre-typer lastes dynamisk
    let map: any;
    let unsub: (() => void) | undefined;
    // biome-ignore lint/suspicious/noExplicitAny: markør-refs
    const markers = new Map<string, any>();

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !ref.current) return;
      map = new maplibregl.Map({
        container: ref.current,
        style: DARK_GLOBE_STYLE,
        center: [10, 55],
        zoom: 1.4,
        attributionControl: false,
      });
      map.on('style.load', () => map.setProjection({ type: 'globe' }));

      unsub = subscribeVisitors((ev) => {
        const el = document.createElement('div');
        Object.assign(el.style, {
          width: '10px',
          height: '10px',
          borderRadius: '9999px',
          background: '#1ED27D',
          boxShadow: '0 0 0 4px rgba(30,210,125,0.25), 0 0 10px 2px rgba(30,210,125,0.6)',
        });
        const m = new maplibregl.Marker({ element: el }).setLngLat([ev.lng, ev.lat]).addTo(map);
        markers.set(ev.id, m);
        setCount(markers.size);
        setTimeout(() => {
          m.remove();
          markers.delete(ev.id);
          setCount(markers.size);
        }, ev.ttlMs ?? 8000);
      });
    })();

    return () => {
      cancelled = true;
      unsub?.();
      for (const m of markers.values()) m.remove();
      map?.remove();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#0e0e0e]">
      <div ref={ref} className="h-full w-full" />
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-lg border border-border bg-bg/80 px-3 py-1.5 backdrop-blur">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary/70 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <span className="font-semibold text-fg text-sm tabular-nums">{count}</span>
        <span className="text-fg-muted text-xs">ser på nå</span>
      </div>
    </div>
  );
}
