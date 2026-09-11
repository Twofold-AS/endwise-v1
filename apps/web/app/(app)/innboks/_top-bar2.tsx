'use client';

import { Trash2 } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import { INNBOKS_GRUPPER, useInboxFilter } from '../_shell/inbox-filter';
import { SorteringArk, SorteringGruppe, SorteringValg } from '../_shell/sortering-ark';

const TID_VALG = [
  { id: 'nyeste' as const, label: 'Nyeste' },
  { id: 'eldste' as const, label: 'Eldste' },
];

/**
 * Innboks-verktøylinje: Alle meldinger · Ny melding · Sortering · Slett.
 * Sortering åpner ett ark med Tid + Gruppe.
 */
export function InboxTopBar2({
  desktop = false,
  startPopup,
}: {
  desktop?: boolean;
  /** Visuell GO — åpne Sortering uten klikk. */
  startPopup?: 'sortering' | 'tid' | 'gruppe';
}) {
  const pathname = usePathname() ?? '';
  const params = useSearchParams();
  const {
    sortering,
    setSortering,
    part,
    setPart,
    velgModus,
    setVelgModus,
    valgte,
    skjulFlere,
    toemValgte,
  } = useInboxFilter();
  const [sorterApen, setSorterApen] = useState(false);
  const sorterRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (startPopup === 'sortering' || startPopup === 'tid' || startPopup === 'gruppe') {
      setSorterApen(true);
    }
  }, [startPopup]);

  const listeHref = pathname.startsWith('/endwise') ? '/endwise/innboks' : '/innboks';
  const nyHref = `${listeHref}?ny=1`;
  const nyAktiv = params?.get('ny') === '1';
  const alleAktiv = !nyAktiv && !sorterApen && !velgModus;

  function faneKlasse(aktiv: boolean) {
    return `shrink-0 border-b-2 pb-1 text-label ${
      aktiv ? 'border-fg font-[650] text-fg' : 'border-transparent text-fg-muted'
    }`;
  }

  function slett() {
    if (!velgModus) {
      setVelgModus(true);
      return;
    }
    if (valgte.size === 0) {
      setVelgModus(false);
      return;
    }
    skjulFlere([...valgte]);
    toemValgte();
    setVelgModus(false);
  }

  return (
    <div
      data-innboks-top-bar2
      data-innboks-verktoy
      className={`relative flex min-w-0 flex-1 items-end gap-5 ${desktop ? 'hidden md:flex' : ''}`}
      role="toolbar"
      aria-label="Innboks"
    >
      <Link
        href={listeHref as Route}
        data-innboks-alle
        aria-current={alleAktiv ? 'page' : undefined}
        onClick={() => setPart('alle')}
        className={faneKlasse(alleAktiv)}
      >
        Alle meldinger
      </Link>

      <Link
        href={nyHref as Route}
        data-innboks-ny-melding
        data-innboks-ny-samtale
        aria-current={nyAktiv ? 'page' : undefined}
        className={faneKlasse(nyAktiv)}
      >
        Ny melding
      </Link>

      <div ref={sorterRef} className="relative ml-auto flex items-end gap-5">
        <button
          type="button"
          data-innboks-sortering
          aria-expanded={sorterApen}
          aria-haspopup="true"
          aria-label="Sortering"
          onClick={() => setSorterApen((v) => !v)}
          className={faneKlasse(sorterApen)}
        >
          Sortering
        </button>
        <SorteringArk
          apen={sorterApen}
          onLukk={() => setSorterApen(false)}
          anker={sorterRef.current}
        >
          <SorteringGruppe tittel="Tid">
            {TID_VALG.map((v) => (
              <SorteringValg
                key={v.id}
                valgt={sortering === v.id}
                onVelg={() => {
                  setSortering(v.id);
                  setSorterApen(false);
                }}
              >
                {v.label}
              </SorteringValg>
            ))}
          </SorteringGruppe>
          <SorteringGruppe tittel="Gruppe">
            {INNBOKS_GRUPPER.map((v) => (
              <SorteringValg
                key={v.key}
                valgt={part === v.key}
                onVelg={() => {
                  setPart(part === v.key ? 'alle' : v.key);
                  setSorterApen(false);
                }}
              >
                {v.label}
              </SorteringValg>
            ))}
          </SorteringGruppe>
        </SorteringArk>
        <button
          type="button"
          data-innboks-slett
          aria-label={velgModus ? 'Slett valgte samtaler' : 'Velg samtaler å slette'}
          aria-pressed={velgModus}
          onClick={slett}
          className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-1 text-label ${
            velgModus ? 'border-danger font-[650] text-danger' : 'border-transparent text-fg-muted'
          }`}
        >
          Slett
          {velgModus ? <Trash2 size={16} strokeWidth={1.75} aria-hidden /> : null}
        </button>
      </div>
    </div>
  );
}
