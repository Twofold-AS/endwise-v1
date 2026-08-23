'use client';

import { MessageSquare } from '@endwise/ui';

/**
 * F5-11 — tom flate når ingen henvendelse er valgt.
 * Lista (og tomtilstanden der) bor i innboks-sidebaren.
 */
export default function EndwiseInnboksPage() {
  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Innboks</h1>
        <p className="text-body text-fg-muted">
          Velg en henvendelse i lista til venstre for å svare.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <MessageSquare size={24} className="text-fg-muted" />
        <p className="max-w-sm text-[12px] text-fg-muted leading-relaxed">
          Når et verksted skriver til Endwise, lander det her.
        </p>
      </div>
    </div>
  );
}
