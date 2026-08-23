'use client';

import { LESING_TITLE } from '../../../_lib/plattform';
import { CardShell } from '../../../_shell/cards';

export function LesingTom({ tittel, tekst }: { tittel: string; tekst: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">{tittel}</h1>
        <p className="text-body text-fg-muted">{tekst}</p>
      </div>
      <CardShell className="p-5">
        <p className="text-[12px] text-fg-muted" title={LESING_TITLE}>
          Kun lesing. Skriving er stengt.
        </p>
      </CardShell>
    </div>
  );
}

export function LesingFeil({ melding }: { melding: string }) {
  return <p className="px-8 py-7 text-body text-danger">{melding}</p>;
}
