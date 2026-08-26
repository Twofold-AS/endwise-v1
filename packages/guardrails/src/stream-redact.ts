import { SECRET_PATTERNS } from './pipeline.ts';
import { type GuardContext, GuardrailViolation } from './types.ts';

/**
 * F6-14 L4, strømmende variant.
 * Problemet dette løser
 * `filterOutput` kjører regexene på hele svaret. Det virker når svaret
 * kommer i ett stykke. I en chat gjør det ikke det: modellen sender tokens, og
 * et fødselsnummer kan komme som `«120345»` + `«67890»`. Kjører man regexen på
 * hver bit for seg, treffer den ingen av dem — og begge er allerede sendt til
 * nettleseren når hele teksten omsider finnes.
 * Å strømme rått og filtrere til slutt er ikke å filtrere. Teksten er ute.
 * Hvordan den løser det
 * Vi akkumulerer hele teksten og kjører regexene på den hver gang, men sender
 * bare ut den delen som ikke lenger kan endre seg: alt unntatt de siste
 * `holdback` tegnene. Et treff som ligger helt inne i den trygge sonen kan
 * ikke vokse seg ut av den, så redaksjonen er endelig før den sendes.
 * `holdback` er normalt `HOLDBACK` tegn — lengre enn det lengste mønsteret med
 * fast lengde. Unntaket er DB-URL-mønsteret, som er ubegrenset (`[^\s]+`):
 * ser vi starten på en slik uten at den er avsluttet av mellomrom ennå, holder
 * vi tilbake helt fra der den begynte. Ellers kunne halve tilkoblingsstrengen
 * rukket ut mens vi ventet på resten.
 * Prisen er at de siste ~80 tegnene henger etter til `flush`. Det er en
 * forsinkelse på slutten av svaret, ikke en hakking underveis.
 */

/** Lengre enn lengste mønster med øvre grense (JWT-mønsteret ~ 60 tegn). */
const HOLDBACK = 80;

/** Mønstre uten øvre lengdegrense. Ser vi starten, holder vi tilbake derfra. */
const APNE_STARTER = /postgres(ql)?:\/\//gi;

export interface StreamRedactor {
  /** Tar en token-bit, returnerer den delen som er trygg å sende (kan være ''). */
  push(delta: string): string;
  /** Kalles når modellen er ferdig. Tømmer resten. */
  flush(): string;
  /** Antall treff fjernet. Til logging/audit (L5). */
  readonly antallTreff: number;
}

/**
 * Teller treff, men rapporterer dem ikke selv. Fordi vi kjører over hele den
 * akkumulerte teksten på nytt for hver token, ville et treff blitt rapportert på
 * nytt hundre ganger. Kallstedet melder bare fra når tallet øker.
 */
function redact(text: string): { tekst: string; treff: number } {
  let safe = text;
  let treff = 0;
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    safe = safe.replace(pattern, () => {
      treff += 1;
      return replacement;
    });
    pattern.lastIndex = 0;
  }
  return { tekst: safe, treff };
}

export function createStreamRedactor(
  context?: GuardContext,
  onViolation?: (v: GuardrailViolation, c: GuardContext) => void,
): StreamRedactor {
  let akkumulert = '';
  let sendtLengde = 0;
  let treff = 0;

  /** Melder fra kun når antallet treff har Økt siden forrige runde. */
  const meldFra = (nyttAntall: number) => {
    while (treff < nyttAntall) {
      treff += 1;
      if (context && onViolation) {
        onViolation(
          new GuardrailViolation('L4', 'Sensitivt mønster fjernet fra strømmet svar'),
          context,
        );
      }
    }
  };

  /** Hvor mange tegn på slutten som ikke er trygge å sende ennå. */
  function holdbackFor(text: string): number {
    let holdback = HOLDBACK;
    APNE_STARTER.lastIndex = 0;
    let match = APNE_STARTER.exec(text);
    while (match) {
      // Er den avsluttet av mellomrom, er treffet komplett og trenger ingen
      // ekstra venting. Er den det ikke, kan den fortsatt vokse.
      const rest = text.slice(match.index);
      if (!/\s/.test(rest)) holdback = Math.max(holdback, rest.length);
      match = APNE_STARTER.exec(text);
    }
    APNE_STARTER.lastIndex = 0;
    return holdback;
  }

  return {
    get antallTreff() {
      return treff;
    },

    push(delta: string) {
      akkumulert += delta;

      // Redigér alltid hele den akkumulerte teksten, ikke bare den trygge
      // biten. Kjørte vi regexen på et avkuttet stykke, ville `\b` truffet på
      // slutten av avkuttingen: elleve sifre etterfulgt av et tolvte ville blitt
      // lest som et fødselsnummer i den ene runden og ikke i den neste.
      // Grensen settes etter redigeringen, ikke før.
      const { tekst: redigert, treff: antall } = redact(akkumulert);
      meldFra(antall);
      const trygtTil = Math.max(0, redigert.length - holdbackFor(akkumulert));
      if (trygtTil <= sendtLengde) return '';

      const nytt = redigert.slice(sendtLengde, trygtTil);
      sendtLengde = trygtTil;
      return nytt;
    },

    flush() {
      const { tekst: redigert, treff: antall } = redact(akkumulert);
      meldFra(antall);
      const nytt = redigert.slice(sendtLengde);
      akkumulert = '';
      sendtLengde = 0;
      return nytt;
    },
  };
}
