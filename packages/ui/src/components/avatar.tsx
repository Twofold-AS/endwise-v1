'use client';

import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import { cn } from '../lib/utils.ts';

/**
 * Avatar. Deterministisk ansikt fra en stabil ID (blobatar).
 * Seeden er en ID, aldri et navn
 * `seed` skal være radens ID — `customers.id`, `mechanics.id`, `user.id`. Aldri
 * navnet. Retter noen en skrivefeil i «Kari Nordmman», skal ikke personen bytte
 * ansikt; og to kunder som begge heter «Ola Hansen» skal ikke dele det.
 * `navn` finnes her kun som tilgjengelig tekst (`title`/`alt`).
 * `bevegelse` er påkrevd, og det er hele poenget
 * Animasjon koster ulikt på ulike flater: statisk er ett `<img>`, animert er
 * inline SVG med ~et dusin noder. Med en default ville valget vært noe man
 * arver uten å tenke — og en liste med 200 rader ville en dag fått animasjon
 * fordi ingen skrev noe. Samme argument som `requireSession(db)` fører for sitt
 * påkrevde db-argument: gjør du det valgfritt, hopper kallstedet som glemmer
 * det stille over avgjørelsen.
 * Nå nekter TypeScript å kompilere til noen har tatt stilling.
 * Gaze bare på det store ansiktet
 * `useGaze` + `blobatar/gaze.css` er bibliotekets peker-lag. Det hører hjemme
 * på det ene store ansiktet som er poenget med skjermen (profil-header,
 * `bevegelse="alltid"`, minst 48px). Lister og rader (`stille`, 32px) får
 * ikke peker-sporing. Sidebaren er `alltid` men 22px — den puster, den stirrer
 * ikke.
 * Form, humør og tone fra lagrede valg ignoreres. Seeden (og ev. farge)
 * bestemmer ansiktet. Vi importerer ingen expression-positurer.
 * Denne komponenten er eneste sted `@blobatar/react` importeres i hele
 * repoet. Samme regel som for recharts og lucide.
 */

/**
 * Hvor mye avataren får lov å røre på seg.
 * Verdi | Rendring | Når
 * `stille` | ett `<img>` | **Lister.** Ingen bevegelse, laveste kostnad
 * `hover` | inline SVG | **Én om gangen.** Står helt i ro til du peker på den
 * `alltid` | inline SVG | **Én avatar på skjermen** som er selve poenget
 * `hover` er ikke en halvveis `alltid` — det er bibliotekets eget standpunkt,
 * og et godt et: «ambient motion seen constantly is motion worth removing».
 * Amplituden er 0 til `:hover`, så en tråd med tretti meldinger er helt rolig
 * til du faktisk peker på et ansikt.
 * `alltid` er dokumentert som unntaket for «a profile header» — én avatar,
 * der bevegelsen er innholdet. Bruk den ikke på noe som kan opptre i flertall.
 * Begge de animerte krever `blobatar/motion.css`, som importeres i
 * `apps/web/app/globals.css`. Gaze krever i tillegg `blobatar/gaze.css`.
 * Uten dem er det ingen feilmelding — bare et ansikt som står stille.
 * Gratis fra biblioteket, og verdt å vite: `prefers-reduced-motion: reduce`
 * slår av all animasjon, og på enheter uten ekte hover pauses `hover`-modus
 * helt. Vi trenger ikke håndtere noen av delene selv.
 */
export type AvatarBevegelse = 'stille' | 'hover' | 'alltid';

/**
 * Brukerens egne valg. Bare `farge` påvirker ansiktet.
 * `form` / `humor` / `tone` kan fortsatt ligge i `user_preferences` fra
 * tidligere velgere — de leses, men de endrer ikke ansiktet. Seeden (og ev.
 * hue) eier silhuetten.
 */
export type AvatarValg = {
  form?: string | null;
  humor?: string | null;
  /** Grader, 0–359. */
  farge?: number | null;
  tone?: number | null;
};

export type AvatarProps = {
  /** Stabil ID — ikke navnet. */
  seed: string;
  /** Påkrevd. Se `AvatarBevegelse`. */
  bevegelse: AvatarBevegelse;
  /** Vises som `title`/`alt`. Tom streng = dekorativ. */
  navn?: string;
  /** Piksler. Slotten er kvadratisk. */
  size?: number;
  /** Brukerens egne valg. Bare hue brukes. */
  valg?: AvatarValg | null;
  className?: string;
};

/** Profil-header og velger-forhåndsvisning. Ikke sidebar (22px) og ikke rader. */
export function skalFølgePeker(bevegelse: AvatarBevegelse, size: number): boolean {
  return bevegelse === 'alltid' && size >= 48;
}

export function Avatar({ seed, bevegelse, navn, size = 28, valg, className }: AvatarProps) {
  const gaze = useGaze({
    travel: 3,
    lookAt: skalFølgePeker(bevegelse, size) ? 'pointer' : null,
  });

  /**
   * Delt mellom de to grenene. `hue` er grader og vinner over seeden.
   * Form, humør og tone fra `valg` sendes bevisst ikke videre — et gammelt
   * lagret «sun»/«happy» skal ikke lenger bytte ansikt.
   * `normalize` av: biblioteket trimmer og lowercaser navnet sitt som
   * standard, hvilket er riktig når seeden er et navn. Vår seed er en UUID vi
   * allerede eier — normalisering ville bare vært en operasjon som en dag
   * endrer seg og flytter alle ansikter.
   * Expression utelates: idle er bibliotekets default, byte-identisk med å
   * sende `idle`. Ingen positur-import.
   */
  const felles = {
    name: seed,
    size,
    hue: typeof valg?.farge === 'number' ? valg.farge : undefined,
    normalize: false,
    title: navn || undefined,
  } as const;

  const medGaze = skalFølgePeker(bevegelse, size);

  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-control bg-surface-2',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/**
       * To grener, ikke én med `animate={...}`. Propsene er en union i
       * pakken: statisk er `<img>` og tar `alt`, animert er `<svg>` og gjør
       * ikke. Typen skiller dem med vilje — «`onLoad` should stop type-checking
       * the moment you turn animation on, because it stops firing».
       */}
      {bevegelse === 'stille' ? (
        <Blobatar {...felles} alt={navn ?? ''} />
      ) : (
        <Blobatar
          {...felles}
          ref={medGaze ? gaze.ref : undefined}
          animate={bevegelse === 'alltid' ? 'always' : 'hover'}
        />
      )}
    </span>
  );
}
