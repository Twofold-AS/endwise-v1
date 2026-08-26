/**
 * F14 — Dataregion. Dette er en sikkerhetstype, ikke en etikett.
 * Rutingregelen, i klartekst:
 * Agenter som kan motta sluttkundens fritekst **må** kjøre på en EU-provider.
 * Agenter som kun ser tenant-skopede driftsdata kan kjøre hvor som helst.
 * Grunnen til at dette er en type og ikke en kommentar: en feilkonfigurasjon her
 * er ikke en bug — det er et personvernbrudd. Å sende en norsk kundes fritekst
 * (som kan inneholde helseopplysninger, jf. art. 9) til en amerikansk
 * inferens-tjeneste fordi noen skrev feil streng i en config, skal ikke være
 * mulig å kompilere.
 */
export type DataRegion = 'eu' | 'global';

/**
 * Hva slags data en agent kan se. Bestemmer hvilken region den MÅ kjøre i.
 * `customer_freetext` = sluttkundens egne ord. Vi kontrollerer ikke hva som står
 * der, og kan derfor ikke garantere at det er fritt for særlige kategorier.
 */
export type DataClass = 'tenant_operational' | 'customer_freetext';

/** Regionen en datklasse krever. Ingen skjønn, ingen overstyring. */
export const REQUIRED_REGION: Record<DataClass, DataRegion> = {
  // Bookinger, tjenester, mekanikere — vår egen strukturerte drift.
  tenant_operational: 'global',
  // Kundens egne ord. EU. Punktum.
  customer_freetext: 'eu',
};

export class DataRegionViolation extends Error {
  readonly code = 'DATA_REGION_VIOLATION';
  constructor(agent: string, dataClass: DataClass, provider: string, region: DataRegion) {
    super(
      `Agenten «${agent}» behandler ${dataClass} og MÅ kjøre i region ` +
        `«${REQUIRED_REGION[dataClass]}», men leverandøren «${provider}» kjører i «${region}». ` +
        'Dette er et personvernbrudd, ikke en feilkonfigurasjon.',
    );
  }
}

/** Kan en provider i denne regionen betjene denne dataklassen? */
export function regionSatisfies(region: DataRegion, dataClass: DataClass): boolean {
  const required = REQUIRED_REGION[dataClass];
  // 'eu' tilfredsstiller både 'eu' og 'global'. 'global' tilfredsstiller kun 'global'.
  return required === 'global' || region === 'eu';
}
