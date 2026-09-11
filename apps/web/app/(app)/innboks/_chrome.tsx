import { type ReactNode, Suspense } from 'react';
import { DetaljerSlot } from './_detaljer-slot';
import { InboxHovedflate } from './_hovedflate';
import { InboxSidebar } from './_inbox-sidebar';
import { type InboxModus, InboxModusProvider } from './_modus';
import { InboxTopBar2 } from './_top-bar2';

/**
 * F5-11 / F5-14 — innboksens tre kolonner. Gjenbrukt av /innboks og
 * /endwise/innboks; `modus` styrer datakilde og kopi, ikke layouten.
 * Desktop: Innstillinger-chrome (tittel + top-bar 2). Telefon: PhoneShell.
 */
export function InboxChrome({ modus, children }: { modus: InboxModus; children: ReactNode }) {
  return (
    <InboxModusProvider modus={modus}>
      <div
        data-innboks-chrome
        className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div
          data-innboks-desktop-chrome
          className="hidden shrink-0 flex-col gap-4 px-8 pt-7 pb-3 md:flex"
        >
          <h1 className="text-title text-fg">Innboks</h1>
          <Suspense fallback={null}>
            <InboxTopBar2 desktop />
          </Suspense>
        </div>
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
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
      </div>
    </InboxModusProvider>
  );
}
