'use client';

import {
  Avatar,
  CalendarDays,
  Car,
  CircleAlert,
  Gauge,
  hexForFarge,
  StatefulButton,
  staffFargeStil,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { osloDagsvindu, osloKalenderdag } from '../../_lib/oslo-dag';
import { useOrgRole } from '../../_lib/use-org-role';
import { AnsattePiller } from '../../_shell/ansatte-piller';
import { CardShell } from '../../_shell/cards';
import { TimeplanStripe } from '../../_shell/timeplan-stripe';
import { Feil, Laster, Tomt } from '../../kunder/_delt';
import { estMinutes, fmtTime, STATUS_LABEL } from '../../min-dag/_status';
import { FELT } from '../kompetanse/_niva';

const TELLER_STATUS = new Set(['draft', 'confirmed', 'in_progress']);

/**
 * F3-08 / F7-03 — Ansatte › Timeplan.
 * Ikke en annen modell enn mekanikerens Timeplan: kapasitet bor på
 * `mechanics.capacity`, jobbene er bookinger for valgt dag. Lederen justerer
 * hvor mange jobber mekanikeren kan ha samtidig.
 */
export default function TimeplanPage() {
  return <TimeplanFlate />;
}

export function TimeplanFlate({
  skjulPiller = false,
  valgt: valgtUtenfra,
  onValgt,
  skjulStripe = false,
}: {
  skjulPiller?: boolean;
  valgt?: string;
  onValgt?: (ymd: string) => void;
  skjulStripe?: boolean;
}) {
  const { isAdmin } = useOrgRole();
  const [internValgt, setInternValgt] = useState(() => osloKalenderdag(new Date()));
  const valgt = valgtUtenfra ?? internValgt;
  const setValgt = onValgt ?? setInternValgt;
  const vindu = osloDagsvindu(valgt);

  const mekanikere = trpc.mechanics.oversikt.useQuery();
  const kalender = trpc.bookings.calendar.useQuery({ from: vindu.from, to: vindu.to });

  const feil = mekanikere.error ?? kalender.error;
  const laster = mekanikere.isLoading || kalender.isLoading;

  const jobberPer = new Map<string, NonNullable<typeof kalender.data>>();
  for (const jobb of kalender.data ?? []) {
    if (!jobb.mechanicId) continue;
    const liste = jobberPer.get(jobb.mechanicId) ?? [];
    liste.push(jobb);
    jobberPer.set(jobb.mechanicId, liste);
  }

  return (
    <div
      className={
        skjulPiller
          ? 'flex flex-col gap-5'
          : 'mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7'
      }
    >
      <div>
        <h1 className="sr-only">Timeplan</h1>
        {skjulPiller ? null : (
          <p className="flex items-center gap-2 text-title text-fg">
            <CalendarDays size={18} strokeWidth={1.75} className="text-fg-muted" />
            Timeplan
          </p>
        )}
        <p className="text-body text-fg-muted">
          Kapasitet og jobber per mekaniker. Samme dag-stripe som på Timeplan under Min dag.
        </p>
        {skjulPiller ? null : (
          <div className="mt-3">
            <AnsattePiller />
          </div>
        )}
      </div>

      {skjulStripe ? null : <TimeplanStripe valgt={valgt} onValgt={setValgt} />}

      {laster ? (
        <Laster />
      ) : feil ? (
        <Feil melding={feil.message} />
      ) : (mekanikere.data?.length ?? 0) === 0 ? (
        <Tomt
          tittel="Ingen mekanikere ennå"
          hint="Mekanikere opprettes når noen får jobbfunksjonen mekaniker, eller synkes inn."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {mekanikere.data?.map((m) => (
            <MekanikerTimeplan
              key={m.id}
              mekaniker={m}
              jobber={jobberPer.get(m.id) ?? []}
              kanEndre={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Mekaniker = RouterOutput['mechanics']['oversikt'][number];
type Jobb = RouterOutput['bookings']['calendar'][number];

function MekanikerTimeplan({
  mekaniker,
  jobber,
  kanEndre,
}: {
  mekaniker: Mekaniker;
  jobber: Jobb[];
  kanEndre: boolean;
}) {
  const utils = trpc.useUtils();
  const [kapasitet, setKapasitet] = useState(String(mekaniker.capacity));
  const [redigerer, setRedigerer] = useState(false);

  const last = jobber.filter((j) => TELLER_STATUS.has(j.status)).length;

  const lagre = trpc.mechanics.updateCapacity.useMutation({
    onSuccess: () => {
      void utils.mechanics.oversikt.invalidate();
      void utils.mechanics.list.invalidate();
      setRedigerer(false);
    },
  });

  const tall = Number(kapasitet);
  const gyldig = Number.isInteger(tall) && tall >= 1 && tall <= 10;

  return (
    <CardShell>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Avatar
          seed={mekaniker.id}
          valg={{ ...mekaniker.avatar, humor: mekaniker.statusHumor }}
          navn={mekaniker.name}
          size={32}
          bevegelse="stille"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label text-fg">{mekaniker.name}</p>
          <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            <span
              aria-hidden
              className="inline-block size-2 rounded-full"
              style={{
                backgroundColor: hexForFarge(
                  mekaniker.farge ?? mekaniker.avatar?.farge,
                  mekaniker.id,
                ),
              }}
            />
            {mekaniker.statusLabel}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] text-fg-muted tabular-nums">
          <Gauge size={13} strokeWidth={1.75} />
          {last} av {mekaniker.capacity} i dag
        </span>
        {kanEndre && !redigerer && (
          <button
            type="button"
            onClick={() => {
              setKapasitet(String(mekaniker.capacity));
              setRedigerer(true);
            }}
            className="h-control rounded-control border border-border px-2.5 text-label text-fg hover:bg-surface-2"
          >
            Rediger kapasitet
          </button>
        )}
      </div>

      {redigerer && (
        <form
          className="flex flex-col gap-3 border-border border-t px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!gyldig) return;
            lagre.mutate({ mechanicId: mekaniker.id, capacity: tall });
          }}
        >
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className="text-label text-fg">Samtidige jobber</span>
            <input
              inputMode="numeric"
              value={kapasitet}
              onChange={(e) => setKapasitet(e.target.value)}
              className={FELT}
            />
            <span className="text-[12px] text-fg-muted">
              1 = én om gangen. Styrer matching og ledige tider i widgeten.
            </span>
          </label>
          {lagre.isError && (
            <p className="flex items-start gap-2 text-body text-danger">
              <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              {lagre.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRedigerer(false)}
              className="h-control rounded-control px-3 text-label text-fg-muted hover:text-fg"
            >
              Avbryt
            </button>
            <StatefulButton
              type="submit"
              disabled={!gyldig || lagre.isPending}
              state={
                lagre.isPending
                  ? 'loading'
                  : lagre.isSuccess
                    ? 'success'
                    : lagre.isError
                      ? 'error'
                      : 'idle'
              }
              loadingText="Lagrer…"
              successText="Lagret"
              errorText="Feilet"
            >
              Lagre
            </StatefulButton>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2 border-border border-t px-4 py-3">
        {jobber.length === 0 ? (
          <p className="text-fg-faint text-sm">Ingen jobber denne dagen.</p>
        ) : (
          jobber.map((job) => (
            <Link key={job.id} href={`/bookinger/${job.id}` as Route} className="block">
              <div
                className="flex items-center gap-3 rounded-lg border p-3"
                style={staffFargeStil(mekaniker.farge ?? mekaniker.avatar?.farge, mekaniker.id)}
              >
                <div className="w-14 shrink-0 text-center font-semibold text-[13px] text-primary tabular-nums">
                  {fmtTime(job.startsAt)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Car size={13} className="shrink-0 text-fg-muted" />
                    <span className="truncate font-semibold text-[13px] text-fg">
                      {job.regNumber ?? 'Ukjent regnr'}
                    </span>
                  </div>
                  <p className="truncate text-fg-faint text-xs">
                    {job.customerName ?? 'Ukjent kunde'} · est.{' '}
                    {estMinutes(job.startsAt, job.endsAt)} min
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[10px] text-fg-muted">
                  {STATUS_LABEL[job.status] ?? job.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </CardShell>
  );
}
