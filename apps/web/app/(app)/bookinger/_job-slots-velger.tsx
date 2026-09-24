'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { osloKalenderdag, osloPlusDager, osloStartAvDag } from '../_lib/oslo-dag';
import { ClaudeChip } from '../_shell/claude-flate';
import { jobSlots } from './_job-slots';
import { osloStartFraFelt } from './_starttid';

/**
 * Ledige tidspunkt fra jobSlots() — åpningstid · vakt · kval · overlap · 30 min.
 */
export function JobSlotsVelger({
  ymd,
  durationMin,
  requiredQuals,
  value,
  onPick,
}: {
  ymd: string;
  durationMin: number;
  requiredQuals: readonly string[];
  value: string;
  onPick: (iso: string, mechanicId: string) => void;
}) {
  const dag = osloKalenderdag(ymd);
  const fra = osloStartAvDag(dag);
  const til = osloStartAvDag(osloPlusDager(dag, 1));
  const jobs = trpc.bookings.list.useQuery({ from: fra, to: til, limit: 200 });
  const meks = trpc.mechanics.oversikt.useQuery();
  const quals = trpc.competence.listAllMechanicSkills.useQuery();

  const slots = useMemo(() => {
    if (!ymd || durationMin < 30) return [];
    const perMek = new Map<string, string[]>();
    for (const rad of quals.data ?? []) {
      const list = perMek.get(rad.mechanicId) ?? [];
      list.push(rad.skillKey);
      perMek.set(rad.mechanicId, list);
    }
    return jobSlots({
      ymd: dag,
      durationMin,
      requiredQuals,
      mekanikere: (meks.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        role: 'mekaniker',
        onDuty: m.active !== false,
        quals: perMek.get(m.id) ?? [],
      })),
      jobber: (jobs.data ?? []).map((j) => ({
        mechanicId: j.mechanicId,
        startsAt: j.startsAt,
        endsAt: j.endsAt,
        status: j.status,
      })),
    });
  }, [ymd, dag, durationMin, requiredQuals, meks.data, jobs.data, quals.data]);

  if (jobs.isLoading || meks.isLoading) {
    return <p className="text-[13px] text-fg-muted">Regner ledige tider …</p>;
  }
  if (slots.length === 0) {
    return (
      <p data-job-slots-tom className="text-[13px] text-fg-muted">
        Ingen ledige tidspunkt denne dagen. Sjekk åpningstid, vakt og overlapping.
      </p>
    );
  }

  return (
    <div data-job-slots className="flex flex-col gap-2">
      <p className="text-[13px] text-fg-muted">Ledige tidspunkt (30 min)</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => {
          const iso = osloStartFraFelt(ymd, Math.floor(s.t / 60), s.t % 60);
          const aktiv = value === iso;
          return (
            <ClaudeChip
              key={s.t}
              active={aktiv}
              onClick={() => onPick(iso, s.mechanicIds[0] ?? '')}
            >
              {s.label}–{s.end}
            </ClaudeChip>
          );
        })}
      </div>
    </div>
  );
}
