'use client';

import { Megaphone } from '@endwise/ui';
import { CardShell, NewBadge } from '../../_shell/cards';
import { LiveVisitorsGlobe } from './_globe';

/**
 * Marked → Live besøkende. Globe (MapLibre gl, mørkt, ingen API-nøkkel) som viser
 * hvor folk ser på forhandlerens nettside akkurat nå. Simulerte prikker nå — klar
 * for ekte SSE-strøm fra widgeten (apps/stream), se `_visitors.ts`.
 */
export default function LiveBesokendePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-8 py-7">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Live besøkende</h1>
        <NewBadge />
        <span className="ml-auto text-fg-faint text-xs">
          Simulert nå · klar for SSE fra widgeten (apps/stream)
        </span>
      </div>

      <CardShell>
        {/* Innhold øverst (globe), tekst under — TheFold-kortstil, dobbel kant. */}
        <div className="h-[520px]">
          <LiveVisitorsGlobe />
        </div>
        <div className="flex flex-col gap-0.5 px-1.5 pt-2 pb-1">
          <p className="font-semibold text-[13px] text-fg">Hvor folk ser på nå</p>
          <p className="text-[12px] text-fg-faint leading-snug">
            Grønne prikker = aktive besøk på forhandlerens Framer-side. Live-telleren oppdateres per
            besøks-event.
          </p>
        </div>
      </CardShell>
    </div>
  );
}
