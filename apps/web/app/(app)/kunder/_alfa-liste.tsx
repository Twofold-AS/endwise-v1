'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { grupperKunderAlfa, type KunderAlfa, kunderAlfaTomme } from './_alfa';
import { KunderAlfaRail } from './_alfa-rail';

/**
 * Apple Contacts: seksjoner i side-scrolleren, rail festet til viewport.
 * hoppTil bruker scrollIntoView mot [data-ronny-side-scroll].
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
  const [aktiv, setAktiv] = useState<KunderAlfa>('#');
  const grupper = grupperKunderAlfa(kunder);
  const tomme = kunderAlfaTomme(kunder);

  useEffect(() => {
    const rot =
      document.querySelector<HTMLElement>('[data-ronny-side-scroll]') ??
      document.querySelector<HTMLElement>('main');
    if (!rot) return;
    const synk = () => {
      const hoder = [...rot.querySelectorAll<HTMLElement>('[data-kunder-seksjon]')];
      let neste: KunderAlfa = '#';
      const y = rot.scrollTop + 48;
      for (const el of hoder) {
        if (el.offsetTop <= y && el.dataset.kunderSeksjon) {
          neste = el.dataset.kunderSeksjon as KunderAlfa;
        }
      }
      setAktiv(neste);
    };
    void kunder.length;
    synk();
    rot.addEventListener('scroll', synk, { passive: true });
    return () => rot.removeEventListener('scroll', synk);
  }, [kunder.length]);

  function hoppTil(bokstav: KunderAlfa) {
    setAktiv(bokstav);
    if (bokstav === '#') {
      const rot = document.querySelector<HTMLElement>('[data-ronny-side-scroll]');
      rot?.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const seksjon = document.querySelector<HTMLElement>(`[data-kunder-seksjon="${bokstav}"]`);
    seksjon?.scrollIntoView({ block: 'start' });
  }

  return (
    <div data-kunder-liste data-kunder-liste-scroll className="relative">
      {kunder.length === 0 ? (
        tom
      ) : (
        <div data-kunder-grupper className="pr-6">
          {grupper.map((g) => (
            <section
              key={g.bokstav}
              data-kunder-seksjon={g.bokstav}
              className="scroll-mt-[var(--chrome-h,5.5rem)]"
            >
              <h3
                data-kunder-seksjon-hode
                className="sticky top-[var(--chrome-h,5.5rem)] z-[2] bg-bg py-1.5 text-meta font-[650] text-fg-muted"
              >
                {g.bokstav}
              </h3>
              <div className="flex flex-col">{g.kunder.map((k, i) => renderRad(k, i))}</div>
            </section>
          ))}
        </div>
      )}
      {kunder.length > 0 ? (
        <p data-kunder-liste-hale className="sr-only">
          {kunder.length} kunder
        </p>
      ) : null}
      {kunder.length > 0 ? <KunderAlfaRail aktiv={aktiv} tomme={tomme} onVelg={hoppTil} /> : null}
    </div>
  );
}
