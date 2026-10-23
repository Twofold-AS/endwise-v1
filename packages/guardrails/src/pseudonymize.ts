import type { ModelMessage } from 'ai';

/**
 * Pseudonymisering før prompt.
 * Modellen trenger å vite at det finnes en kunde, ikke hvem det er. «Ola
 * Nordmann på 99887766» og «[NAVN_1] på [TLF_1]» gir nøyaktig samme svar på
 * «når kan dere ta mc-en?».
 * Hva den er, og hva den ikke er
 * Etter at alle agenter ble låst til Mistral EU, er dette ikke lenger
 * en brannvegg mot tredjelandsoverføring — den kampen er vunnet med
 * arkitektur. Det den er nå, er **dataminimering** (art. 5(1)(c)): leverandøren
 * får ikke opplysninger den ikke trenger for å gjøre jobben.
 * Dette gjør ikke dataene anonyme. Vi holder kartet, altså kan vi
 * re-identifisere, altså er de fortsatt personopplysninger og GDPR gjelder.
 * Den som påstår noe annet, har misforstått art. 4(5).
 * Kartet lever i minnet, kun for varigheten av én agent-kjøring. Det skrives
 * aldri til disk — et pseudonymiseringskart på disk er en gjenidentifiserings-
 * nøkkel med et pent navn.
 */

const PATTERNS: Array<{ label: string; regex: RegExp; canonical?: (v: string) => string }> = [
  // Fødselsnummer (11 siffer) FØR telefon, også med mellomrom/bindestrek.
  {
    label: 'FNR',
    regex: /\b\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{5}\b/g,
    canonical: (v) => v.replace(/\D/g, ''),
  },
  { label: 'EPOST', regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, canonical: (v) => v.toLowerCase() },
  // Norske telefonnummer: 8 siffer, evt. med +47 og mellomrom.
  { label: 'TLF', regex: /(?:\+47[\s]?)?\b\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}\b/g },
  // Norsk registreringsnummer: to bokstaver + fem siffer, også små bokstaver.
  {
    label: 'REGNR',
    regex: /\b[A-ZÆØÅ]{2}\s?\d{5}\b/gi,
    canonical: (v) => v.replace(/\s/g, '').toUpperCase(),
  },
];

export interface PseudonymizerOptions {
  /** Kjente kundenavn fra kontekst (f.eks. treff fra sokKunder). */
  knownNames?: readonly string[];
}

export interface Pseudonymizer {
  /** Erstatter identifikatorer med stabile plassholdere. Samme verdi → samme plassholder. */
  mask(text: string): string;
  /** Setter de ekte verdiene tilbake i AI-svaret, før mennesket ser det. */
  unmask(text: string): string;
  /** Antall unike verdier maskert. Til logging — verdiene selv logges aldri. */
  readonly size: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createPseudonymizer(options: PseudonymizerOptions = {}): Pseudonymizer {
  const toPlaceholder = new Map<string, string>();
  const toOriginal = new Map<string, string>();
  const counters = new Map<string, number>();
  const knownNames = [...(options.knownNames ?? [])]
    .map((name) => name.trim())
    .filter((name) => name.length >= 2)
    .sort((a, b) => b.length - a.length);

  function placeholderFor(label: string, value: string, key = value): string {
    const existing = toPlaceholder.get(key);
    if (existing) return existing;

    const next = (counters.get(label) ?? 0) + 1;
    counters.set(label, next);
    const placeholder = `[${label}_${next}]`;

    toPlaceholder.set(key, placeholder);
    toOriginal.set(placeholder, value);
    return placeholder;
  }

  return {
    mask(text) {
      let masked = text;

      for (const name of knownNames) {
        const regex = new RegExp(`(?<!\\p{L})${escapeRegExp(name)}(?!\\p{L})`, 'giu');
        masked = masked.replace(regex, (match) =>
          placeholderFor('NAVN', match, `NAVN:${name.toLowerCase()}`),
        );
      }

      for (const { label, regex, canonical } of PATTERNS) {
        masked = masked.replace(new RegExp(regex.source, regex.flags), (match) => {
          const key = canonical ? `${label}:${canonical(match)}` : match;
          return placeholderFor(label, match, key);
        });
      }
      return masked;
    },

    unmask(text) {
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

export function brukerTekstFraMelding(message: ModelMessage): string | null {
  if (message.role !== 'user') return null;
  const content = message.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  const deler: string[] = [];
  for (const part of content) {
    if (typeof part === 'string') {
      deler.push(part);
      continue;
    }
    if (part && typeof part === 'object' && 'text' in part) {
      const tekst = (part as { text: unknown }).text;
      if (typeof tekst === 'string') deler.push(tekst);
    }
  }
  return deler.length > 0 ? deler.join('\n') : null;
}

/**
 * Transformerer bare tekstdeler i en brukermelding.
 * Ikke-tekst (bilde, fil, …) beholdes urørt — de skal ikke kastes i stillhet.
 */
export function mapBrukerTekst(
  message: ModelMessage,
  transform: (tekst: string) => string,
): ModelMessage {
  if (message.role !== 'user') return message;
  if (typeof message.content === 'string') {
    return { role: 'user', content: transform(message.content) };
  }
  if (!Array.isArray(message.content)) return message;
  return {
    ...message,
    content: message.content.map((part) => {
      if (typeof part === 'string') return { type: 'text' as const, text: transform(part) };
      if (part && typeof part === 'object' && 'text' in part) {
        const tekst = (part as { text: unknown }).text;
        if (typeof tekst === 'string') {
          return { ...part, text: transform(tekst) };
        }
      }
      return part;
    }),
  };
}

/** Maskerer strenger rekursivt i JSON (verktøyresultater). */
export function maskJson(value: unknown, pseudonymizer: Pseudonymizer): unknown {
  if (typeof value === 'string') return pseudonymizer.mask(value);
  if (Array.isArray(value)) return value.map((item) => maskJson(item, pseudonymizer));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = maskJson(nested, pseudonymizer);
    }
    return out;
  }
  return value;
}

/** Maskerer alle brukermeldinger før de sendes. Systemmeldinger røres ikke. */
export function maskMessages(
  messages: ModelMessage[],
  pseudonymizer: Pseudonymizer,
): ModelMessage[] {
  return messages.map((message) => {
    const tekst = brukerTekstFraMelding(message);
    if (tekst === null) return message;
    return mapBrukerTekst(message, (del) => pseudonymizer.mask(del));
  });
}
