import type { ReactNode } from 'react';
import { DetaljerSlot } from './_detaljer-slot';
import { InboxSidebar } from './_inbox-sidebar';
import { type InboxModus, InboxModusProvider } from './_modus';

/**
 * F5-11 / F5-14 — innboksens tre kolonner. Gjenbrukt av /innboks og
 * /endwise/innboks; `modus` styrer datakilde og kopi, ikke layouten.
 */
export function InboxChrome({ modus, children }: { modus: InboxModus; children: ReactNode }) {
  return (
    <InboxModusProvider modus={modus}>
      <div className="flex h-full min-h-0 overflow-hidden">
        <InboxSidebar />
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
        <DetaljerSlot />
      </div>
    </InboxModusProvider>
  );
}
