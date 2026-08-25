import { Blobatar } from '@blobatar/react';
import {
  happy,
  idle,
  love,
  shy,
  sleepy,
  smug,
  surprised,
  thinking,
  unsure,
  wink,
} from 'blobatar/expression';
import { cn } from '../lib/utils.ts';

/**
 * F6-19 — AVATAR. Deterministisk ansikt fra en stabil ID (blobatar).
 *
 * ── ⛔ SEEDEN ER EN ID, ALDRI ET NAVN ──────────────────────────────────────
 * `seed` skal være radens ID — `customers.id`, `mechanics.id`, `user.id`. Aldri
 * navnet. Retter noen en skrivefeil i «Kari Nordmman», skal ikke personen bytte
 * ansikt; og to kunder som begge heter «Ola Hansen» skal ikke dele det.
 * `navn` finnes her KUN som tilgjengelig tekst (`title`/`alt`).
 *
 * ── ⛔ `bevegelse` ER PÅKREVD, OG DET ER HELE POENGET ──────────────────────
 * Animasjon koster ulikt på ulike flater: statisk er ETT `<img>`, animert er
 * inline SVG med ~et dusin noder. Med en default ville valget vært noe man
 * arver uten å tenke — og en liste med 200 rader ville en dag fått animasjon
 * fordi ingen skrev noe. Samme argument som `requireSession(db)` fører for sitt
 * påkrevde db-argument: gjør du det valgfritt, hopper kallstedet som glemmer
 * det stille over avgjørelsen.
 *
 * Nå nekter TypeScript å kompilere til noen har tatt stilling.
 *
 * ── Hvorfor plata er VÅR, ikke blobatars ──────────────────────────────────
 * `background` er av i denne stilen, og det er riktig for oss: rammen rundt
 * kommer fra token-laget (`bg-surface-2`, `rounded-control`). Da eier
 * designsystemet lys/mørk, ikke biblioteket.
 *
 * ⚠️ Denne komponenten er eneste sted `@blobatar/react` importeres i hele
 * repoet. Samme regel som for recharts og lucide.
 */

/** Silhuettene, i blobatars egen rekkefølge. Se `AVATAR_FORMER` server-side. */
const FORM_BAND: Record<string, number> = {
  /**
   * Midtpunktet i hver forms band fra `blobatar/src/styles/blob.ts`:
   * round [0, .22) · organic [.22, .48) · boxy [.48, .6) · capsule [.6, .7) ·
   * nub [.7, .79) · cloud [.79, .86) · droplet [.86, .915) · hexagon [.915, .95) ·
   * sun [.95, .98) · triangle [.98, 1)
   *
   * ⚠️ Midtpunkt og ikke kanten: en verdi rett på en bandgrense er ett
   * flyttallstrinn fra å tippe over i nabo­formen. Låst av
   * `packages/ui/test/avatar-band.test.ts`, som spør biblioteket selv.
   */
  round: 0.11,
  organic: 0.35,
  boxy: 0.54,
  capsule: 0.65,
  nub: 0.745,
  cloud: 0.825,
  droplet: 0.887,
  hexagon: 0.932,
  sun: 0.965,
  triangle: 0.99,
};

/**
 * Midtpunktet i hver av blobatars seks forfattede svatsjer (`TONES` i
 * `color.ts`), som er kumulative: [.2, .36, .62, .8, .93, 1].
 *
 * Pastell · blek nøytral · mid · dyp · lys · blekk.
 */
const TONE_BAND = [0.1, 0.28, 0.49, 0.71, 0.865, 0.965];

/**
 * Hvor mye avataren får lov å røre på seg.
 *
 * | Verdi | Rendring | Når |
 * |---|---|---|
 * | `stille` | ett `<img>` | **Lister.** Ingen bevegelse, laveste kostnad |
 * | `hover` | inline SVG | **Én om gangen.** Står helt i ro til du peker på den |
 * | `alltid` | inline SVG | **Én avatar på skjermen** som er selve poenget |
 *
 * ⚠️ `hover` er ikke en halvveis `alltid` — det er bibliotekets eget standpunkt,
 * og et godt et: «ambient motion seen constantly is motion worth removing».
 * Amplituden er 0 til `:hover`, så en tråd med tretti meldinger er helt rolig
 * til du faktisk peker på et ansikt.
 *
 * ⛔ `alltid` er dokumentert som unntaket for «a profile header» — én avatar,
 * der bevegelsen ER innholdet. Bruk den ikke på noe som kan opptre i flertall.
 *
 * Begge de animerte krever `blobatar/motion.css`, som importeres i
 * `apps/web/app/globals.css`. Uten den er det ingen feilmelding — bare et
 * ansikt som står stille. Se UI-PAKKER §10.
 *
 * Gratis fra biblioteket, og verdt å vite: `prefers-reduced-motion: reduce`
 * slår av all animasjon, og på enheter uten ekte hover pauses `hover`-modus
 * helt. Vi trenger ikke håndtere noen av delene selv.
 */
export type AvatarBevegelse = 'stille' | 'hover' | 'alltid';

/**
 * Humør → blobatars `Expression`-verdi.
 *
 * ⛔ Uttrykkene importeres som VERDIER, ikke slås opp på navn. Det er
 * bibliotekets eget design: «a consumer who imports `happy` ships `happy` and
 * one who imports nothing ships nothing». Vi importerer de ti vi tilbyr, og
 * betaler ikke for de fire vi har valgt bort.
 *
 * ⚠️ Uttrykket rendres OGSÅ statisk. Bare selve overgangen mellom to humør
 * krever `animate` — så et valgt humør synes i lister uten at vi slår på
 * bevegelse der.
 */
const HUMOR = { idle, happy, wink, smug, sleepy, thinking, surprised, unsure, love, shy } as const;

export type AvatarValg = {
  form?: string | null;
  /** Nøkkel i `HUMOR`. Ukjent verdi faller til nøytralt, ikke til en tom SVG. */
  humor?: string | null;
  /** Grader, 0–359. */
  farge?: number | null;
  /** Indeks 0–5. */
  tone?: number | null;
};

export type AvatarProps = {
  /** ⛔ Stabil ID — ikke navnet. */
  seed: string;
  /** ⛔ Påkrevd. Se `AvatarBevegelse`. */
  bevegelse: AvatarBevegelse;
  /** Vises som `title`/`alt`. Tom streng = dekorativ. */
  navn?: string;
  /** Piksler. Slotten er kvadratisk. */
  size?: number;
  /** Brukerens egne valg. Utelatte felt kommer fra seeden. */
  valg?: AvatarValg | null;
  className?: string;
};

export function Avatar({ seed, bevegelse, navn, size = 28, valg, className }: AvatarProps) {
  const form = valg?.form ? FORM_BAND[valg.form] : undefined;
  const tone = typeof valg?.tone === 'number' ? TONE_BAND[valg.tone] : undefined;

  /**
   * Delt mellom de to grenene. `hue` er grader og vinner over `traits.hue`;
   * `tone` er en 0–1-posisjon i svatsjsettet.
   *
   * ⚠️ `normalize` av: biblioteket trimmer og lowercaser navnet sitt som
   * standard, hvilket er riktig når seeden ER et navn. Vår seed er en UUID vi
   * allerede eier — normalisering ville bare vært en operasjon som en dag
   * endrer seg og flytter alle ansikter.
   */
  const felles = {
    name: seed,
    size,
    /**
     * Null/ukjent humor er `idle` (nøytralt), aldri bibliotekets happy-pose.
     * Idle er byte-identisk med å utelate expression — men vi sender den
     * eksplisitt så et tomt valg ikke kan leses som «alltid blid».
     */
    expression: HUMOR[(valg?.humor as keyof typeof HUMOR) || 'idle'] ?? idle,
    hue: typeof valg?.farge === 'number' ? valg.farge : undefined,
    tone,
    traits: form === undefined ? undefined : { shape: form },
    normalize: false,
    title: navn || undefined,
  } as const;

  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-control bg-surface-2',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/**
       * ⚠️ To grener, ikke én med `animate={...}`. Propsene er en UNION i
       * pakken: statisk er `<img>` og tar `alt`, animert er `<svg>` og gjør
       * ikke. Typen skiller dem med vilje — «`onLoad` should stop type-checking
       * the moment you turn animation on, because it stops firing».
       */}
      {bevegelse === 'stille' ? (
        <Blobatar {...felles} alt={navn ?? ''} />
      ) : (
        <Blobatar {...felles} animate={bevegelse === 'alltid' ? 'always' : 'hover'} />
      )}
    </span>
  );
}
