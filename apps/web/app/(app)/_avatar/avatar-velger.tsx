'use client';

import { Avatar, Check, ChevronDown, CircleAlert, RefreshCw, StatefulButton } from '@endwise/ui';
import { useEffect, useRef, useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

/**
 * F6-19 — EGEN AVATAR: form, farge, humør og tone.
 *
 * ── ⛔ FIRE NEDTREKK, IKKE FIRE RUTENETT (omskrevet 20.08.2026) ───────────
 * Skjemaet viste før alle valgene samtidig: 10 former + 8 farger + 6 toner =
 * 24 knapper i tre rader, og humøret ville gjort det til 34. Da blir siden en
 * fargeprøve å skanne i stedet for fire valg å ta.
 *
 * Nå er hver egenskap ett nedtrekk som viser DET VALGTE, og åpner en liste når
 * du vil bytte. ⚠️ Forhåndsvisningene i lista er beholdt — det var hele
 * poenget med rutenettene: «Knott» sier ingenting, en knott gjør det. Vi har
 * fjernet samtidigheten, ikke bildene.
 *
 * Rekkefølgen er eiers: **form → farge → humør → tone**. Den følger hvor mye
 * valget endrer ansiktet: silhuetten er identiteten, fargen er det neste øyet
 * ser, humøret er uttrykket, og tonen er finjusteringen.
 *
 * ── Humør er nytt, og innvendingen fra sist gjelder ikke ──────────────────
 * Jeg frarådet uttrykk da de var noe SYSTEMET skulle sette — da påstår
 * maskinen et humør på vegne av et menneske. Dette er det motsatte: ditt eget
 * valg om ditt eget ansikt. ⚠️ Utvalget er kuratert (ingen sint/syk/redd) —
 * begrunnelsen står i `AVATAR_HUMOR` i skjemaet.
 */

/** ⛔ Typene kommer fra SERVEREN, så skjemaet kun kan sende det ruta godtar. */
type Valg = RouterOutput['profile']['meg']['avatar'];
type Form = NonNullable<Valg['form']>;
type Humor = NonNullable<Valg['humor']>;

const FORMER: { key: Form; label: string }[] = [
  { key: 'round', label: 'Rund' },
  { key: 'organic', label: 'Organisk' },
  { key: 'boxy', label: 'Kantet' },
  { key: 'capsule', label: 'Kapsel' },
  { key: 'nub', label: 'Knott' },
  { key: 'cloud', label: 'Sky' },
  { key: 'droplet', label: 'Dråpe' },
  { key: 'hexagon', label: 'Sekskant' },
  { key: 'sun', label: 'Sol' },
  { key: 'triangle', label: 'Trekant' },
];

/** Åtte punkter rundt fargesirkelen — en 360-stegs slider er mer presisjon enn valget har. */
const FARGER: { grader: number; label: string }[] = [
  { grader: 20, label: 'Rød' },
  { grader: 60, label: 'Oransje' },
  { grader: 110, label: 'Gul' },
  { grader: 150, label: 'Grønn' },
  { grader: 195, label: 'Turkis' },
  { grader: 250, label: 'Blå' },
  { grader: 300, label: 'Lilla' },
  { grader: 340, label: 'Rosa' },
];

/**
 * ⚠️ `idle` står som et EGET valg og ikke bare som «per navn»: å bevisst velge
 * et nøytralt ansikt er noe annet enn å ikke ha tatt stilling.
 */
const HUMOR: { key: Humor; label: string; hint: string }[] = [
  { key: 'idle', label: 'Nøytral', hint: 'Standard — ingen positur' },
  { key: 'happy', label: 'Blid', hint: 'Løftet, smale øyne' },
  { key: 'wink', label: 'Blunk', hint: 'Ett øye lukket' },
  { key: 'smug', label: 'Selvtilfreds', hint: 'Skjevt og fornøyd' },
  { key: 'sleepy', label: 'Trøtt', hint: 'Tunge øyelokk' },
  { key: 'thinking', label: 'Tenker', hint: 'Blikket til siden' },
  { key: 'surprised', label: 'Overrasket', hint: 'Store øyne' },
  { key: 'unsure', label: 'Usikker', hint: 'Skjevt, nølende' },
  { key: 'love', label: 'Forelsket', hint: 'Varm tone' },
  { key: 'shy', label: 'Sjenert', hint: 'Ser ned' },
];

/** De seks svatsjene, i bibliotekets rekkefølge (`TONES` i `color.ts`). */
const TONER = ['Pastell', 'Blek', 'Mid', 'Dyp', 'Lys', 'Blekk'];

export const TOMT: Valg = { form: null, humor: null, farge: null, tone: null };

export function AvatarVelger({
  seed,
  utenKort = false,
  visLagre = true,
}: {
  seed: string | null;
  utenKort?: boolean;
  visLagre?: boolean;
}) {
  const utils = trpc.useUtils();
  const meg = trpc.profile.meg.useQuery(undefined, { retry: false });

  const [valg, setValg] = useState<Valg>(TOMT);
  /** Hvilket nedtrekk står åpent. ⛔ Ett om gangen — som sidebaren. */
  const [apen, setApen] = useState<string | null>(null);

  useEffect(() => {
    if (meg.data?.avatar) setValg(meg.data.avatar);
  }, [meg.data?.avatar]);

  const lagre = trpc.profile.setAvatar.useMutation({
    onSuccess: () => {
      void utils.profile.meg.invalidate();
      /* Andres visning av MEG kommer fra directory — den må også hentes på nytt,
         ellers står det gamle ansiktet i innboksen til cachen (5 min) løper ut. */
      void utils.directory.participants.invalidate();
    },
  });

  function velg(neste: Valg) {
    setValg(neste);
    if (!visLagre) lagre.mutate(neste);
  }

  if (!seed) return null;

  const endret =
    valg.form !== (meg.data?.avatar?.form ?? null) ||
    valg.humor !== (meg.data?.avatar?.humor ?? null) ||
    valg.farge !== (meg.data?.avatar?.farge ?? null) ||
    valg.tone !== (meg.data?.avatar?.tone ?? null);

  const formLabel = FORMER.find((f) => f.key === valg.form)?.label;
  const humorLabel = HUMOR.find((h) => h.key === valg.humor)?.label;
  const fargeLabel = FARGER.find((f) => f.grader === valg.farge)?.label;
  const toneLabel = valg.tone === null ? undefined : TONER[valg.tone];

  const innhold = (
    <>
      <div className="flex items-start gap-4">
        {/**
         * ⛔ `alltid` — bevegelsen ER innholdet her. Du står og ser på ansiktet
         * mens du endrer det, og overgangen MELLOM to humør krever animasjon;
         * uten den ville et humørbytte bare vært et nytt stillbilde.
         *
         * To størrelser: 48px er kundekortet, 20px er samtalelista. Det som ser
         * bra ut stort kan være grøt smått — særlig et humør.
         */}
        <div className="flex items-end gap-2">
          <Avatar seed={seed} valg={valg} navn="" size={48} bevegelse="alltid" />
          <Avatar seed={seed} valg={valg} navn="" size={20} bevegelse="alltid" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label text-fg">Avataren din</p>
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Vises i innboksen og der kollegaer ser navnet ditt. Alt du ikke velger, utledes fra
            kontoen din — og blir det samme hver gang.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Nedtrekk
          id="form"
          tittel="Form"
          valgtLabel={formLabel}
          apen={apen === 'form'}
          onToggle={() => setApen(apen === 'form' ? null : 'form')}
          forhandsvisning={<Avatar seed={seed} valg={valg} navn="" size={22} bevegelse="stille" />}
          onNullstill={() => velg({ ...valg, form: null })}
        >
          {FORMER.map((f) => (
            <Rad
              key={f.key}
              valgt={valg.form === f.key}
              label={f.label}
              onClick={() => {
                velg({ ...valg, form: f.key });
                setApen(null);
              }}
            >
              <Avatar
                seed={seed}
                valg={{ ...valg, form: f.key }}
                navn=""
                size={24}
                bevegelse="stille"
              />
            </Rad>
          ))}
        </Nedtrekk>

        <Nedtrekk
          id="farge"
          tittel="Farge"
          valgtLabel={fargeLabel}
          apen={apen === 'farge'}
          onToggle={() => setApen(apen === 'farge' ? null : 'farge')}
          forhandsvisning={<Avatar seed={seed} valg={valg} navn="" size={22} bevegelse="stille" />}
          onNullstill={() => velg({ ...valg, farge: null })}
        >
          {FARGER.map((f) => (
            <Rad
              key={f.grader}
              valgt={valg.farge === f.grader}
              label={f.label}
              onClick={() => {
                velg({ ...valg, farge: f.grader });
                setApen(null);
              }}
            >
              <Avatar
                seed={seed}
                valg={{ ...valg, farge: f.grader }}
                navn=""
                size={24}
                bevegelse="stille"
              />
            </Rad>
          ))}
        </Nedtrekk>

        <Nedtrekk
          id="humor"
          tittel="Humør"
          valgtLabel={humorLabel}
          apen={apen === 'humor'}
          onToggle={() => setApen(apen === 'humor' ? null : 'humor')}
          forhandsvisning={<Avatar seed={seed} valg={valg} navn="" size={22} bevegelse="stille" />}
          onNullstill={() => velg({ ...valg, humor: null })}
          hint="Positurer avataren holder. Overgangen mellom dem vises der ansiktet animeres."
        >
          {HUMOR.map((h) => (
            <Rad
              key={h.key}
              valgt={valg.humor === h.key}
              label={h.label}
              hint={h.hint}
              onClick={() => {
                velg({ ...valg, humor: h.key });
                setApen(null);
              }}
            >
              {/**
               * ⚠️ `hover` og ikke `stille` KUN her: et humør er en positur, og
               * flere av dem skiller seg lite på 24px i stillbilde. Peker du på
               * raden, morfer den — så du ser forskjellen før du velger. Lista er
               * ti rader og åpen om gangen, ikke to hundre.
               */}
              <Avatar
                seed={seed}
                valg={{ ...valg, humor: h.key }}
                navn=""
                size={24}
                bevegelse="hover"
              />
            </Rad>
          ))}
        </Nedtrekk>

        <Nedtrekk
          id="tone"
          tittel="Tone"
          valgtLabel={toneLabel}
          apen={apen === 'tone'}
          onToggle={() => setApen(apen === 'tone' ? null : 'tone')}
          forhandsvisning={<Avatar seed={seed} valg={valg} navn="" size={22} bevegelse="stille" />}
          onNullstill={() => velg({ ...valg, tone: null })}
        >
          {TONER.map((t, i) => (
            <Rad
              key={t}
              valgt={valg.tone === i}
              label={t}
              onClick={() => {
                velg({ ...valg, tone: i });
                setApen(null);
              }}
            >
              <Avatar
                seed={seed}
                valg={{ ...valg, tone: i }}
                navn=""
                size={24}
                bevegelse="stille"
              />
            </Rad>
          ))}
        </Nedtrekk>
      </div>

      {lagre.error && (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {lagre.error.message}
        </p>
      )}

      {visLagre ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => velg(TOMT)}
            className="inline-flex h-control items-center gap-1.5 rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            Alt per navn
          </button>
          <StatefulButton
            type="button"
            onClick={() => lagre.mutate(valg)}
            disabled={!endret || lagre.isPending}
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
            successText="Lagret"
            errorText="Feilet"
          >
            Lagre avatar
          </StatefulButton>
        </div>
      ) : null}
    </>
  );

  if (utenKort) {
    return <div className="flex flex-col gap-4">{innhold}</div>;
  }
  return <CardShell className="flex flex-col gap-4 p-5">{innhold}</CardShell>;
}

/**
 * Ett nedtrekk: knapp som viser valgt verdi, liste som åpner seg under.
 *
 * ⚠️ Samme høydeanimasjon som sidebar-navet (`grid-template-rows: 0fr → 1fr`)
 * i stedet for `max-height`: lista har ulikt antall rader per egenskap — 6, 8
 * og 10 — og en gjettet maks-høyde ville enten klippet eller hengt.
 */
function Nedtrekk({
  id,
  tittel,
  valgtLabel,
  apen,
  onToggle,
  onNullstill,
  forhandsvisning,
  hint,
  children,
}: {
  id: string;
  tittel: string;
  valgtLabel?: string;
  apen: boolean;
  onToggle: () => void;
  onNullstill: () => void;
  forhandsvisning: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  const listeRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`flex flex-col gap-1.5 ${apen ? 'col-span-full' : ''}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-label text-fg">{tittel}</span>
        {/* «Per navn» er en ekte, valgbar tilstand — ikke fravær av et valg. */}
        <button
          type="button"
          onClick={onNullstill}
          className={`text-[12px] transition-colors ${
            valgtLabel ? 'text-fg-muted underline underline-offset-2 hover:text-fg' : 'text-fg'
          }`}
        >
          {valgtLabel ? '· bruk per navn' : '· per navn'}
        </button>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={apen}
        aria-controls={`liste-${id}`}
        className="flex h-11 items-center gap-2.5 rounded-control border border-border bg-bg px-2.5 text-left transition-colors hover:bg-surface-2"
      >
        {forhandsvisning}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-label text-fg">{valgtLabel ?? 'Per navn'}</span>
          {hint && !valgtLabel && (
            <span className="truncate text-[11px] text-fg-muted">{hint}</span>
          )}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={1.75}
          className={`shrink-0 text-fg-muted transition-transform duration-200 ${apen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <div
        id={`liste-${id}`}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          apen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        aria-hidden={!apen}
      >
        <div className="min-h-0 overflow-hidden">
          {/* ⚠️ Egen scroll ved 10 rader: humørlista er den lengste, og et
              nedtrekk som dytter «Lagre»-knappen ut av synsfeltet er verre enn
              et som scroller. */}
          <div
            ref={listeRef}
            className="mt-1 flex max-h-[264px] flex-col gap-0.5 overflow-y-auto rounded-control border border-border bg-bg p-1"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Én rad i et nedtrekk: bilde, navn, og hake på den valgte. */
function Rad({
  valgt,
  label,
  hint,
  onClick,
  children,
}: {
  valgt: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={valgt}
      className={`flex h-10 shrink-0 items-center gap-2.5 rounded-control px-2 text-left transition-colors ${
        valgt ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
      }`}
    >
      {children}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label">{label}</span>
        {hint && <span className="truncate text-[11px] text-fg-muted">{hint}</span>}
      </span>
      {valgt && <Check size={15} strokeWidth={2} className="shrink-0 text-fg" aria-hidden />}
    </button>
  );
}
