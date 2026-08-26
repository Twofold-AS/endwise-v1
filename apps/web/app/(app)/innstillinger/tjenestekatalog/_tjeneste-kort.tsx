'use client';

import {
  ChevronDown,
  CircleAlert,
  Clock,
  ClockArrowUp,
  RefreshCw,
  StatefulButton,
  Tags,
} from '@endwise/ui';
import { useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { datoTid, kroner } from '../../kunder/_delt';
import { parsePris, prisTilFelt, TYPE_VALG, visVarighet } from './_felles';
import { TjenesteFelter, type Versjonsfelter } from './_felter';

type Tjeneste = RouterOutput['services']['list'][number];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TYPE_VALG.map((v) => [v.key, v.label]),
);

/**
 * F2-05 / F5-04 — ett kort per tjeneste: gjeldende versjon, redigering og historikk.
 * «Rediger» heter «Ny versjon», og det er ikke pynt. `services.update`
 * lukker den gjeldende versjonen med `validTo` og skriver en ny rad. Bookinger
 * fra i fjor peker på den gamle versjonen og endrer seg ikke. Kalte vi knappen
 * «Lagre», ville flaten fortalt en usannhet om hva som skjer — og en forhandler
 * som tror han retter en skrivefeil fra i går, ville i stedet innført en
 * prisendring som gjelder fra i dag.
 */
export function TjenesteKort({ tjeneste, kanEndre }: { tjeneste: Tjeneste; kanEndre: boolean }) {
  const utils = trpc.useUtils();
  const [apen, setApen] = useState(false);
  const [redigerer, setRedigerer] = useState(false);
  const [prisfeil, setPrisfeil] = useState<string | null>(null);
  const [felter, setFelter] = useState<Versjonsfelter>({
    varighet: String(tjeneste.durationMinutes),
    pris: prisTilFelt(tjeneste.priceMinor),
    ferdigheter: tjeneste.skills ?? [],
    beskrivelse: tjeneste.description ?? '',
  });

  /** Historikken hentes først når kortet åpnes — ikke for hele lista på sidelast. */
  const historikk = trpc.services.versions.useQuery({ serviceId: tjeneste.id }, { enabled: apen });

  const etterSkriving = () => {
    void utils.services.list.invalidate();
    void utils.services.versions.invalidate({ serviceId: tjeneste.id });
  };

  const lagre = trpc.services.update.useMutation({
    onSuccess: () => {
      etterSkriving();
      setRedigerer(false);
    },
  });
  const deaktiver = trpc.services.deactivate.useMutation({ onSuccess: etterSkriving });
  const reaktiver = trpc.services.reactivate.useMutation({ onSuccess: etterSkriving });

  function lagreVersjon() {
    const varighet = Number(felter.varighet);
    if (!Number.isFinite(varighet)) return;
    const pris = parsePris(felter.pris);
    if (!pris.ok) {
      setPrisfeil(pris.feil);
      return;
    }
    setPrisfeil(null);
    lagre.mutate({
      serviceId: tjeneste.id,
      durationMinutes: Math.round(varighet),
      priceMinor: pris.ore,
      skills: felter.ferdigheter,
      description: felter.beskrivelse.trim() || undefined,
    });
  }

  return (
    <CardShell className={tjeneste.active ? '' : 'opacity-60'}>
      {/* Hodet: alt man trenger for å kjenne igjen tjenesten */}
      <button
        type="button"
        onClick={() => setApen((v) => !v)}
        aria-expanded={apen}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 text-label text-fg">
            {tjeneste.name}
            <span className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted">
              {TYPE_LABEL[tjeneste.vehicleType] ?? tjeneste.vehicleType}
            </span>
            <span
              className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted tabular-nums"
              title={`Gjeldende versjon, i bruk siden ${datoTid(tjeneste.validFrom)}`}
            >
              v{tjeneste.version}
            </span>
            {!tjeneste.active && (
              <span className="inline-flex h-badge items-center rounded-badge bg-warn-soft px-1.5 text-[11px] text-warn">
                Deaktivert
              </span>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-3 text-[12px] text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} strokeWidth={1.75} />
              {visVarighet(tjeneste.durationMinutes)}
            </span>
            {/* «Pris på forespørsel» og «0 kr» er to ulike ting. */}
            <span className="tabular-nums">
              {tjeneste.priceMinor == null ? 'Pris på forespørsel' : kroner(tjeneste.priceMinor)}
            </span>
            {(tjeneste.skills?.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Tags size={12} strokeWidth={1.75} />
                {tjeneste.skills.length}
              </span>
            )}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-fg-muted transition-transform ${apen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {apen && (
        <div className="flex flex-col gap-5 border-border border-t px-4 py-4">
          {tjeneste.description && (
            <p className="text-body text-fg-muted">{tjeneste.description}</p>
          )}

          {/* Redigering — kun for dealer_admin */}
          {kanEndre &&
            (redigerer ? (
              <div className="flex flex-col gap-4">
                <p className="text-[12px] text-fg-muted">
                  Lagring lukker v{tjeneste.version} og oppretter v{tjeneste.version + 1}.
                  Eksisterende bookinger beholder prisen og varigheten de ble bestilt med.
                </p>

                <TjenesteFelter verdier={felter} onEndre={setFelter} />

                {(prisfeil || lagre.error) && (
                  <p className="flex items-start gap-2 text-body text-danger">
                    <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                    {prisfeil ?? lagre.error?.message}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRedigerer(false);
                      setPrisfeil(null);
                    }}
                    className="h-control rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
                  >
                    Avbryt
                  </button>
                  <StatefulButton
                    type="button"
                    onClick={lagreVersjon}
                    disabled={lagre.isPending}
                    state={
                      lagre.isPending
                        ? 'loading'
                        : lagre.isError
                          ? 'error'
                          : lagre.isSuccess
                            ? 'success'
                            : 'idle'
                    }
                    loadingText="Lagrer…"
                    successText="Ny versjon"
                    errorText="Feilet"
                  >
                    Lagre som v{tjeneste.version + 1}
                  </StatefulButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRedigerer(true)}
                  className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg transition-colors hover:bg-surface-2"
                >
                  <ClockArrowUp size={14} strokeWidth={1.75} />
                  Ny versjon
                </button>

                {tjeneste.active ? (
                  <button
                    type="button"
                    onClick={() => deaktiver.mutate({ serviceId: tjeneste.id })}
                    disabled={deaktiver.isPending}
                    className="inline-flex h-control items-center rounded-control border border-border px-2.5 text-label text-fg-muted transition-colors hover:text-danger disabled:opacity-50"
                    title="Tjenesten kan ikke velges på nye saker. Historikken beholdes, og den kan slås på igjen."
                  >
                    {deaktiver.isPending ? 'Deaktiverer…' : 'Deaktiver'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => reaktiver.mutate({ serviceId: tjeneste.id })}
                    disabled={reaktiver.isPending}
                    className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
                  >
                    <RefreshCw size={14} strokeWidth={1.75} />
                    {reaktiver.isPending ? 'Slår på…' : 'Slå på igjen'}
                  </button>
                )}
              </div>
            ))}

          {/* Historikken: beviset på at versjonering betyr noe */}
          <section className="flex flex-col gap-2">
            <h3 className="text-label text-fg">Versjoner</h3>
            {historikk.isLoading ? (
              <p className="text-[12px] text-fg-muted">Laster versjoner …</p>
            ) : historikk.isError ? (
              <p className="text-[12px] text-danger">{historikk.error.message}</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                {historikk.data?.map((v, i) => (
                  <div
                    key={v.id}
                    className={`flex h-row flex-wrap items-center gap-3 px-3 text-[12px] ${
                      i > 0 ? 'border-border border-t' : ''
                    } ${v.validTo == null ? 'bg-bg' : 'bg-surface-2/40'}`}
                  >
                    <span className="w-8 shrink-0 text-fg tabular-nums">v{v.version}</span>
                    <span className="w-24 shrink-0 text-fg-muted tabular-nums">
                      {visVarighet(v.durationMinutes)}
                    </span>
                    <span className="w-28 shrink-0 text-fg-muted tabular-nums">
                      {v.priceMinor == null ? 'På forespørsel' : kroner(v.priceMinor)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-fg-muted">
                      {datoTid(v.validFrom)}
                      {v.validTo ? ` → ${datoTid(v.validTo)}` : ' → gjelder nå'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </CardShell>
  );
}
