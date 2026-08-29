'use client';

import { EndwiseWidget } from '@endwise/widget-ui';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';

/**
 * Midlertidig testplassering av den eksisterende kundewidgeten (F4-03).
 * Ikke en ny booking. Synlig bare når shop-flagget er på (samme gate som Butikk).
 */
export function ButikkBookingWidget() {
  const { shopEnabled } = useOrgRole();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const embed = trpc.shop.bookingWidget.useQuery(
    { origin },
    { enabled: shopEnabled && origin.length > 0, retry: false },
  );

  if (!shopEnabled) return null;

  return (
    <section
      className="flex w-full max-w-[420px] flex-col gap-2"
      data-testid="butikk-booking-widget"
    >
      <p className="text-[12px] text-fg-muted">
        Testplassering av booking-widgeten. Midlertidig, på Butikk.
      </p>
      {embed.isError ? (
        <p className="text-body text-danger">{embed.error.message}</p>
      ) : embed.isLoading || !embed.data ? (
        <p className="text-body text-fg-muted">Laster booking-widget …</p>
      ) : (
        <EndwiseWidget
          apiBase={embed.data.apiBase}
          publishableKey={embed.data.publishableKey}
          locale="no"
        />
      )}
    </section>
  );
}
