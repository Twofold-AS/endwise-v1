'use client';

import { useEffect, useRef, useState } from 'react';
import type { NavItem } from './nav';
import { PHONE_SAFE_TOP } from './phone-home';
import { huskSok, lesNyligeSok, PHONE_SOK_LAGER } from './phone-sok';

export function PhoneSokOverlay({
  apen,
  verdi,
  onVerdi,
  onAvbryt,
  dest,
  onVelg,
}: {
  apen: boolean;
  verdi: string;
  onVerdi: (s: string) => void;
  onAvbryt: () => void;
  dest: NavItem[];
  onVelg: (href: string, label: string) => void;
}) {
  const [nylige, setNylige] = useState<string[]>([]);
  const felt = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!apen) return;
    setNylige(lesNyligeSok(window.localStorage.getItem(PHONE_SOK_LAGER)));
    const t = window.setTimeout(() => felt.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [apen]);

  function husk(label: string) {
    const neste = huskSok(nylige, label);
    setNylige(neste);
    window.localStorage.setItem(PHONE_SOK_LAGER, JSON.stringify(neste));
  }

  function velg(href: string, label: string) {
    husk(label);
    onVelg(href, label);
  }

  if (!apen) return null;

  const q = verdi.trim().toLowerCase();
  const nyligVist = q ? nylige.filter((s) => s.toLowerCase().includes(q)) : nylige;

  return (
    <div
      data-phone-search-overlay
      className={`fixed inset-0 z-[80] flex flex-col bg-bg md:hidden ${PHONE_SAFE_TOP}`}
    >
      <div className="flex h-row shrink-0 items-center gap-2 px-3">
        <input
          ref={felt}
          data-phone-search
          type="search"
          value={verdi}
          onChange={(e) => onVerdi(e.target.value)}
          placeholder="Søk"
          aria-label="Søk destinasjoner"
          className="h-8 min-w-0 flex-1 rounded-sm border-0 bg-inset px-3 text-label text-fg placeholder:text-fg-faint outline-none focus-visible:outline-2 focus-visible:outline-ring"
        />
        <button
          type="button"
          data-phone-sok-avbryt
          className="shrink-0 px-1 text-label text-fg"
          onClick={onAvbryt}
        >
          Avbryt
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {nyligVist.length > 0 ? (
          <ul className="flex flex-col px-3 py-2">
            {nyligVist.map((s) => {
              const treff = dest.find((d) => d.label.toLowerCase() === s.toLowerCase());
              return (
                <li key={s}>
                  <button
                    type="button"
                    data-phone-sok-nylig={s}
                    className="flex h-11 w-full items-center text-left text-label text-fg"
                    onClick={() => {
                      onVerdi(s);
                      if (treff) velg(treff.href, treff.label);
                    }}
                  >
                    {s}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="flex gap-3 overflow-x-auto overflow-y-hidden px-3 py-3 touch-pan-x">
          {dest.map((item) => {
            const I = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                data-phone-sok-dest-ikon={item.key}
                aria-label={item.label}
                onClick={() => velg(item.href, item.label)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-inset text-fg"
              >
                <I size={20} strokeWidth={1.75} />
              </button>
            );
          })}
        </div>
        <div className="flex flex-col px-3 pb-8">
          {dest.map((item) => (
            <button
              key={item.key}
              type="button"
              data-phone-sok-dest-rad={item.key}
              onClick={() => velg(item.href, item.label)}
              className="flex min-h-14 items-center text-left text-title text-fg"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
