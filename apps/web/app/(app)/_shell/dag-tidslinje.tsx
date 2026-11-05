'use client';

import { ArrowRight } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { osloVeggtid, sammeOsloDag } from '../_lib/oslo-dag';
import { fmtTime } from '../bookinger/_status';

/**
 * Dagens timeplan (Claude-designet, desktop-hjem): mekanikere nedover,
 * klokkeslett 08–19 bortover, jobbokser posisjonert etter start/varighet.
 * Statusfarger: fullført = ok, pågår = warn, planlagt/utkast = ink (ikke blå).
 */
export const DAG_TIDSLINJE_START = 8;
export const DAG_TIDSLINJE_SLUTT = 19;
const DAG_MINUTTER = (DAG_TIDSLINJE_SLUTT - DAG_TIDSLINJE_START) * 60;

export type TidslinjeJobb = {
  id: string;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  status: string;
  mechanicId?: string | null;
  mechanicName?: string | null;
  regNumber?: string | null;
  serviceName?: string | null;
  serviceNames?: string[];
  durationMinutes?: number | null;
};

type MekanikerRad = {
  id: string;
  navn: string;
  jobber: TidslinjeJobb[];
};

function boksTone(status: string): string {
  if (status === 'completed') {
    return 'bg-[var(--ew-status-ok-bg,#dcf5e3)] text-[var(--ew-status-ok-fg,#14532d)]';
  }
  if (status === 'in_progress') {
    return 'bg-[var(--ew-status-warn-bg,#fef3c7)] text-[var(--ew-status-warn-fg,#7a3e07)]';
  }
  return 'bg-fg text-bg';
}

function initialer(navn: string): string {
  const deler = navn.trim().split(/\s+/).filter(Boolean);
  const bokstaver = deler.length > 1 ? [deler[0]?.[0], deler[deler.length - 1]?.[0]] : [navn[0]];
  return bokstaver.join('').toUpperCase();
}

function posisjon(j: TidslinjeJobb): { left: number; width: number } {
  const { hour, minute } = osloVeggtid(j.startsAt);
  const startMin = (hour - DAG_TIDSLINJE_START) * 60 + minute;
  const varighet =
    j.durationMinutes && j.durationMinutes > 0
      ? j.durationMinutes
      : j.endsAt
        ? Math.max(
            15,
            Math.round((new Date(j.endsAt).getTime() - new Date(j.startsAt).getTime()) / 60000),
          )
        : 60;
  const left = Math.min(Math.max(startMin / DAG_MINUTTER, 0), 1);
  const width = Math.min(Math.max(varighet / DAG_MINUTTER, 0.06), 1 - left);
  return { left: left * 100, width: width * 100 };
}

function jobbTekst(j: TidslinjeJobb): string {
  const tjeneste = j.serviceNames?.[0] ?? j.serviceName ?? j.regNumber ?? 'Jobb';
  return `${fmtTime(j.startsAt)} · ${tjeneste}`;
}

export function DagTidslinje({
  jobber,
  mekanikere,
  laster = false,
  naa,
  href = '/jobber',
}: {
  jobber: TidslinjeJobb[];
  mekanikere: { id: string; name: string }[];
  laster?: boolean;
  /** Fast dato (preview/test). Tom = i dag. */
  naa?: Date;
  href?: string;
}) {
  const referanse = useMemo(() => naa ?? new Date(), [naa]);
  const timer = useMemo(
    () =>
      Array.from(
        { length: DAG_TIDSLINJE_SLUTT - DAG_TIDSLINJE_START + 1 },
        (_, i) => DAG_TIDSLINJE_START + i,
      ),
    [],
  );

  const rader = useMemo<MekanikerRad[]>(() => {
    const dagens = jobber
      .filter((j) => j.status !== 'cancelled' && sammeOsloDag(j.startsAt, referanse))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const perMek = new Map<string, TidslinjeJobb[]>();
    const ufordelt: TidslinjeJobb[] = [];
    for (const j of dagens) {
      if (j.mechanicId) {
        const liste = perMek.get(j.mechanicId) ?? [];
        liste.push(j);
        perMek.set(j.mechanicId, liste);
      } else {
        ufordelt.push(j);
      }
    }
    const navnFor = new Map(mekanikere.map((m) => [m.id, m.name]));
    const ut: MekanikerRad[] = [];
    for (const [mekId, liste] of perMek) {
      ut.push({
        id: mekId,
        navn: navnFor.get(mekId) ?? liste[0]?.mechanicName ?? 'Mekaniker',
        jobber: liste,
      });
    }
    ut.sort(
      (a, b) =>
        new Date(a.jobber[0]?.startsAt ?? 0).getTime() -
        new Date(b.jobber[0]?.startsAt ?? 0).getTime(),
    );
    if (ufordelt.length > 0) ut.push({ id: '__ufordelt', navn: 'Ikke tildelt', jobber: ufordelt });
    return ut;
  }, [jobber, mekanikere, referanse]);

  const antall = rader.reduce((sum, r) => sum + r.jobber.length, 0);

  return (
    <section data-dagens-timeplan className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex w-full min-w-0 items-baseline gap-2">
        <p className="text-[18px] leading-6 font-semibold text-fg">Dagens timeplan</p>
        <p className="text-meta leading-6 text-fg-muted">
          {antall === 1 ? '1 jobb' : `${antall} jobber`}
        </p>
        <Link
          href={href as Route}
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-label leading-6 text-fg-muted [touch-action:manipulation]"
        >
          Åpne timeplan
          <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
        </Link>
      </div>

      {laster ? (
        <div className="flex flex-col gap-2 py-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-[12px] bg-surface-2" />
          ))}
        </div>
      ) : rader.length === 0 ? (
        <p className="py-3 text-body text-fg-muted">Ingen jobber i dag.</p>
      ) : (
        <div className="flex w-full min-w-0 flex-col">
          <div className="flex w-full min-w-0 items-center gap-4">
            <div className="w-[170px] shrink-0" />
            <div className="flex min-w-0 flex-1 justify-between text-[11px] leading-4 text-fg-muted tabular-nums">
              {timer.map((t) => (
                <span key={t}>{String(t).padStart(2, '0')}</span>
              ))}
            </div>
          </div>
          {rader.map((rad) => (
            <div
              key={rad.id}
              data-tidslinje-rad={rad.navn}
              className="flex min-h-[52px] w-full min-w-0 items-center gap-4 border-t border-divide"
            >
              <div className="flex w-[170px] shrink-0 items-center gap-2.5 py-1.5">
                <span
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold text-fg"
                  aria-hidden
                >
                  {initialer(rad.navn)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] leading-5 font-medium text-fg">{rad.navn}</p>
                  <p className="text-[13px] leading-4 text-fg-muted">
                    {rad.jobber.length === 1 ? '1 jobb' : `${rad.jobber.length} jobber`}
                  </p>
                </div>
              </div>
              <div className="relative h-[52px] min-w-0 flex-1">
                <div className="absolute inset-y-2 left-0 right-0 flex justify-between" aria-hidden>
                  {timer.map((t) => (
                    <span key={t} className="w-px bg-divide/60" />
                  ))}
                </div>
                {rad.jobber.map((j) => {
                  const pos = posisjon(j);
                  return (
                    <Link
                      key={j.id}
                      href={`/bookinger/${j.id}` as Route}
                      title={jobbTekst(j)}
                      className={`absolute top-1/2 flex h-9 min-w-0 -translate-y-1/2 items-center rounded-[10px] px-2.5 text-[13px] leading-none font-medium [touch-action:manipulation] ${boksTone(j.status)}`}
                      style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                    >
                      <span className="truncate">{jobbTekst(j)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
