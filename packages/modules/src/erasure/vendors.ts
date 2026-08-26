/**
 * Leverandørleddet. **Her er ærligheten viktigere enn koden.**
 * En sletterutine som stopper ved vår egen database er ikke en sletterutine.
 * Men det finnes ledd vi **ikke kan slette i** — og å late som noe annet er
 * verre enn å innrømme det. Denne fila dokumenterer hva som faktisk skjer hos
 * hver leverandør når vi sletter, og hva vi ikke får til.
 * Innholdet her går rett inn i sletterapporten (`erasure_requests.report`), slik
 * at svaret til den registrerte er sant og etterprøvbart.
 */
export type VendorErasureCapability = 'nothing_stored' | 'auto_expires' | 'manual_request' | 'none';

export interface VendorErasureFact {
  vendor: string;
  capability: VendorErasureCapability;
  /** Hva som faktisk ligger der. */
  whatIsStored: string;
  /** Hva vi kan gjøre — ærlig. */
  whatWeCanDo: string;
  /** Hvor lenge før det uansett er borte. Null = ukjent/aldri. */
  maxDaysUntilGone: number | null;
  source: string;
}

export const VENDOR_ERASURE_FACTS: readonly VendorErasureFact[] = [
  {
    vendor: 'fireworks',
    capability: 'nothing_stored',
    whatIsStored:
      'Ingenting. Zero Data Retention er STANDARD for chat completions: prompt og svar finnes ' +
      'kun i flyktig minne under forespørselen. Kun metadata (antall tokens) logges.',
    whatWeCanDo:
      'Ingenting — og det er riktig svar. Det finnes ikke noe å slette. ' +
      'MERK: dette forutsetter at vi ALDRI tar i bruk deres «Response API», som lagrer i 30 dager ' +
      'med store=True som default (F14-12).',
    maxDaysUntilGone: 0,
    source: 'docs.fireworks.ai/guides/security_compliance/data_handling',
  },
  {
    vendor: 'mistral',
    capability: 'auto_expires',
    whatIsStored:
      'UTEN ZDR: input og output lagres i 30 rullerende dager for misbruksovervåking. ' +
      'MED ZDR (må søkes om — kan avslås, se F14-11): ingenting.',
    whatWeCanDo:
      '⚠️ ÆRLIG SVAR: vi har INGEN API for å slette en enkelt prompt hos Mistral. ' +
      'Vi kan ikke, på forespørsel fra én kunde, fjerne akkurat den kundens melding fra deres ' +
      '30-dagers logg. Det vi kan gjøre er: (a) få innvilget ZDR slik at det aldri lagres, ' +
      '(b) opplyse den registrerte om at data hos databehandler utløper innen 30 dager, ' +
      '(c) be Mistral om sletting via deres GDPR-kanal — men det er en manuell prosess, ikke et kall.',
    maxDaysUntilGone: 30,
    source: 'help.mistral.ai — «Can I activate Zero Data Retention (ZDR)?»',
  },
  {
    vendor: 'vercel-blob',
    capability: 'manual_request',
    whatIsStored: 'Opplastede filer (modellbilder, vedlegg).',
    whatWeCanDo: 'Full sletting via API. Dette leddet er vi herre over.',
    maxDaysUntilGone: 0,
    source: 'Vercel Blob API',
  },
  {
    vendor: 'resend',
    capability: 'auto_expires',
    whatIsStored: 'E-postlogger hos leverandør (mottaker, emne, status).',
    whatWeCanDo:
      'Vi sletter vår egen `notifications`-rad. Leverandørens egen logg følger deres ' +
      'retensjonstid — må bekreftes i DPA (F14-12/F14-09).',
    maxDaysUntilGone: null,
    source: 'DPA — må avklares',
  },
  {
    vendor: 'twilio',
    capability: 'auto_expires',
    whatIsStored: 'SMS-logger (telefonnummer, status). Innhold avhengig av konfigurasjon.',
    whatWeCanDo: 'Samme som Resend. Retensjon må bekreftes i DPA.',
    maxDaysUntilGone: null,
    source: 'DPA — må avklares',
  },
];

export function vendorFact(vendor: string): VendorErasureFact | undefined {
  return VENDOR_ERASURE_FACTS.find((v) => v.vendor === vendor);
}

/** Leddene vi ikke kan slette i på forespørsel. Går inn i svaret til den registrerte. */
export function vendorsWeCannotPurge(): VendorErasureFact[] {
  return VENDOR_ERASURE_FACTS.filter(
    (v) => v.capability === 'auto_expires' || v.capability === 'none',
  );
}
