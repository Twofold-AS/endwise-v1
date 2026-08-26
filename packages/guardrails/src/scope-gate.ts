import { type GuardContext, GuardrailViolation } from './types.ts';

/**
 * Scope-gate: art. 9-vakten. **Pre-flight, ikke etterkontroll.**
 * Kjøres før meldingen når hoved-modellen. Finner den særlige kategorier
 * (helse, fødselsnummer, straffbare forhold …), stopper vi og eskalerer til et
 * menneske (F6-05) i stedet for å sende dem videre.
 * Hvorfor mistral moderations, og ikke regex
 * Vi hadde allerede regex-baserte mønstre i L1/L4. De er billige og fanger det
 * åpenbare (fødselsnummer, API-nøkler). De fanger ikke dette:
 * «Jeg har ryggprolaps og klarer ikke løfte sykkelen opp på rampa»
 * Det er en helseopplysning etter art. 9. Ingen regex tar den uten å også ta
 * hundre uskyldige setninger.
 * Mistrals moderasjonsmodell (`mistral-moderation-2603`) klassifiserer tekst i
 * ni kategorier — og tre av dem er nøyaktig det vi trenger: **health**, **pii**
 * og **law**. Den er trent på flere språk, inkludert norsk-nære.
 * Og — dette er poenget som avgjorde valget — **den kjører i EU**. En scope-gate
 * som selv måtte sende kundens fritekst til usa for å avgjøre om den kunne
 * sendes til usa, ville vært en sirkel vi ikke kom ut av.
 * Hva vi ikke lover
 * Ingen klassifikator er perfekt. Denne fanger mer enn regex, ikke alt. Derfor
 * er den ett av tre tiltak, ikke det eneste:
 * 1. denne gaten
 * 2. transparens i UI («ikke del helseopplysninger her»)
 * 3. kort retensjon + EU-provider, slik at det som slipper gjennom uansett
 * ikke forlater EU og ikke blir liggende
 */
export type ModerationCategory =
  | 'sexual'
  | 'hate_and_discrimination'
  | 'violence_and_threats'
  | 'dangerous_and_criminal_content'
  | 'selfharm'
  | 'health'
  | 'financial'
  | 'law'
  | 'pii';

/** Kategoriene som utløser eskalering. Disse er art. 9 / særlige kategorier. */
export const SENSITIVE_CATEGORIES: readonly ModerationCategory[] = [
  'health',
  'pii',
  'law',
  'selfharm',
];

export interface ModerationResult {
  categories: Partial<Record<ModerationCategory, boolean>>;
  categoryScores?: Partial<Record<ModerationCategory, number>>;
}

/** Klassifikatoren. Injiseres — guardrails skal ikke kjenne HTTP. */
export type Moderator = (text: string) => Promise<ModerationResult>;

export interface ScopeGateResult {
  allowed: boolean;
  /** Kategoriene som slo ut. Tom hvis alt er greit. */
  triggered: ModerationCategory[];
}

export class ScopeGateViolation extends GuardrailViolation {
  // Eksplisitt felt + tilordning (ikke TS «parameter property»): Node kjører
  // .ts i strip-only-modus (--experimental-strip-types) og støtter ikke
  // parameter properties, som krever kodegenerering. tsc fanget det ikke.
  readonly categories: ModerationCategory[];
  constructor(categories: ModerationCategory[]) {
    super(
      'L1',
      `Meldingen inneholder særlige kategorier (${categories.join(', ')}) og ` +
        'skal ikke sendes til modellen. Eskaler til et menneske.',
    );
    this.categories = categories;
  }
}

export function createScopeGate(options: {
  moderate: Moderator;
  /** Terskel for å reagere. Under denne regnes utslaget som støy. */
  threshold?: number;
  /**
   * Hva gjør vi ved treff?
   * 'escalate' (default): stopp og send til menneske
   * 'audit': slipp gjennom, men logg. Brukes til å måle falske positive
   * Før vi setter den i blokkerende modus
   */
  mode?: 'escalate' | 'audit';
  onTrigger?: (result: ScopeGateResult, context: GuardContext) => void;
}) {
  const threshold = options.threshold ?? 0.5;
  const mode = options.mode ?? 'escalate';

  return {
    async check(text: string, context: GuardContext): Promise<ScopeGateResult> {
      const result = await options.moderate(text);

      const triggered = SENSITIVE_CATEGORIES.filter((category) => {
        const score = result.categoryScores?.[category];
        if (score !== undefined) return score >= threshold;
        return result.categories[category] === true;
      });

      const outcome: ScopeGateResult = { allowed: triggered.length === 0, triggered };
      if (triggered.length > 0) options.onTrigger?.(outcome, context);
      return outcome;
    },

    /** Kaster hvis meldingen ikke skal videre. I 'audit'-modus kaster den aldri. */
    async assert(text: string, context: GuardContext): Promise<void> {
      const result = await this.check(text, context);
      if (!result.allowed && mode === 'escalate') {
        throw new ScopeGateViolation(result.triggered);
      }
    },
  };
}

export type ScopeGate = ReturnType<typeof createScopeGate>;
