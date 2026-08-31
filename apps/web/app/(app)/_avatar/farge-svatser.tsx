'use client';

import { BLOUB_FARGE_LABEL, COLORS, type ColorId, hexForFarge } from '@endwise/ui';
import { trpc } from '@/lib/trpc';

/**
 * Tolv faste svatsjer. Dealer setter ansattfarge — ikke fri velger, ikke ansikt.
 */
export function FargeSvatser({
  userId,
  valgt,
}: {
  userId: string;
  valgt: string | null | undefined;
}) {
  const utils = trpc.useUtils();
  const sett = trpc.team.setFarge.useMutation({
    onSuccess: () => {
      void utils.team.list.invalidate();
      void utils.mechanics.oversikt.invalidate();
      void utils.profile.meg.invalidate();
      void utils.bookings.calendar.invalidate();
      void utils.bookings.list.invalidate();
    },
  });

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-2 px-0 text-[12px] text-fg-muted">Farge</legend>
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((c) => {
          const aktiv = valgt === c.id;
          return (
            <button
              key={c.id}
              type="button"
              title={BLOUB_FARGE_LABEL[c.id]}
              aria-label={BLOUB_FARGE_LABEL[c.id]}
              aria-pressed={aktiv}
              disabled={sett.isPending}
              onClick={() => sett.mutate({ userId, farge: c.id })}
              className={`size-6 rounded-full border transition-shadow focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${
                aktiv ? 'ring-2 ring-fg ring-offset-2 ring-offset-bg' : 'border-border'
              }`}
              style={{ backgroundColor: hexForFarge(c.id as ColorId) }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
