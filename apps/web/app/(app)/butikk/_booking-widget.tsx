'use client';

import { EndwiseWidget, type WidgetService } from '@endwise/widget-ui';
import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';

/**
 * Midlertidig testplassering av den eksisterende kundewidgeten (F4-03).
 * Ikke en ny booking. Synlig bare når shop-flagget er på (samme gate som Butikk).
 * Tjenestene kommer fra Salg (`services.list`) — samme SoR som widget-API-et.
 * Dealer-profil-tabellen er utenfor denne flaten.
 */
export function ButikkBookingWidget() {
  const { shopEnabled } = useOrgRole();
  const [origin, setOrigin] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const embed = trpc.shop.bookingWidget.useQuery(
    { origin },
    { enabled: shopEnabled && origin.length > 0, retry: false },
  );
  const katalog = trpc.services.list.useQuery(undefined, {
    enabled: shopEnabled,
    retry: false,
  });

  const initialServices = useMemo<WidgetService[]>(
    () =>
      (katalog.data ?? [])
        .filter((t) => t.active)
        .map((t) => ({
          serviceVersionId: t.serviceVersionId,
          name: t.name,
          vehicleType: t.vehicleType,
          durationMinutes: t.durationMinutes,
          priceMinor: t.priceMinor,
        })),
    [katalog.data],
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
        <div className="flex flex-col gap-2">
          <p className="text-body text-fg-muted">Kunne ikke starte booking-widgeten.</p>
          <button
            type="button"
            onClick={() => {
              setRetry((n) => n + 1);
              void embed.refetch();
            }}
            className="inline-flex h-control items-center self-start rounded-control border border-border px-3 text-label text-fg"
          >
            Prøv igjen
          </button>
        </div>
      ) : embed.isLoading || !embed.data ? (
        <p className="text-body text-fg-muted">Laster booking-widget …</p>
      ) : (
        <EndwiseWidget
          key={`${embed.data.publishableKey}-${retry}`}
          apiBase={embed.data.apiBase || origin}
          publishableKey={embed.data.publishableKey}
          locale="no"
          initialServices={initialServices}
        />
      )}
    </section>
  );
}
