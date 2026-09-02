'use client';

import { trpc } from '@/lib/trpc';

/**
 * Bare forhandlernavn som tittel. Ingen kort, ingen Grainient-hero, ingen felt.
 */
export function ForhandlerInfoKort() {
  const kort = trpc.forhandler.kort.useQuery();
  const navn = kort.data?.name?.trim() || 'Forhandleren';

  return (
    <h1 data-forhandler-info data-forhandlernavn className="text-title text-fg">
      {kort.isLoading ? '…' : navn}
    </h1>
  );
}
