'use client';

import { InviterAnsatt } from './_inviter-ansatt';

/**
 * Claude §4.3 CHATACT. Inviter = ekte `messages.forkThread`.
 * Fjern / Forlat / Løst har ingen tRPC — ærlig «ingen API», ikke stub-kall.
 */
export function TradHandlinger({ threadId }: { threadId: string }) {
  return (
    <div
      data-innboks-trad-handlinger
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Samtale"
    >
      <InviterAnsatt threadId={threadId} />
      <span
        data-innboks-ingen-api="fjern"
        title="Ingen API"
        className="inline-flex min-h-11 items-center rounded-control px-2.5 text-label text-fg-muted"
      >
        Fjern — ingen API
      </span>
      <span
        data-innboks-ingen-api="forlat"
        title="Ingen API"
        className="inline-flex min-h-11 items-center rounded-control px-2.5 text-label text-fg-muted"
      >
        Forlat — ingen API
      </span>
      <span
        data-innboks-ingen-api="lost"
        title="Ingen API"
        className="inline-flex min-h-11 items-center rounded-control px-2.5 text-label text-fg-muted"
      >
        Løst — ingen API
      </span>
    </div>
  );
}
