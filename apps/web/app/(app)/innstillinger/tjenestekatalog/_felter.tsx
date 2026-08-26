'use client';

import { CircleAlert, TriangleAlert } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { visVarighet } from './_felles';

/**
 * F2-05 / F5-04 — feltsettet som er felles for «ny tjeneste» og «ny versjon».
 * Én definisjon, to kallsteder — med vilje. `create` og `update` tar
 * nøyaktig de samme fire versjonsfeltene, fordi begge skriver en rad i
 * `service_versions`. Hadde skjemaene vært skrevet hver for seg, ville de før
 * eller siden fått ulik validering, og da ville «rediger» kunnet lagre noe
 * «opprett» aldri ville godtatt.
 * Navn og kjøretøytype er ikke her: de bor på `services` og er tjenestens
 * identitet. De settes én gang og versjoneres ikke — endrer du dem, er det en
 * annen tjeneste.
 */
export type Versjonsfelter = {
  varighet: string;
  pris: string;
  ferdigheter: string[];
  beskrivelse: string;
};

export const TOMME_FELTER: Versjonsfelter = {
  varighet: '60',
  pris: '',
  ferdigheter: [],
  beskrivelse: '',
};

const INPUT =
  'h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg';

export function TjenesteFelter({
  verdier,
  onEndre,
}: {
  verdier: Versjonsfelter;
  onEndre: (neste: Versjonsfelter) => void;
}) {
  /**
   * Ferdigheter velges fra registeret, aldri som fritekst.
   * `service_versions.skills` peker på `skills.key` (F3-12), og det er den
   * koblingen MechanicMatcher (F3-02) bruker for å finne en mekaniker som kan
   * jobben. En skrivefeil her ville ikke gitt noen feilmelding — den ville gitt
   * en tjeneste som ingen mekaniker matcher, og en booking som stille aldri blir
   * tildelt. Derfor avkrysning, ikke tekstfelt.
   */
  const ferdigheter = trpc.competence.listSkills.useQuery();
  const kjente = new Set((ferdigheter.data ?? []).map((f) => f.key));
  /** Nøkler versjonen bærer, men som ikke lenger finnes i registeret. */
  const ukjente = verdier.ferdigheter.filter((k) => !kjente.has(k));

  const varighetTall = Number(verdier.varighet);
  const varighetGyldig = Number.isFinite(varighetTall) && varighetTall >= 5 && varighetTall <= 480;

  function veksleFerdighet(key: string) {
    const har = verdier.ferdigheter.includes(key);
    onEndre({
      ...verdier,
      ferdigheter: har
        ? verdier.ferdigheter.filter((k) => k !== key)
        : [...verdier.ferdigheter, key],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Varighet (minutter)</span>
          <input
            inputMode="numeric"
            value={verdier.varighet}
            onChange={(e) => onEndre({ ...verdier, varighet: e.target.value })}
            placeholder="60"
            className={INPUT}
          />
          <span className="text-[12px] text-fg-muted">
            {varighetGyldig
              ? `${visVarighet(varighetTall)} — styrer hvor lang tiden blir i kalenderen.`
              : 'Mellom 5 og 480 minutter.'}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Pris til kunde (kr)</span>
          <input
            inputMode="decimal"
            value={verdier.pris}
            onChange={(e) => onEndre({ ...verdier, pris: e.target.value })}
            placeholder="1450"
            className={INPUT}
          />
          {/* Tomt felt er en gyldig og meningsbærende tilstand — ikke gratis. */}
          <span className="text-[12px] text-fg-muted">
            La feltet stå tomt for «pris på forespørsel».
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-label text-fg">Ferdigheter jobben krever</span>
        {ferdigheter.isLoading ? (
          <p className="text-[12px] text-fg-muted">Laster ferdigheter …</p>
        ) : (ferdigheter.data?.length ?? 0) === 0 ? (
          <p className="flex items-start gap-2 text-[12px] text-fg-muted">
            <CircleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <span>
              Ingen ferdigheter er registrert ennå. Uten dem tildeles saken manuelt.{' '}
              <Link
                href={'/mekanikere/kompetanse' as Route}
                className="underline underline-offset-2 hover:text-fg"
              >
                Legg inn ferdigheter
              </Link>
            </span>
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {ferdigheter.data?.map((f) => {
              const valgt = verdier.ferdigheter.includes(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={valgt}
                  onClick={() => veksleFerdighet(f.key)}
                  title={f.requiresCertification ? 'Krever gyldig sertifisering' : undefined}
                  className={`inline-flex h-control items-center gap-1.5 rounded-control border px-2.5 text-label transition-colors ${
                    valgt
                      ? 'border-fg bg-sidebar-active text-fg'
                      : 'border-border text-fg-muted hover:text-fg'
                  }`}
                >
                  {f.name}
                  {f.requiresCertification && <span aria-hidden>🔒</span>}
                </button>
              );
            })}
          </div>
        )}

        {ukjente.length > 0 && (
          /*
           * En nøkkel som er fjernet fra registeret etter at versjonen ble
           * skrevet. Den skjules ikke: da ville den forsvunnet stille ved neste
           * lagring, og matchingen endret seg uten at noen valgte det.
           */
          <p className="flex items-start gap-2 text-[12px] text-warn">
            <TriangleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <span>
              Ukjente nøkler fra en tidligere versjon: {ukjente.join(', ')}. De finnes ikke i
              ferdighetsregisteret lenger, og ingen mekaniker vil matche på dem.
            </span>
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-label text-fg">Beskrivelse</span>
        <textarea
          value={verdier.beskrivelse}
          onChange={(e) => onEndre({ ...verdier, beskrivelse: e.target.value })}
          rows={2}
          maxLength={600}
          placeholder="Hva er inkludert? Vises til kunden ved booking."
          className="rounded-control border border-border bg-bg px-2.5 py-2 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
        />
      </label>
    </div>
  );
}
