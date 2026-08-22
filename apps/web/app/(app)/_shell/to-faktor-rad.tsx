'use client';

import { TO_FAKTOR_OPPSETT_STI, toFaktorStatusTekst } from '@endwise/auth/to-faktor-oppsett';
import { ShieldCheck } from '@endwise/ui';

/**
 * F1-20 — 2FA-statusrad. Samme lesing som mekanikerens «Meg»:
 * `session.user.twoFactorEnabled`. Lenken går til `/2fa-oppsett` (utenfor
 * 2FA-gaten), så den som ikke har slått på ennå faktisk kommer fram.
 *
 * Slå-av (F1-22) og gjenopprettingskoder (F1-21) er bevisst ikke her.
 */
export function ToFaktorRad({ enabled }: { enabled: boolean | undefined }) {
  const pa = enabled === true;
  return (
    <div className="flex h-row-store items-center gap-3 bg-bg px-4">
      <ShieldCheck size={16} className="shrink-0 text-fg-muted" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label text-fg">To-faktor</span>
        <span className="text-[12px] text-fg-muted">{toFaktorStatusTekst(enabled)}</span>
      </div>
      <a
        href={TO_FAKTOR_OPPSETT_STI}
        className="inline-flex h-control shrink-0 items-center rounded-control border border-border px-3 text-fg text-label transition-colors hover:bg-surface-2"
      >
        {pa ? 'Åpne oppsett' : 'Sett opp'}
      </a>
    </div>
  );
}
