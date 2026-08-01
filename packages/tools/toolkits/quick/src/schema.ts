import { z } from 'zod';

/**
 * F8-01 — Quick3 Web API (v2, BETA).
 *
 * ⚠️ USIKKERHET: Swaggeren (…/swagger/docs/v2) er TOKEN-GATED og returnerte tomt
 * uten en gyldig ApiV2-token. Feltene under er derfor modellert mot det som er
 * BEKREFTET i oppgavespesifikasjonen — ikke mot en fullstendig API-kontrakt.
 * ALT er `.loose()` slik at ukjente/uventede felt PASSERER i stedet for å velte
 * synken. Felt merket «USIKKER» er gjettede navn og må verifiseres mot en ekte
 * respons (helst mot Test_Public) før vi stoler på dem.
 *
 * Bekreftede endepunkt:
 *   GET /api/v2/customer/batch  (limit, offset, changedAfterDate, customerTypeGuid, expansions)
 *   GET /api/v2/client/info
 * Kjente, ikke kartlagte: /client/bankaccounts, /client/feesettings,
 *   /common/language|country|paymentterm.
 * IKKE kartlagt ennå (venter på token): booking, delelager, salg.
 */

/**
 * En kontaktperson på en Quick-kunde. Kun `contactPersons: [...]` er bekreftet å
 * finnes; de indre feltnavnene er USIKRE (flere vanlige varianter forsøkes ved
 * mapping). `.loose()` bevarer alt vi ikke kjenner.
 */
export const quickContactPerson = z
  .object({
    guid: z.string().optional(),
    // USIKKER — navn kan komme som ett felt eller delt fornavn/etternavn.
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    // USIKKER — e-post/telefon-feltnavn ikke bekreftet.
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
  })
  .loose();

/**
 * En kunde slik den kommer fra `customer/batch`. BEKREFTET: `guid`, `company`,
 * `contactPersons`. Resten er USIKKER og bevares via `.loose()`.
 */
export const quickCustomer = z
  .object({
    /** BEKREFTET — entitetens GUID. Bærer identiteten mellom synk-kjøringer. */
    guid: z.string(),
    /** BEKREFTET — firmanavn (kan være tomt for privatkunder). */
    company: z.string().optional(),
    /** BEKREFTET — liste med kontaktpersoner. */
    contactPersons: z.array(quickContactPerson).optional(),
    // USIKRE toppnivåfelt — vanlige i kunderegistre; verifiseres mot ekte respons.
    email: z.string().optional(),
    phone: z.string().optional(),
    customerTypeGuid: z.string().optional(),
  })
  .loose();

export type QuickCustomer = z.infer<typeof quickCustomer>;

/** BEKREFTET responsform for de paginerte batch-endepunktene. */
export const quickCustomerBatch = z
  .object({
    totalCount: z.number(),
    limit: z.number(),
    offset: z.number(),
    results: z.array(quickCustomer),
  })
  .loose();

export type QuickCustomerBatch = z.infer<typeof quickCustomerBatch>;

/**
 * `client/info` — brukes som «test tilkobling». Innholdet er ikke fullt kjent,
 * så vi validerer bare at det ER et objekt (.loose()); selve 200-svaret er
 * beviset på at token + baseUrl virker.
 */
export const quickClientInfo = z.object({}).loose();
export type QuickClientInfo = z.infer<typeof quickClientInfo>;

/** Det flate resultatet resten av Endwise forholder seg til (mappet fra QuickCustomer). */
export interface QuickCustomerRecord {
  /** Quick-GUID → customers.quickGuid (externalRef). */
  quickGuid: string;
  name: string;
  email: string | null;
  phone: string | null;
}
