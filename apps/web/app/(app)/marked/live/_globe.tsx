'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import type { StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { subscribeVisitors } from './_visitors';

/**
 * Globe-kart bygget på MapLibre gl JS (open-source, ingen API-nøkkel)
 * samme motor som mapcn. mapcn.dev/registry var utilgjengelig (web_fetch-timeout),
 * så komponenten er skrevet direkte på MapLibre i mapcn-ånd; bytt gjerne inn den
 * offisielle wrapperen senere (`npx shadcn@latest add https://mapcn.dev/maps/map.json`).
 * Grønne prikker = besøkende akkurat nå. Data via `subscribeVisitors` (simulert
 * nå, SSE-klar). Prikkene dukker opp per by og forsvinner etter en TTL → live-følelse.
 */
/**
 * Kartstilen bygges fra token-laget, ikke fra hardkodede hex-verdier (endret
 * ). Den gamle stilen var låst mørk (#0e0e0e hav, #1c1c1c land) og
 * ble en svart flekk midt i det lyse temaet.
 * MapLibre tar ikke `var(--…)` — den trenger ekte farger. Derfor leses tokenene
 * ut av DOM-en ved oppstart. Det er også grunnen til at kartet må bygges på
 * nytt når temaet bytter (se `key` på containeren).
 */
function lesToken(navn: string, reserve: string): string {
  if (typeof window === 'undefined') return reserve;
  const v = getComputedStyle(document.documentElement).getPropertyValue(navn).trim();
  return v || reserve;
}

function globeStyle(): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    sources: {
      maplibre: { type: 'vector', url: 'https://demotiles.maplibre.org/tiles/tiles.json' },
    },
    layers: [
      // «Havet» = kortets innerflate. Da smelter kloden inn i kortet i stedet
      // for å ligge oppå det som et vindu ut i verdensrommet.
      {
        id: 'bg',
        type: 'background',
        paint: { 'background-color': lesToken('--ew-inset', '#fafafa') },
      },
      {
        id: 'countries',
        type: 'fill',
        source: 'maplibre',
        'source-layer': 'countries',
        paint: {
          'fill-color': lesToken('--ew-surface-2', '#f5f5f5'),
          'fill-outline-color': lesToken('--ew-border-strong', '#d4d4d4'),
        },
      },
    ],
    sky: {},
  };
}

export function LiveVisitorsGlobe() {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  // Tema-bytte må bygge kartet på nytt — MapLibre-stilen er ekte farger, ikke
  // CSS-variabler, så den oppdaterer seg ikke av seg selv.
  const [tema, setTema] = useState<string>('light');
  useEffect(() => {
    const el = document.documentElement;
    setTema(el.dataset.theme ?? 'light');
    const obs = new MutationObserver(() => setTema(el.dataset.theme ?? 'light'));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `tema` er med vilje eneste avhengighet — den tvinger en full ombygging av kartet
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
        style: globeStyle(),
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
  }, [tema]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-inset">
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
