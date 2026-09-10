'use client';

import { Trash2 } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { INNBOKS_GRUPPER, useInboxFilter } from '../_shell/inbox-filter';
import { InboxChromePopup, InboxPopupValg } from './_popup';

const TID_VALG = [
  { id: 'nyeste' as const, label: 'Nyeste' },
  { id: 'eldste' as const, label: 'Eldste' },
];

/**
 * Innboks top-bar 2: Ny melding · Tid · Gruppe · Slett.
 * Ny melding først og aktiv på lista / ny-flyt. Tid og Gruppe åpner profil-popup.
 */
export function InboxTopBar2({ desktop = false }: { desktop?: boolean }) {
  const pathname = usePathname() ?? '';
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
  const [tidApen, setTidApen] = useState(false);
  const [gruppeApen, setGruppeApen] = useState(false);
  const tidRef = useRef<HTMLDivElement>(null);
  const gruppeRef = useRef<HTMLDivElement>(null);
  const nyHref = pathname.startsWith('/endwise') ? '/endwise/innboks?ny=1' : '/innboks?ny=1';
  const nyAktiv = !tidApen && !gruppeApen && !velgModus;

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
        href={nyHref as Route}
        data-innboks-ny-melding
        data-innboks-ny-samtale
        aria-current={nyAktiv ? 'page' : undefined}
        className={faneKlasse(nyAktiv)}
      >
        Ny melding
      </Link>

      <div ref={tidRef} className="relative">
        <button
          type="button"
          data-innboks-tid
          aria-expanded={tidApen}
          aria-haspopup="true"
          aria-label="Tid"
          onClick={() => {
            setTidApen((v) => !v);
            setGruppeApen(false);
          }}
          className={faneKlasse(tidApen)}
        >
          Tid
        </button>
        <InboxChromePopup
          apen={tidApen}
          onLukk={() => setTidApen(false)}
          label="Sorter samtaler"
          anker={tidRef.current}
        >
          {TID_VALG.map((v) => (
            <InboxPopupValg
              key={v.id}
              valgt={sortering === v.id}
              onVelg={() => {
                setSortering(v.id);
                setTidApen(false);
              }}
            >
              {v.label}
            </InboxPopupValg>
          ))}
        </InboxChromePopup>
      </div>

      <div ref={gruppeRef} className="relative">
        <button
          type="button"
          data-innboks-gruppe
          aria-expanded={gruppeApen}
          aria-haspopup="true"
          aria-label="Gruppe"
          onClick={() => {
            setGruppeApen((v) => !v);
            setTidApen(false);
          }}
          className={faneKlasse(gruppeApen)}
        >
          Gruppe
        </button>
        <InboxChromePopup
          apen={gruppeApen}
          onLukk={() => setGruppeApen(false)}
          label="Gruppe"
          anker={gruppeRef.current}
        >
          {INNBOKS_GRUPPER.map((v) => (
            <InboxPopupValg
              key={v.key}
              valgt={part === v.key}
              onVelg={() => {
                setPart(part === v.key ? 'alle' : v.key);
                setGruppeApen(false);
              }}
            >
              {v.label}
            </InboxPopupValg>
          ))}
        </InboxChromePopup>
      </div>

      <button
        type="button"
        data-innboks-slett
        aria-label={velgModus ? 'Slett valgte samtaler' : 'Velg samtaler å slette'}
        aria-pressed={velgModus}
        onClick={slett}
        className={`ml-auto inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-1 text-label ${
          velgModus ? 'border-danger font-[650] text-danger' : 'border-transparent text-fg-muted'
        }`}
      >
        Slett
        {velgModus ? <Trash2 size={16} strokeWidth={1.75} aria-hidden /> : null}
      </button>
    </div>
  );
}
