'use client';

import { Car, ChevronRight, CircleAlert, RefreshCw, StatefulButton, Users } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { STATUS_LABEL, STATUS_TONE } from '../../bookinger/_status';
import { dato, EuFrist, Feil, kroner, Laster, Seksjon, TYPE_LABEL } from '../../kunder/_delt';

/**
 * Kjøretøykortet: data, eier og servicehistorikk.
 * Feltene fra Vegvesenet er speilet, ikke vår sannhet. Merke, modell,
 * årsmodell, understellsnummer og EU-frist kommer fra Autosys (F2-08) og
 * skrives av oppslaget — ikke for hånd. Derfor står «sist oppdatert» synlig:
 * et speil uten dato er en påstand uten alder.
 * Båt og atv finnes ofte ikke i Autosys i det hele tatt. Da er feltene tomme,
 * og det er riktig — ikke en feil å skjule.
 */
export default function KjoretoykortPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const utils = trpc.useUtils();

  const kj = trpc.vehicles.byId.useQuery({ id }, { enabled: Boolean(id) });

  const oppdater = trpc.lookup.refreshVehicle.useMutation({
    onSuccess: () => void utils.vehicles.byId.invalidate({ id }),
  });

  if (kj.isLoading) return <Laster />;
  if (kj.isError) return <Feil melding={kj.error.message} />;

  const v = kj.data;
  if (!v) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-8 py-7">
        <CardShell className="flex items-start gap-3 p-6">
          <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
          <div>
            <p className="text-label text-fg">Fant ikke kjøretøyet</p>
            <Link
              href={'/kjoretoy' as Route}
              className="mt-3 inline-block text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
            >
              ← Tilbake til kjøretøy
            </Link>
          </div>
        </CardShell>
      </div>
    );
  }

  const tittel = [v.make, v.model].filter(Boolean).join(' ') || TYPE_LABEL[v.type];

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-8 py-7">
      {/* Hva */}
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-control bg-surface-2 text-fg-muted">
          <Car size={22} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="sr-only">Kjøretøy · {v.regNumber ?? tittel}</h1>
          <p className="font-mono text-title text-fg">{v.regNumber ?? 'Uten regnr'}</p>
          <p className="text-body text-fg-muted">
            {tittel}
            {v.modelYear ? ` · ${v.modelYear}` : ''} · {TYPE_LABEL[v.type]}
          </p>
        </div>

        {/*
         * Vegvesen-oppslag er en betalt tjeneste per kall (modul `vegvesen`).
         * Knappen er derfor eksplisitt, aldri automatisk ved sidelast.
         */}
        {v.regNumber && (
          <StatefulButton
            disabled={oppdater.isPending}
            onClick={() => oppdater.mutate({ vehicleId: v.id, regNumber: v.regNumber ?? '' })}
            state={
              oppdater.isPending
                ? 'loading'
                : oppdater.isError
                  ? 'error'
                  : oppdater.isSuccess
                    ? 'success'
                    : 'idle'
            }
            loadingText="Slår opp…"
            successText="Oppdatert"
            errorText="Feilet"
            icon={<RefreshCw size={15} />}
          >
            Hent fra Vegvesenet
          </StatefulButton>
        )}
      </div>

      {oppdater.error && (
        <CardShell className="flex items-start gap-3 p-4">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-body text-danger">{oppdater.error.message}</p>
        </CardShell>
      )}

      {/* Fakta */}
      <Seksjon tittel="Om kjøretøyet">
        <CardShell className="p-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-[13px] sm:grid-cols-[auto_1fr_auto_1fr]">
            <Felt navn="Merke" verdi={v.make} />
            <Felt navn="Modell" verdi={v.model} />
            <Felt navn="Årsmodell" verdi={v.modelYear} />
            <Felt navn="Type" verdi={TYPE_LABEL[v.type]} />
            <dt className="text-fg-muted">EU-frist</dt>
            <dd className="tabular-nums">
              <EuFrist dato={v.inspectionDue} />
            </dd>
            <Felt navn="Understellsnr" verdi={v.vin} mono />
          </dl>

          <p className="mt-4 border-border border-t pt-3 text-[11px] text-fg-muted leading-relaxed">
            {v.lookupAt ? (
              <>Speilet fra Vegvesenet {dato(v.lookupAt)}. Feltene over redigeres ikke her.</>
            ) : (
              <>
                Aldri slått opp mot Vegvesenet. Båt og ATV finnes ofte ikke i Autosys — da er tomme
                felt riktig svar, ikke en feil.
              </>
            )}
          </p>

          {/*
           * Garanti finnes ikke i datamodellen. Å tegne et tomt «Garanti»-felt
           * ville antydet at vi vet noe vi ikke vet.
           */}
          <p className="mt-2 text-[11px] text-fg-muted">
            Garantiinformasjon finnes ikke i registeret ennå — det er ikke et felt vi henter fra
            Autosys, og det er ikke lagt inn manuelt.
          </p>
        </CardShell>
      </Seksjon>

      {/* Eier */}
      <Seksjon tittel="Eier">
        {v.eier ? (
          <Link href={`/kunder/${v.eier.id}` as Route} className="group block">
            <div className="flex h-row-store items-center gap-4 rounded-xl border border-border bg-bg px-4 transition-colors group-hover:bg-surface-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft font-medium text-[12px] text-accent-strong">
                {v.eier.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-label text-fg">{v.eier.name}</span>
                <span className="truncate text-[12px] text-fg-muted">
                  {[v.eier.phone, v.eier.email].filter(Boolean).join(' · ') || 'Ingen kontaktinfo'}
                </span>
              </div>
              <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
            </div>
          </Link>
        ) : (
          <CardShell className="flex items-start gap-3 p-4">
            <Users size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
            <p className="text-[12px] text-fg-muted">
              Ingen eier koblet. Kjøretøyet kan være registrert fra en booking uten kundekobling.
            </p>
          </CardShell>
        )}
      </Seksjon>

      {/* Servicehistorikk */}
      <Seksjon tittel="Servicehistorikk" antall={v.saker.length}>
        {v.saker.length === 0 ? (
          <CardShell className="p-6 text-center">
            <p className="text-[12px] text-fg-muted">Ingen saker på dette kjøretøyet ennå.</p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {v.saker.map((s, i) => (
              <Link key={s.id} href={`/bookinger/${s.id}` as Route} className="group block">
                <div
                  className={`flex min-h-row-store items-center gap-4 bg-bg px-4 py-2 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <span className="w-28 shrink-0 text-[12px] text-fg-muted tabular-nums">
                    {dato(s.startsAt)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-label text-fg">
                      {s.serviceName ?? 'Tjeneste'}
                    </span>
                    <span className="truncate text-[12px] text-fg-muted">
                      {s.mechanicName ?? 'Ingen mekaniker'}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </span>
                  </div>
                  <span className="w-20 shrink-0 text-right text-[12px] text-fg-muted tabular-nums">
                    {kroner(s.priceMinor)}
                  </span>
                  <span
                    className={`inline-flex h-badge shrink-0 items-center rounded-badge px-2 font-medium text-[11px] ${
                      STATUS_TONE[s.status] ?? 'bg-surface-2 text-fg-muted'
                    }`}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Seksjon>

      <Link
        href={'/kjoretoy' as Route}
        className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted transition-colors hover:text-fg"
      >
        ← Alle kjøretøy
      </Link>
    </div>
  );
}

function Felt({ navn, verdi, mono }: { navn: string; verdi?: string | null; mono?: boolean }) {
  return (
    <>
      <dt className="text-fg-muted">{navn}</dt>
      <dd className={`text-fg ${mono ? 'font-mono text-[12px]' : ''}`}>{verdi || '—'}</dd>
    </>
  );
}
