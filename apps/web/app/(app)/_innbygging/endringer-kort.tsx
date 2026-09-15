'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { StatusMerke } from './status-merke';
import type { EndringBehandling, EndringKort } from './endringer';

/**
 * Endringer-kort: type · meldt av · jobb · foreslått dato/mekaniker ·
 * Godkjenn / Avslå · Behandlet. Mobbin 24, uten pip.
 */
export function EndringKortRad({
  kort,
  onBehandle,
}: {
  kort: EndringKort;
  onBehandle: (id: string, til: EndringBehandling) => void;
}) {
  const venter = kort.behandling === 'venter';
  return (
    <article
      data-endringer-kort={kort.id}
      data-endringer-type={kort.type}
      data-endringer-mock={kort.mock ? '1' : undefined}
      className="flex flex-col gap-2 rounded-[24px] border border-divide bg-card px-4 py-3 shadow-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label font-[650] text-fg">{kort.typeLabel}</p>
        {kort.mock ? (
          <span className="text-[11px] text-fg-muted">Merket mock — ingen API ennå</span>
        ) : (
          <StatusMerke status={kort.type === 'avvik' ? 'avvik' : 'foresporsel'} />
        )}
      </div>
      <p className="text-[12px] text-fg-muted">
        Meldt av <span className="text-fg">{kort.meldtAv}</span>
      </p>
      <p className="text-label text-fg">{kort.jobb}</p>
      <p className="text-[12px] text-fg-muted">{kort.forslag}</p>
      {kort.behandling !== 'venter' ? (
        <p data-endringer-behandlet className="text-label text-fg">
          {kort.behandling === 'godkjent' ? 'Behandlet · godkjent' : 'Behandlet · avslått'}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {kort.jobbId ? (
          <Link
            href={`/bookinger/${kort.jobbId}` as Route}
            className="text-[12px] text-fg underline-offset-2 hover:underline"
          >
            Åpne jobb
          </Link>
        ) : (
          <span className="text-[12px] text-fg-muted">Ingen jobb-lenke</span>
        )}
        {venter ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-endringer-avsla
              className="inline-flex h-8 items-center rounded-full border border-divide px-3 text-[12px] text-fg"
              onClick={() => onBehandle(kort.id, 'avslatt')}
            >
              Avslå
            </button>
            <button
              type="button"
              data-endringer-godkjenn
              className="inline-flex h-8 items-center rounded-full bg-fg px-3 text-[12px] font-[650] text-bg"
              onClick={() => onBehandle(kort.id, 'godkjent')}
            >
              Godkjenn
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
