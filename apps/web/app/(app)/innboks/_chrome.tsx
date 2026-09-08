import { type ReactNode, Suspense } from 'react';
import { DetaljerSlot } from './_detaljer-slot';
import { InboxHovedflate } from './_hovedflate';
import { InboxSidebar } from './_inbox-sidebar';
import { type InboxModus, InboxModusProvider } from './_modus';

/**
 * F5-11 / F5-14 — innboksens tre kolonner. Gjenbrukt av /innboks og
 * /endwise/innboks; `modus` styrer datakilde og kopi, ikke layouten.
 * `relative` + `h-full` så detaljer-overlay bor inne i chrome (under
 * telefon-toppbar), ikke `fixed` over viewport.
 */
export function InboxChrome({ modus, children }: { modus: InboxModus; children: ReactNode }) {
  return (
    <InboxModusProvider modus={modus}>
      <div
        data-innboks-chrome
        className="relative flex h-full min-h-0 flex-1 overflow-hidden"
      >
        <Suspense fallback={<aside className="flex min-h-0 w-full shrink-0 md:w-[320px]" />}>
          <InboxSidebar />
        </Suspense>
        <Suspense fallback={<div className="min-h-0 min-w-0 flex-1 overflow-hidden" />}>
          <InboxHovedflate>{children}</InboxHovedflate>
        </Suspense>
        <Suspense fallback={null}>
          <DetaljerSlot />
        </Suspense>
      </div>
    </InboxModusProvider>
  );
}
