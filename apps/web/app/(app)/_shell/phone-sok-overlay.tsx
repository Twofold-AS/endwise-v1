'use client';

import { Search } from '@endwise/ui';
import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { normaliserSok } from '@endwise/modules/sok';
import type { NavItem } from './nav';
import { PHONE_SAFE_TOP } from './phone-home';
import { huskSok, lesNyligeSok, PHONE_SOK_LAGER, slaaSammenSok } from './phone-sok';

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
  const q = normaliserSok(verdi);
  const sok = trpc.search.global.useQuery(
    { q: q ?? '' },
    { enabled: apen && Boolean(q), staleTime: 8_000 },
  );

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

  const nyligVist = verdi.trim()
    ? nylige.filter((s) => s.toLowerCase().includes(verdi.trim().toLowerCase()))
    : nylige;
  const grupper = q ? slaaSammenSok(sok.data?.grupper ?? [], dest, q) : [];
  const venter = Boolean(q) && sok.isFetching && !sok.data;
  const tom = Boolean(q) && !venter && grupper.length === 0 && !sok.isError;

  return (
    <div
      data-phone-search-overlay
      className={`fixed inset-0 z-[80] flex flex-col bg-bg md:hidden ${PHONE_SAFE_TOP}`}
    >
      <div className="flex h-row shrink-0 items-center gap-2 px-3">
        <label className="relative min-w-0 flex-1">
          <Search
            size={16}
            strokeWidth={1.75}
            data-phone-sok-ikon
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg"
            aria-hidden
          />
          <input
            ref={felt}
            data-phone-search
            type="search"
            value={verdi}
            onChange={(e) => onVerdi(e.target.value)}
            placeholder="Søk"
            aria-label="Søk"
            className="h-8 w-full rounded-sm border-0 bg-inset pr-3 pl-9 text-label text-fg placeholder:text-fg-faint outline-none focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>
        <button
          type="button"
          data-phone-sok-avbryt
          className="shrink-0 px-1 text-label text-fg"
          onClick={onAvbryt}
        >
          Avbryt
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8">
        {!q && nyligVist.length > 0 ? (
          <ul className="flex flex-col py-2">
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

        {venter ? <p className="py-6 text-label text-fg-muted">Søker …</p> : null}
        {sok.isError ? (
          <p className="py-6 text-label text-danger">Kunne ikke søke. Prøv igjen.</p>
        ) : null}
        {tom ? <p className="py-6 text-label text-fg-muted">Ingen treff</p> : null}

        {grupper.map((gruppe) => (
          <section key={gruppe.kategori} data-phone-sok-gruppe={gruppe.kategori} className="pt-4">
            <h2 className="pb-1 text-[12px] font-[650] text-fg-muted">{gruppe.kategori}</h2>
            <ul className="flex flex-col">
              {gruppe.treff.map((t) => (
                <li key={`${gruppe.kategori}-${t.id}`}>
                  <button
                    type="button"
                    data-phone-sok-treff={t.id}
                    className="flex min-h-11 w-full flex-col items-start justify-center py-1.5 text-left"
                    onClick={() => velg(t.href, t.tittel)}
                  >
                    <span className="text-label text-fg">{t.tittel}</span>
                    {t.under ? (
                      <span className="text-[12px] text-fg-muted">{t.under}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
