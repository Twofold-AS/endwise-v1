'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { grupperKunderAlfa, type KunderAlfa, kunderAlfaScrollmaal, kunderAlfaTomme } from './_alfa';
import { KunderAlfaRail } from './_alfa-rail';

/**
 * List-viewport + sticky seksjonshoder + høyre-rail.
 * Bokstav hopper til seksjon (`#` = topp). Ingen min-h-spacer.
 */
export function KunderAlfaListe<T extends { id: string; name: string }>({
  kunder,
  tom,
  renderRad,
}: {
  kunder: readonly T[];
  tom: ReactNode;
  renderRad: (kunde: T, i: number) => ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [aktiv, setAktiv] = useState<KunderAlfa>('#');
  const grupper = grupperKunderAlfa(kunder);
  const tomme = kunderAlfaTomme(kunder);
  const listeNokkel = kunder.map((k) => k.id).join();

  // biome-ignore lint/correctness/useExhaustiveDependencies: scrollport byttes med lista
  useEffect(() => {
    const rot = scrollRef.current;
    if (!rot) return;
    const synk = () => {
      const hoder = [...rot.querySelectorAll<HTMLElement>('[data-kunder-seksjon]')];
      let neste: KunderAlfa = '#';
      const y = rot.scrollTop + 4;
      for (const el of hoder) {
        const merke = el.dataset.kunderSeksjon;
        if (el.offsetTop <= y && merke) neste = merke as KunderAlfa;
      }
      setAktiv(neste);
    };
    synk();
    rot.addEventListener('scroll', synk, { passive: true });
    return () => rot.removeEventListener('scroll', synk);
  }, [listeNokkel]);

  function hoppTil(bokstav: KunderAlfa) {
    const rot = scrollRef.current;
    if (!rot) return;
    setAktiv(bokstav);
    if (bokstav === '#') {
      rot.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const seksjon = rot.querySelector<HTMLElement>(`[data-kunder-seksjon="${bokstav}"]`);
    rot.scrollTo({ top: kunderAlfaScrollmaal(rot, seksjon), behavior: 'smooth' });
  }

  return (
    <div data-kunder-liste className="flex min-h-0 flex-1">
      <div
        ref={scrollRef}
        data-kunder-liste-scroll
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {kunder.length === 0 ? (
          tom
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {grupper.map((g) => (
              <section key={g.bokstav} data-kunder-seksjon={g.bokstav}>
                <h3
                  data-kunder-seksjon-hode
                  className="sticky top-0 z-[2] bg-surface-2 px-4 py-1 text-[12px] font-[650] text-fg-muted"
                >
                  {g.bokstav}
                </h3>
                {g.kunder.map((k, i) => renderRad(k, i))}
              </section>
            ))}
          </div>
        )}
        {kunder.length > 0 ? (
          <div data-kunder-liste-hale className="min-h-[calc(100%-2rem)]" aria-hidden />
        ) : null}
      </div>
      <KunderAlfaRail aktiv={aktiv} tomme={tomme} onVelg={hoppTil} />
    </div>
  );
}
