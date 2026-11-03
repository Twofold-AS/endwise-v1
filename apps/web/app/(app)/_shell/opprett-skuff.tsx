'use client';

import { Drawer, DrawerBody, DrawerHeader } from '@endwise/ui';
import { type ReactNode, useSyncExternalStore } from 'react';

function abonnerMobil(onStoreChange: () => void) {
  const mq = window.matchMedia('(max-width: 767px)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function lesMobil() {
  return window.matchMedia('(max-width: 767px)').matches;
}

/** SSR antar telefon — PR #184 er mobil-først. Desktop hydrerer til inline. */
export function useErMobil() {
  return useSyncExternalStore(abonnerMobil, lesMobil, () => true);
}

/**
 * Opprett-/Ny-handling: Board bunn-Drawer på telefon (samme som Detaljer).
 * Desktop: innholdet inline, så eksisterende sider ikke regresserer.
 */
export function OpprettSkuff({
  tittel,
  apen,
  onLukk,
  children,
  tvingSkuff = false,
  'aria-label': ariaLabel,
}: {
  tittel: string;
  apen: boolean;
  onLukk: () => void;
  children: ReactNode;
  /** Alltid skuff, også på desktop (f.eks. visuell preview). */
  tvingSkuff?: boolean;
  'aria-label'?: string;
}) {
  const mobil = useErMobil();
  if (!mobil && !tvingSkuff) {
    if (!apen) return null;
    return <div data-opprett-inline>{children}</div>;
  }
  // RAC ModalOverlay må sitte i treet — mount-kun-når-åpen viser ingenting.
  return (
    <Drawer
      placement="bottom"
      isOpen={apen}
      onOpenChange={(o) => {
        if (!o) onLukk();
      }}
      aria-label={ariaLabel ?? tittel}
    >
      <DrawerHeader title={tittel} />
      <DrawerBody className="px-3 pb-6">{children}</DrawerBody>
    </Drawer>
  );
}
