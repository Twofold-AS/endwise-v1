'use client';

import { ArrowUpRight } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * F5-23 — NYTT FRA HELPDESKEN. Slideren nederst i sidebaren.
 *
 * ── ⛔ FAST HØYDE, og det er hele grunnen til at den ble skrevet om ───────
 * Fram til 20.08.2026 var kortet et fritt `flex flex-col` med fire hardkodede
 * tips av ulik lengde. Hvert niende sekund byttet teksten, høyden endret seg —
 * og siden kortet ligger NEDERST i en kolonne, dyttet det alt over seg opp og
 * ned mens man jobbet. En slider som flytter på navigasjonen er verre enn
 * ingen slider.
 *
 * Nå er høyden låst i `HOYDE`, bildet har fast forhold, og teksten klippes med
 * `line-clamp`. Fire artikler med ulik tittellengde gir nøyaktig samme boks.
 *
 * ── Drevet av data, ikke av en liste i denne fila ─────────────────────────
 * Innholdet er de fire NYESTE publiserte artiklene fra helpdesken. Skriver
 * Endwise-admin en ny artikkel, dukker den opp her uten at noen rører kode —
 * som var hele poenget med å slutte å hardkode tipsene.
 *
 * ⚠️ Rendres på HVER side (sidebaren er i layouten), så spørringen har lang
 * `staleTime`. Fire titler trenger ikke være ferske på sekundet.
 */
const INTERVAL_MS = 9000;

/**
 * ⛔ Ett tall, ett sted. Bildet (72px) + teksten + prikkeraden må summere seg
 * til dette, ellers hopper kortet likevel. Endrer du høyden, endre her.
 */
const HOYDE = 208;

export function TipCard() {
  const artikler = trpc.helpdesk.list.useQuery(
    { limit: 4 },
    { staleTime: 5 * 60_000, retry: false },
  );
  const rader = artikler.data ?? [];

  const [i, setI] = useState(0);

  /* Lista kan krympe (en artikkel avpubliseres) mens indeksen står igjen. */
  useEffect(() => {
    if (i >= rader.length) setI(0);
  }, [i, rader.length]);

  useEffect(() => {
    if (rader.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % rader.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [rader.length]);

  /**
   * ⚠️ Plassen holdes av med én gang, også mens det lastes og hvis det ikke
   * finnes artikler. Å rendre `null` her ville gitt nøyaktig den hoppingen
   * fast høyde skal fjerne — bare én gang, ved innlasting, i stedet for hvert
   * niende sekund.
   */
  if (rader.length === 0) {
    return (
      <div
        style={{ height: HOYDE }}
        className="flex items-center justify-center rounded-xl border border-border bg-bg px-3 text-center text-[11px] text-fg-muted"
      >
        {artikler.isLoading ? 'Laster …' : 'Ingen artikler ennå.'}
      </div>
    );
  }

  const a = rader[Math.min(i, rader.length - 1)];
  if (!a) return null;

  return (
    <div
      style={{ height: HOYDE }}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-bg"
    >
      <Link href={`/support/${a.slug}` as Route} className="group flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-1.5 px-3 pt-3">
          {/* ⚠️ RØD (rettet 20.08.2026). Var kortvarig grønn; det brøt med
              UI-PAKKER §6, og etter at aksenten ble svart er rødt det eneste
              som faktisk fanger blikket. Vises kun når artikkelen er ulest for
              DEG — et merke alle alltid ser, betyr ingenting. */}
          <span className="flex items-center gap-2">
            {a.ulest ? (
              <span className="inline-flex h-badge shrink-0 items-center rounded-badge bg-danger-soft px-1.5 font-medium text-[11px] text-danger">
                New
              </span>
            ) : (
              <span className="text-[11px] text-fg-muted">Fra helpdesken</span>
            )}
          </span>

          {/* Overskrift med linje under teksten, og pil som sier at den kan
              leses. Pilen flytter seg litt på hover — den eneste bevegelsen i
              kortet som ikke er tidsstyrt. */}
          <span className="flex items-start gap-1.5 border-border border-b pb-1.5">
            <span className="line-clamp-2 min-w-0 flex-1 text-label text-fg">{a.title}</span>
            <ArrowUpRight
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>

        {/* Bildet under, fast forhold. `sizes` er sidebarbredden minus padding
            — et for stort tall her laster dobbelt så store filer uten at noe
            ser galt ut. */}
        <div className="relative mx-3 mt-2 h-[72px] shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {a.image && <Image src={a.image} alt="" fill sizes="224px" className="object-cover" />}
        </div>
      </Link>

      {/* Prikkene: også navigasjon, ikke bare en indikator. */}
      <div className="mt-auto flex items-center gap-1.5 px-3 pb-3">
        {rader.map((r, n) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setI(n)}
            aria-label={`Vis: ${r.title}`}
            aria-current={n === i}
            className={`h-1.5 rounded-pill transition-all ${
              n === i ? 'w-4 bg-accent-strong' : 'w-1.5 bg-border hover:bg-border-strong'
            }`}
          />
        ))}
        <Link
          href={'/support' as Route}
          className="ml-auto text-[11px] text-fg-muted underline underline-offset-2 transition-colors hover:text-fg"
        >
          Alle
        </Link>
      </div>
    </div>
  );
}
