import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils.ts';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  [ART50-UI]  AI Act art. 50 — TRANSPARENSPLIKT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **DENNE KOMPONENTEN ER JURIDISK PÅKREVD, IKKE VALGFRI.**
 *
 * Regulation (EU) 2024/1689 art. 50(1): et AI-system som samhandler direkte med
 * fysiske personer skal utformes slik at personen **informeres om at de snakker
 * med en AI** — senest ved første interaksjon. For en chat betyr det: **før
 * eller helt i begynnelsen av samtalen.** Ikke i vilkårene. Ikke i en fotnote.
 *
 * **Gjelder fra 2. august 2026.** Bot inntil 15 mill. EUR / 3 % av global omsetning.
 *
 * ── STATUS: FUNKSJONELL, IKKE PEN ──────────────────────────────────────────
 *
 * Designet er bevisst minimalt. Den juridiske gyldigheten avhenger ikke av
 * hvor pen den er — den avhenger av at informasjonen er der, tydelig, før
 * samtalen starter.
 *
 * **Søk etter `[ART50-UI]` i repoet** for alle stedene dette skal pusses når
 * tokens/prototypen er inne. Se roadmap **F14-04** (implementasjon) og
 * **F4-15** (design-pass).
 *
 * ⚠️ Når du pusser: **du kan endre HVORDAN den ser ut. Du kan ikke fjerne AT den
 * er der, og du kan ikke flytte den bort fra samtalestart.** Det er ikke design,
 * det er lovtekst.
 */

/** Teksten. Ligger her, ikke i komponenten, fordi API-et også må kunne sende den. */
export const AI_DISCLOSURE_TEXT = {
  no: 'Du snakker med en digital assistent (AI). Den kan ta feil, og du kan når som helst be om å få snakke med et menneske.',
  en: 'You are chatting with an AI assistant. It can make mistakes, and you can ask to speak with a human at any time.',
} as const;

export const AI_HANDOVER_TEXT = {
  no: 'Assistenten har hentet en kollega. Du snakker nå med et menneske.',
  en: 'The assistant has brought in a colleague. You are now talking to a human.',
} as const;

export type DisclosureLocale = keyof typeof AI_DISCLOSURE_TEXT;

export interface AiDisclosureProps extends HTMLAttributes<HTMLDivElement> {
  locale?: DisclosureLocale;
}

/**
 * [ART50-UI] Vises ØVERST i chatten, før første melding. Ikke bak et ikon,
 * ikke i en tooltip, ikke i en «les mer».
 */
export function AiDisclosure({ locale = 'no', className, ...props }: AiDisclosureProps) {
  return (
    <div
      // Rollen gjør at skjermlesere leser den opp — art. 50 gjelder også for
      // brukere som ikke ser skjermen.
      role="note"
      aria-live="polite"
      data-art50="disclosure"
      className={cn(
        'flex items-start gap-2 border border-border bg-surface px-3 py-2 text-sm text-fg-muted',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">🤖</span>
      <span>{AI_DISCLOSURE_TEXT[locale]}</span>
    </div>
  );
}

/**
 * [ART50-UI] Vises i tråden når agenten eskalerer til et menneske (F6-05).
 *
 * Art. 50 handler om at brukeren skal VITE hva den snakker med. Da må hun også
 * få vite når det skifter — ellers tror hun fortsatt hun snakker med maskinen.
 */
export function HumanHandoverNotice({ locale = 'no', className, ...props }: AiDisclosureProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-art50="handover"
      className={cn(
        'flex items-start gap-2 border border-border bg-surface px-3 py-2 text-sm text-fg',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">👤</span>
      <span>{AI_HANDOVER_TEXT[locale]}</span>
    </div>
  );
}
