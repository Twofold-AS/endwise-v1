'use client';

import { Bell, Car, ClockArrowUp, Timer } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  enqueueTransition,
  flushTransitions,
  pendingCount,
  subscribeQueue,
} from '../../_lib/offline-queue';
import { useOnline } from '../../_lib/use-online';
import { BevelButton, CardShell } from '../../_shell/cards';
import { estMinutes, fmtTime, STATUS_LABEL } from '../_status';

/** PROTOTYPE: valgene mekanikeren kan be om. Ingen backend bak dem. */
const EXTRA_TIME = [15, 30, 60] as const;

// Sjekkliste er mock (tjeneste-sjekkliste-backend kommer); resten er ekte booking-data.
const CHECKLIST = [
  'Sjekk bremser',
  'Skift olje',
  'Kontroller dekk',
  'Test lys',
  'Protokoll signert',
];

/**
 * F7 — Jobbdetalj for mekanikeren. Store statusknapper som bruker booking-
 * livssyklusen (Start → in_progress, Ferdig → completed er ekte transitions).
 *
 * F7-07 — OFFLINE: mister mekanikeren dekning, legges statusendringen i kø og
 * sendes automatisk når nettet er tilbake (ingen tapt «Ferdig»).
 * F7-05 — AVVIK: «Meld avvik» varsler selger i sanntid (SSE).
 */
export default function JobbDetaljPage() {
  const params = useParams<{ id: string }>();
  const online = useOnline();
  const utils = trpc.useUtils();
  const day = trpc.mechanic.myDay.useQuery();

  const transition = trpc.bookings.transition.useMutation({
    onSuccess: () => utils.mechanic.myDay.invalidate(),
  });
  const deviation = trpc.mechanic.reportDeviation.useMutation();

  const [queued, setQueued] = useState(0);
  const [deviationOpen, setDeviationOpen] = useState(false);
  const [deviationText, setDeviationText] = useState('');
  // PROTOTYPE: «Be om mer tid». Lokal tilstand, ingen server.
  const [timeOpen, setTimeOpen] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState<number>(30);
  const [timeSent, setTimeSent] = useState(false);

  // Hold kø-telleren i sync + flush når nettet kommer tilbake.
  useEffect(() => {
    const update = () => setQueued(pendingCount());
    update();
    const unsub = subscribeQueue(update);
    const onOnline = () =>
      flushTransitions(async (item) => {
        await transition.mutateAsync({ bookingId: item.bookingId, to: item.to });
      });
    window.addEventListener('online', onOnline);
    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
    };
  }, [transition]);

  const job = (day.data?.jobs ?? []).find((j) => j.id === params.id);

  if (day.isLoading) return <div className="px-6 py-7 text-fg-faint text-sm">Laster …</div>;
  if (!job) {
    return (
      <div className="px-6 py-7">
        <p className="text-fg-muted text-sm">Fant ikke jobben i dagens kø.</p>
        <Link href={'/min-dag' as Route} className="text-primary text-sm">
          ← Min dag
        </Link>
      </div>
    );
  }

  const setStatus = (to: 'in_progress' | 'completed') => {
    // Offline (eller kall feiler) → legg i kø, ikke mist endringen.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueTransition({ bookingId: job.id, to });
      return;
    }
    transition.mutate(
      { bookingId: job.id, to },
      {
        onError: () => {
          // Nettverksfeil midt i kallet → kø, forsøk på nytt ved «online».
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            enqueueTransition({ bookingId: job.id, to });
          }
        },
      },
    );
  };

  function sendDeviation() {
    const message = deviationText.trim();
    // ⚠️ En GUARD, ikke `job!.id` og ikke `job?.id`.
    //
    // `job!.id` var en påstand linteren med rette klaget på. Men
    // autofiksen til `job?.id` var verre enn problemet: da ville
    // `bookingId` blitt `undefined`, og en manglende jobb hadde blitt en
    // uforståelig serverfeil i stedet for et klikk som ikke gjør noe.
    if (!message || !job) return;
    deviation.mutate(
      { bookingId: job.id, message },
      {
        onSuccess: () => {
          setDeviationText('');
          setDeviationOpen(false);
        },
      },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
      <Link href={'/min-dag' as Route} className="text-fg-faint text-xs hover:text-fg">
        ← Min dag
      </Link>

      <div className="flex items-center gap-2">
        <Car size={18} className="text-fg-muted" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">
          {job.regNumber ?? 'Ukjent regnr'}
        </h1>
        <span className="text-fg-faint text-xs uppercase">{job.vehicleType}</span>
        <span className="ml-auto rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-fg-muted">
          {STATUS_LABEL[job.status] ?? job.status}
        </span>
      </div>

      {queued > 0 && (
        <div className="rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-warn text-xs">
          {queued} statusendring{queued === 1 ? '' : 'er'} i kø — sendes når du er på nett igjen.
        </div>
      )}

      {/* Statusknapper — store touch-mål, bruker booking-livssyklusen. */}
      <div className="grid grid-cols-2 gap-2">
        <BevelButton className="h-14 w-full text-[15px]" onClick={() => setStatus('in_progress')}>
          Start
        </BevelButton>
        <BevelButton className="h-14 w-full text-[15px]" onClick={() => setStatus('completed')}>
          Ferdig
        </BevelButton>
      </div>
      {transition.error && online && (
        <p className="text-danger text-xs">{transition.error.message}</p>
      )}

      {/* ── PROTOTYPE: «Be om mer tid» ──────────────────────────────────
          Mekanikeren oppdager underveis at jobben er større enn avtalt. I dag
          er alternativene å ringe selgeren eller å bare bruke tiden — begge
          gjør at kalenderen lyver resten av dagen.

          ⚠️ PROTOTYPE-NIVÅ. Ingen backend: ingen rute tar imot en
          tidsforespørsel, ingen kalender flyttes, ingen kunde varsles. Dette
          viser MØNSTERET — knapp, valg av lengde, kvittering — så det kan
          vurderes før det bygges. Bygges for alvor: egen mutasjon som varsler
          selger (F3-04) og foreslår ny slutt-tid i kalenderen (F3-07). */}
      <div className="flex flex-col gap-2">
        {!timeOpen ? (
          <button
            type="button"
            onClick={() => setTimeOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card font-medium text-fg text-sm active:bg-surface-2"
          >
            <Timer size={16} /> Be om mer tid
          </button>
        ) : (
          <CardShell>
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-3">
              <div className="flex items-center gap-2">
                <ClockArrowUp size={16} className="shrink-0 text-fg-muted" />
                <p className="text-label text-fg">Hvor mye mer trenger du?</p>
                <span className="ml-auto inline-flex h-badge items-center rounded-badge bg-warn-soft px-2 font-medium text-[11px] text-warn">
                  Prototype
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {EXTRA_TIME.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExtraMinutes(m)}
                    aria-pressed={extraMinutes === m}
                    className={`h-10 min-w-16 rounded-md border px-3 font-medium text-sm transition-colors ${
                      extraMinutes === m
                        ? 'border-border-strong bg-sidebar-active text-fg'
                        : 'border-border bg-bg text-fg-muted'
                    }`}
                  >
                    +{m} min
                  </button>
                ))}
              </div>

              {timeSent ? (
                <p className="text-[12px] text-success">
                  Forespørsel om {extraMinutes} min sendt til selger ✓ (simulert)
                </p>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeSent(true)}
                    className="h-10 flex-1 rounded-md bg-primary font-medium text-primary-foreground text-sm"
                  >
                    Send forespørsel
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeOpen(false)}
                    className="h-10 rounded-md border border-border bg-card px-4 text-fg text-sm"
                  >
                    Avbryt
                  </button>
                </div>
              )}

              <p className="text-[11px] text-fg-muted leading-relaxed">
                Prototype — ingenting sendes. Ekte flyt: selger får varsel (F3-04) og kan godkjenne,
                så flyttes slutt-tiden i kalenderen (F3-07).
              </p>
            </div>
          </CardShell>
        )}
      </div>

      {/* F7-05 — Meld avvik → sanntidsvarsel til selger. */}
      <div className="flex flex-col gap-2">
        {!deviationOpen ? (
          <button
            type="button"
            onClick={() => setDeviationOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-warn/30 bg-warn/10 font-medium text-sm text-warn active:bg-warn/20"
          >
            <Bell size={16} /> Meld avvik
          </button>
        ) : (
          <CardShell>
            <div className="flex flex-col gap-2 rounded-lg bg-inset p-3">
              <textarea
                value={deviationText}
                onChange={(e) => setDeviationText(e.target.value)}
                rows={3}
                placeholder="Hva er avviket? (varsler selgeren)"
                className="w-full resize-none rounded-md border border-border bg-bg p-2 text-fg text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={sendDeviation}
                  disabled={deviation.isPending || !deviationText.trim()}
                  className="h-10 flex-1 rounded-md bg-primary font-medium text-primary-foreground text-sm disabled:opacity-40"
                >
                  {deviation.isPending ? 'Sender …' : 'Send avvik'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeviationOpen(false)}
                  className="h-10 rounded-md border border-border bg-card px-4 text-fg text-sm"
                >
                  Avbryt
                </button>
              </div>
              {deviation.isSuccess && (
                <p className="text-primary text-xs">Avvik sendt til selger ✓</p>
              )}
              {deviation.error && <p className="text-danger text-xs">{deviation.error.message}</p>}
            </div>
          </CardShell>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CardShell>
          <div className="flex flex-col gap-2 rounded-lg bg-inset p-4">
            <p className="font-semibold text-[13px] text-fg">Detaljer</p>
            <dl className="flex flex-col gap-1 text-[13px]">
              <Row label="Kunde" value={job.customerName ?? '—'} />
              <Row label="Tid" value={`${fmtTime(job.startsAt)}–${fmtTime(job.endsAt)}`} />
              <Row label="Estimat" value={`${estMinutes(job.startsAt, job.endsAt)} min`} />
              <Row label="Notat" value={job.notes ?? '—'} />
            </dl>
            <p className="mt-1 text-fg-faint text-xs">
              Kjøretøyhistorikk + Vegvesen-oppslag kobles til (lookup-ruteren finnes, F2-08).
            </p>
          </div>
        </CardShell>

        <CardShell>
          <div className="flex flex-col gap-2 rounded-lg bg-inset p-4">
            <p className="font-semibold text-[13px] text-fg">Tjeneste-sjekkliste</p>
            <ul className="flex flex-col gap-1.5">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex items-center gap-2 text-[13px] text-fg-muted">
                  <input type="checkbox" className="accent-[color:var(--ew-accent)]" />
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-fg-faint text-xs">Mock — sjekkliste-backend kommer.</p>
          </div>
        </CardShell>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-fg-faint">{label}</dt>
      <dd className="truncate text-fg">{value}</dd>
    </div>
  );
}
