import type { ModelMessage } from 'ai';

/**
 * Pseudonymisering før prompt.
 * Modellen trenger å vite at det finnes en kunde, ikke hvem det er. «Ola
 * Nordmann på 99887766» og «KUNDE_1 på TLF_1» gir nøyaktig samme svar på
 * «når kan dere ta mc-en?».
 * Hva den er, og hva den ikke er
 * Etter at support-agenten ble flyttet til Mistral (EU), er dette ikke lenger
 * en brannvegg mot tredjelandsoverføring — den kampen er vunnet med
 * arkitektur. Det den er nå, er **dataminimering** (art. 5(1)(c)): leverandøren
 * får ikke opplysninger den ikke trenger for å gjøre jobben. Det gjelder både
 * Mistral og — særlig — Fireworks-agentene.
 * Dette gjør ikke dataene anonyme. Vi holder kartet, altså kan vi
 * re-identifisere, altså er de fortsatt personopplysninger og GDPR gjelder.
 * Den som påstår noe annet, har misforstått art. 4(5).
 * Kartet lever i minnet, kun for varigheten av én agent-kjøring. Det skrives
 * aldri til disk — et pseudonymiseringskart på disk er en gjenidentifiserings-
 * nøkkel med et pent navn.
 */
const PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'EPOST', regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  // Norske telefonnummer: 8 siffer, evt. med +47 og mellomrom.
  { label: 'TLF', regex: /(?:\+47[\s]?)?\b\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}\b/g },
  // Norsk registreringsnummer: to bokstaver + fem siffer.
  { label: 'REGNR', regex: /\b[A-Z]{2}\s?\d{5}\b/g },
];

export interface Pseudonymizer {
  /** Erstatter identifikatorer med stabile plassholdere. Samme verdi → samme plassholder. */
  mask(text: string): string;
  /** Setter de ekte verdiene tilbake i AI-svaret, før mennesket ser det. */
  unmask(text: string): string;
  /** Antall unike verdier maskert. Til logging — verdiene selv logges aldri. */
  readonly size: number;
}

export function createPseudonymizer(): Pseudonymizer {
  const toPlaceholder = new Map<string, string>();
  const toOriginal = new Map<string, string>();
  const counters = new Map<string, number>();

  function placeholderFor(label: string, value: string): string {
    const existing = toPlaceholder.get(value);
    if (existing) return existing;

    const next = (counters.get(label) ?? 0) + 1;
    counters.set(label, next);
    const placeholder = `[${label}_${next}]`;

    toPlaceholder.set(value, placeholder);
    toOriginal.set(placeholder, value);
    return placeholder;
  }

  return {
    mask(text: string) {
      let masked = text;
      for (const { label, regex } of PATTERNS) {
        masked = masked.replace(new RegExp(regex.source, regex.flags), (match) =>
          placeholderFor(label, match),
        );
      }
      return masked;
    },

    unmask(text: string) {
      let restored = text;
      for (const [placeholder, original] of toOriginal) {
        restored = restored.split(placeholder).join(original);
      }
      return restored;
    },

    get size() {
      return toOriginal.size;
    },
  };
}

/** Maskerer alle brukermeldinger før de sendes. Systemmeldinger røres ikke. */
export function maskMessages(
  messages: ModelMessage[],
  pseudonymizer: Pseudonymizer,
): ModelMessage[] {
  return messages.map((message) => {
    if (message.role !== 'user' || typeof message.content !== 'string') return message;
    return { ...message, content: pseudonymizer.mask(message.content) } as ModelMessage;
  });
}
