'use client';

import { Drawer, DrawerBody, DrawerHeader } from '@endwise/ui';
import { useState } from 'react';
import { DetaljerPanel } from './_detaljer';

/**
 * Mobil samtale: «Detaljer» er outline-pille som åpner bunn-Drawer.
 * Lukket som default. Desktop-panelet (DetaljerSlot) urørt.
 */
export function SamtaleDetaljerPille({ threadId }: { threadId: string }) {
  const [apen, setApen] = useState(false);

  return (
    <div className="md:hidden" data-samtale-detaljer>
      <button
        type="button"
        data-innboks-detaljer-chip
        onClick={() => setApen(true)}
        aria-expanded={apen}
        aria-label="Vis detaljer om samtalen"
        className="inline-flex h-10 items-center rounded-pill border border-fg bg-bg px-4 text-[13px] font-[650] text-fg"
      >
        Detaljer
      </button>
      <Drawer
        placement="bottom"
        isOpen={apen}
        onOpenChange={setApen}
        aria-label="Detaljer om samtalen"
      >
        <DrawerHeader title="Detaljer" />
        <DrawerBody className="px-3">
          <DetaljerPanel threadId={threadId} apen={apen} onLukk={() => setApen(false)} innebygd />
        </DrawerBody>
      </Drawer>
    </div>
  );
}
