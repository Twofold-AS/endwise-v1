'use client';

import { BloubBot } from '../bloub/BloubBot.tsx';
import { useBloubIdleLiv } from '../hooks/use-bloub-idle-liv.ts';
import { useBloubPapir } from '../hooks/use-bloub-papir.ts';
import { hexForFarge, losFarge } from '../lib/bloub-farge.ts';
import { cn } from '../lib/utils.ts';

/**
 * Avatar. Cercle + store øyne. Farge er eneste forskjell mellom folk.
 * `seed` er radens ID — aldri navnet. `valg.farge` er en bloub ColorId
 * (encre, brun, rouge, …). Hue-grader leftover mappes. Form/humør/tone
 * ignoreres. Animasjon er dyr: `stille` er én ramme uten rAF.
 */

export type AvatarBevegelse = 'stille' | 'hover' | 'alltid';

export type AvatarValg = {
  form?: string | null;
  humor?: string | null;
  /** Bloub ColorId. Tall (0–359) er leftover hue og mappes. */
  farge?: string | number | null;
  tone?: number | null;
};

export type AvatarProps = {
  seed: string;
  bevegelse: AvatarBevegelse;
  navn?: string;
  size?: number;
  valg?: AvatarValg | null;
  className?: string;
};

/** Profil-header. Ikke sidebar (22px) og ikke rader. */
export function skalFølgePeker(bevegelse: AvatarBevegelse, size: number): boolean {
  return bevegelse === 'alltid' && size >= 48;
}

export function Avatar({ seed, bevegelse, navn, size = 28, valg, className }: AvatarProps) {
  const papir = useBloubPapir();
  const stor = skalFølgePeker(bevegelse, size);
  const still = !stor;
  const idle = useBloubIdleLiv(stor);
  const farge = losFarge(valg?.farge, seed);
  const hex = hexForFarge(farge, seed);

  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center overflow-hidden', className)}
      style={{ width: size, height: size }}
      title={navn || undefined}
    >
      <BloubBot
        size={size}
        shape="cercle"
        color={hex}
        paper={papir}
        expression={idle}
        state="idle"
        still={still}
        follow={stor}
        playing={false}
      />
    </span>
  );
}

export {
  BLOUB_FARGE_IDER,
  BLOUB_FARGE_LABEL,
  COLORS,
  type ColorId,
  hexForFarge,
  losFarge,
  staffFargeStil,
} from '../lib/bloub-farge.ts';
export { BLOUB_HVILE } from '../lib/bloub-hvile.ts';
