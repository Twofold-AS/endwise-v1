'use client';

import { Check } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { osloKalenderdag, osloPlusDager } from '../_lib/oslo-dag';
import { InnstillingRad, InnstillingSeksjon } from '../_shell/innstilling-gruppe';

/**
 * Ny jobb steg 3 — Claude `jobSlots()`.
 * Kun tider der hele varigheten får plass med kvalifisert, ledig mekaniker.
 */
export function JobSlotsVelger({
  date,
  onDate,
  durationMinutes,
  requiredSkills,
  startsAt,
  mechanicId,
  onPick,
}: {
  date: string;
  onDate: (ymd: string) => void;
  durationMinutes: number;
  requiredSkills: readonly string[];
  startsAt: string;
  mechanicId: string;
  onPick: (iso: string, mechanicId: string) => void;
}) {
  const slots = trpc.bookings.jobSlots.useQuery(
    {
      date,
      durationMinutes: Math.max(5, durationMinutes),
      requiredSkills: [...requiredSkills],
    },
    { enabled: durationMinutes >= 5 },
  );

  return (
    <InnstillingSeksjon
      tittel="Dato og ledig tid"
      ingress="Hverdag 08–19 · lørdag 10–15 · søndag stengt. 30-min steg."
    >
      <InnstillingRad label="Dato" siste>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-full border border-divide px-3 text-[12px] text-fg"
            onClick={() => onDate(osloPlusDager(date, -1))}
          >
            Forrige dag
          </button>
          <input
            type="date"
            data-job-slots-dato
            value={date}
            onChange={(e) => onDate(osloKalenderdag(e.target.value || date))}
            className="ew-felt ew-felt-md min-w-0 flex-1"
          />
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-full border border-divide px-3 text-[12px] text-fg"
            onClick={() => onDate(osloPlusDager(date, 1))}
          >
            Neste dag
          </button>
        </div>
      </InnstillingRad>

      {slots.data?.vaktNote ? (
        <p data-job-slots-vakt className="text-[12px] text-fg-muted">
          {slots.data.vaktNote} På vakt {slots.data.onShiftCount} · kvalifisert{' '}
          {slots.data.qualifiedCount}.
        </p>
      ) : null}

      {slots.isLoading ? (
        <p className="text-[12px] text-fg-muted">Regner ledige tider …</p>
      ) : slots.isError ? (
        <p className="text-[12px] text-danger">{slots.error.message}</p>
      ) : (slots.data?.slots.length ?? 0) === 0 ? (
        <p data-job-slots-tom className="text-[12px] text-fg-muted">
          Ingen ledige tider denne dagen. Ingen kvalifisert mekaniker er ledig i åpningstiden — det
          er tilsiktet.
        </p>
      ) : (
        <ul data-job-slots className="flex flex-col gap-1.5">
          {slots.data?.slots.map((s) => {
            const iso = new Date(s.startsAt).toISOString();
            const valgt = startsAt === iso;
            return (
              <li key={iso}>
                <button
                  type="button"
                  data-job-slot={s.label}
                  aria-pressed={valgt}
                  onClick={() => onPick(iso, s.mechanicIds[0] ?? '')}
                  className={`flex w-full items-center gap-3 rounded-[16px] border px-3.5 py-2.5 text-left ${
                    valgt ? 'border-fg bg-sidebar-active' : 'border-divide bg-card'
                  }`}
                >
                  <span className="text-label font-[650] text-fg tabular-nums">
                    {s.label}–{s.endLabel}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-fg-muted">
                    {s.mechanicNames.join(', ')}
                  </span>
                  {valgt ? <Check size={15} className="shrink-0 text-fg" /> : null}
                </button>
                {valgt && s.mechanicIds.length > 1 ? (
                  <div className="mt-1 flex flex-wrap gap-1 pl-1">
                    {s.mechanicIds.map((id, i) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={mechanicId === id}
                        onClick={() => onPick(iso, id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] ${
                          mechanicId === id ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted'
                        }`}
                      >
                        {s.mechanicNames[i] ?? id}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </InnstillingSeksjon>
  );
}
