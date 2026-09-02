'use client';

import { TO_FAKTOR_OPPSETT_STI, toFaktorStatusTekst } from '@endwise/auth/to-faktor-oppsett';
import { ShieldCheck } from '@endwise/ui';

/**
 * 2FA-statusrad. Selvbetjent slå-av er stengt (Mons): stjålet sesjon
 * skal ikke kunne slå av TOTP. Leder tilbakestiller fra Team.
 */
export function ToFaktorRad({ enabled }: { enabled: boolean | undefined }) {
  const pa = enabled === true;

  return (
    <div className="flex flex-col">
      <div className="flex h-row-store items-center gap-3 bg-bg px-4">
        <ShieldCheck size={16} className="shrink-0 text-fg-muted" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label text-fg">To-faktor</span>
          <span className="text-[12px] text-fg-muted">{toFaktorStatusTekst(enabled)}</span>
        </div>
        {pa ? null : (
          <a
            href={TO_FAKTOR_OPPSETT_STI}
            className="inline-flex h-control shrink-0 items-center rounded-control border border-border px-3 text-fg text-label transition-colors hover:bg-surface-2"
          >
            Sett opp
          </a>
        )}
      </div>
      {pa ? (
        <p className="border-border border-t bg-inset px-4 py-3 text-[12px] text-fg-muted">
          Kan ikke slås av her. Be en leder om å tilbakestille.
        </p>
      ) : null}
    </div>
  );
}
