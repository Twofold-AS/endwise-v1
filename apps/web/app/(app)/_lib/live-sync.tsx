'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import {
  erStreamUautorisert,
  kanHenteStreamHead,
  kanPolleStreamSince,
  LAST_EVENT_STORAGE_KEY,
  liveFamiliesForEvent,
  parseLastEventId,
  shouldPlayInboundSound,
  streamPollIntervalMs,
} from './live-event';
import { useLyd } from './lyd';
import { useEventStream } from './use-event-stream';

/**
 * App-bred oppfriskning av tRPC-cachen ved live events.
 * Innboks-sidene lyttet hver for seg. Når mottakeren sto i en åpen tråd, ble
 * lista ikke invalidert; sto hen et annet sted, ble verken tråd eller liste
 * oppdatert. Pakkebytte publiserte ingenting. ÉN lytter i shellet fikser begge.
 * SSE er den raske veien. Poll mot `stream.since` er reserven (F13-03) hvis
 * strømmen er nede eller rewriten buffer. Uten sesjon *og* tenantId: ingen
 * poll og ingen SSE. 401/UNAUTHORIZED på head/since slår av polleren
 * (ingen refetchInterval, ingen window-focus, ingen innloggings-bounce).
 */
function invalidateFamily(
  utils: ReturnType<typeof trpc.useUtils>,
  family: 'inbox' | 'entitlements',
) {
  if (family === 'inbox') {
    void utils.messages.listThreads.invalidate();
    void utils.messages.listMessages.invalidate();
    void utils.messages.listPlatformSupport.invalidate();
    void utils.messages.listPlatformSupportMessages.invalidate();
    return;
  }
  void utils.billing.katalog.invalidate();
  void utils.billing.subscription.invalidate();
  void utils.billing.integrations.invalidate();
  void utils.session.me.invalidate();
  void utils.tenants.listModules.invalidate();
  void utils.quick.config.invalidate();
}

function lagretCursor(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const n = parseLastEventId(sessionStorage.getItem(LAST_EVENT_STORAGE_KEY));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function LiveSync({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const harSesjon = Boolean(session?.user);
  const me = trpc.session.me.useQuery(undefined, { enabled: harSesjon, retry: false });
  const tenantId = typeof me.data?.tenantId === 'string' ? me.data.tenantId : null;
  const [stoppet, setStoppet] = useState(false);
  const lyd = useLyd();
  const sett = useRef(new Set<string>());
  const sistLyd = useRef(0);
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    const n = lagretCursor();
    if (n != null) setCursor((c) => c ?? n);
  }, []);

  useEffect(() => {
    if (cursor == null || cursor <= 0) return;
    try {
      sessionStorage.setItem(LAST_EVENT_STORAGE_KEY, String(cursor));
    } catch {
      /* privat modus */
    }
  }, [cursor]);

  const apply = useCallback(
    (event: { id?: string | number | null; type: string }) => {
      const key =
        event.id != null && String(event.id) !== ''
          ? String(event.id)
          : `${event.type}:${Date.now()}`;
      if (sett.current.has(key)) return;
      sett.current.add(key);
      if (sett.current.size > 400) {
        const eldste = sett.current.values().next().value;
        if (eldste) sett.current.delete(eldste);
      }

      for (const family of liveFamiliesForEvent(event.type)) {
        invalidateFamily(utils, family);
      }

      if (shouldPlayInboundSound(event.type)) {
        const naa = Date.now();
        if (naa - sistLyd.current > 1200) {
          sistLyd.current = naa;
          lyd.nyMelding();
        }
      }

      const n = typeof event.id === 'number' ? event.id : parseLastEventId(event.id);
      if (n > 0) {
        setCursor((forrige) => (forrige == null || n > forrige ? n : forrige));
      }
    },
    [utils, lyd],
  );

  const status = useEventStream(apply, harSesjon && Boolean(tenantId));

  const head = trpc.stream.head.useQuery(undefined, {
    enabled: kanHenteStreamHead({ harSesjon, tenantId, stoppet }),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (cursor != null) return;
    if (typeof head.data?.lastEventId !== 'number') return;
    setCursor(head.data.lastEventId);
  }, [cursor, head.data?.lastEventId]);

  /**
   * Helpdesk-artikler er globale og har ingen SSE i pr #36 LiveSync
   * (`message.created` / `tenant.modules.changed`). Window-focus er
   * oppfriskningen, så Ny og slideren ikke sitter på stale 5-min cache.
   */
  useEffect(() => {
    const oppfrisk = () => {
      void utils.helpdesk.list.invalidate();
      void utils.helpdesk.ulesteAntall.invalidate();
    };
    window.addEventListener('focus', oppfrisk);
    return () => window.removeEventListener('focus', oppfrisk);
  }, [utils]);

  const poll = trpc.stream.since.useQuery(
    { lastEventId: cursor ?? 0 },
    {
      enabled: kanPolleStreamSince({ harSesjon, tenantId, cursor, stoppet }),
      refetchInterval: (query) =>
        streamPollIntervalMs({
          stoppet,
          live: status === 'live',
          error: query.state.error,
        }),
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  useEffect(() => {
    if (erStreamUautorisert(head.error) || erStreamUautorisert(poll.error)) {
      setStoppet(true);
    }
  }, [head.error, poll.error]);

  useEffect(() => {
    const events = poll.data ?? [];
    for (const e of events) {
      apply({ id: e.id, type: e.type });
    }
  }, [poll.data, apply]);

  return children;
}
