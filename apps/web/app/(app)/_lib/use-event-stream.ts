'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LAST_EVENT_STORAGE_KEY,
  LIVE_DOMAIN_EVENTS,
  nextLastEventId,
  parseLastEventId,
  streamSseUrl,
} from './live-event';

/**
 * Klientsiden av sanntidskanalen.
 * `apps/stream` har vært ferdig lenge; det som manglet var noen som lyttet.
 * Hooken er bevisst tynn: den gjør ÉN ting — leverer eventer og en ærlig
 * tilkoblingsstatus. Den holder ikke på domenetilstand.
 * Payloaden brukes aldri som innhold. Serveren sender med vilje bare
 * «hva skjedde + hvilken subjectId» — selve meldingen hentes gjennom tRPC, og
 * dermed gjennom RLS. Derfor er mønsteret i kallstedene alltid:
 * event → invalidate query → hent på nytt*, aldri *event → skriv rett i UI*.
 * Et UI som stoler på pushet innhold, viser til slutt noe RLS aldri godkjente.
 */
export type StreamStatus = 'connecting' | 'live' | 'idle';

export interface StreamEvent {
  /** SSE `id:` — brukes som Last-Event-ID ved reconnect. */
  id?: string | null;
  /** Event-typen, f.eks. `message.created`, `thread.escalated`, `agent.token`. */
  type: string;
  /** Tråden/objektet eventet gjelder. Null for tenant-brede eventer. */
  subjectId: string | null;
  /** Resten av serverens payload. Metadata — aldri sannheten om innholdet. */
  data: Record<string, unknown>;
}

/*
 * Én delt tilkobling per fane (refaktorert)
 * Hooken åpnet tidligere en egen `EventSource` per kallsted. Med én lytter
 * i appen gikk det bra. Da varslingslyden (F5-19) skulle lytte app-bredt, ble
 * det plutselig to per fane — og serveren har et tak:
 * `MAX_CONNECTIONS_PER_USER = 5` (`packages/modules/src/stream/`). To vinduer
 * × to lyttere = fire, tre vinduer = seks, og den sjette får 429. Nøyaktig det
 * scenarioet en toparts-test i to nettleservinduer er.
 * Nå deler alle kallsteder ÉN strøm: første abonnent åpner den, siste lukker
 * den. Det er både billigere og mer korrekt — avspilling siden `Last-Event-ID`
 * skjer én gang, ikke én gang per komponent som tilfeldigvis lyttet.
 */
type Abonnent = {
  onEvent: (event: StreamEvent) => void;
  onStatus: (status: StreamStatus) => void;
};

let kilde: EventSource | null = null;
let sisteStatus: StreamStatus = 'idle';
const abonnenter = new Set<Abonnent>();

function settStatus(status: StreamStatus) {
  sisteStatus = status;
  for (const a of abonnenter) a.onStatus(status);
}

function lagretLastEventId(): number {
  try {
    return parseLastEventId(sessionStorage.getItem(LAST_EVENT_STORAGE_KEY));
  } catch {
    return 0;
  }
}

function huskLastEventId(id: string | null) {
  if (!id) return;
  try {
    const next = nextLastEventId(lagretLastEventId(), id);
    sessionStorage.setItem(LAST_EVENT_STORAGE_KEY, String(next));
  } catch {
    /* privat modus / utilgjengelig storage */
  }
}

function apne() {
  if (kilde) return;
  settStatus('connecting');
  // Same-origin (Next rewrite → apps/stream). EventSource sender sesjons-
  // cookien selv; ingen token i URL-en. lastEventId i query er for nye
  // EventSource-instanser (browseren husker Last-Event-ID bare på den gamle).
  const source = new EventSource(streamSseUrl(lagretLastEventId()));
  kilde = source;

  for (const type of LIVE_DOMAIN_EVENTS) {
    source.addEventListener(type, (event: MessageEvent<string>) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(event.data) as Record<string, unknown>;
      } catch {
        // En enkelt uparsbar payload skal ikke rive ned strømmen — samme
        // holdning som serveren har til én feilet levering.
        return;
      }
      const { subjectId, ...rest } = parsed;
      const id = event.lastEventId || null;
      huskLastEventId(id);
      const ut: StreamEvent = {
        id,
        type,
        subjectId: typeof subjectId === 'string' ? subjectId : null,
        data: rest,
      };
      // Kopi av settet: en abonnent som melder seg av inne i sin egen callback
      // skal ikke endre det vi itererer over.
      for (const a of [...abonnenter]) a.onEvent(ut);
    });
  }

  source.addEventListener('ready', () => settStatus('live'));
  source.addEventListener('heartbeat', () => settStatus('live'));
  source.onopen = () => settStatus('live');
  // EventSource kobler til igjen selv. `connecting` er ærligere enn `idle`:
  // den sier «ikke oppe nå», ikke «gitt opp».
  source.onerror = () => settStatus('connecting');
}

function lukkHvisTom() {
  if (abonnenter.size > 0 || !kilde) return;
  kilde.close();
  kilde = null;
  settStatus('idle');
}

export function useEventStream(onEvent: (event: StreamEvent) => void, enabled = true) {
  const [status, setStatus] = useState<StreamStatus>('idle');

  // Callbacken holdes i en ref slik at en ny inline-funksjon per render ikke
  // river ned og gjenoppretter SSE-forbindelsen. Reconnect er dyrt: hver
  // gjenoppkobling spiller av alt siden Last-Event-ID.
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    const abonnent: Abonnent = {
      onEvent: (event) => handler.current(event),
      onStatus: setStatus,
    };
    abonnenter.add(abonnent);
    apne();
    setStatus(sisteStatus);

    return () => {
      abonnenter.delete(abonnent);
      lukkHvisTom();
      setStatus('idle');
    };
  }, [enabled]);

  return status;
}
