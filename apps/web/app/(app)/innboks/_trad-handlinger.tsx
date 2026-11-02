'use client';

import { DeaktivertHandling } from '@endwise/ui';
import { InviterAnsatt } from './_inviter-ansatt';

/**
 * Claude §4.3 CHATACT. Inviter = ekte `messages.forkThread`.
 * Fjern, Forlat og Løst vises deaktivert til API finnes.
 */
export function TradHandlinger({ threadId }: { threadId: string }) {
  return (
    <nav
      data-innboks-trad-handlinger
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Samtale"
    >
      <InviterAnsatt threadId={threadId} />
      <DeaktivertHandling forklaring="Kommer senere">Fjern</DeaktivertHandling>
      <DeaktivertHandling forklaring="Kommer senere">Forlat</DeaktivertHandling>
      <DeaktivertHandling forklaring="Kommer senere">Marker som løst</DeaktivertHandling>
    </nav>
  );
}
