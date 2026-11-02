'use client';

import { InviterAnsatt } from './_inviter-ansatt';

/**
 * Claude §4.3 CHATACT. Inviter = ekte `messages.forkThread`.
 * Fjern / Forlat / Løst er skjult — ingen tRPC ennå.
 */
export function TradHandlinger({ threadId }: { threadId: string }) {
  return (
    <nav
      data-innboks-trad-handlinger
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Samtale"
    >
      <InviterAnsatt threadId={threadId} />
    </nav>
  );
}
