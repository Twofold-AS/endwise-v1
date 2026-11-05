'use client';

import { Drawer, DrawerBody, DrawerHeader } from '@endwise/ui';
import type { ReactNode } from 'react';

/** Board Drawer fra bunnen — varsler, kurv, Ronny, jobbdetaljer. */
export function KundeBunnArk({
  tittel,
  apen,
  onLukk,
  children,
}: {
  tittel: string;
  apen: boolean;
  onLukk: () => void;
  children: ReactNode;
}) {
  return (
    <Drawer
      placement="bottom"
      isOpen={apen}
      onOpenChange={(o) => {
        if (!o) onLukk();
      }}
      aria-label={tittel}
    >
      <DrawerHeader title={tittel} closeLabel="Lukk" />
      <DrawerBody className="px-4 pb-6">{children}</DrawerBody>
    </Drawer>
  );
}
