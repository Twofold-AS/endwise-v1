import { z } from 'zod';

/**
 * F2-08 — Autosys «Enkeltoppslag».
 *
 * Skjemaet under er en BEVISST DELMENGDE av API-ets respons. Den fulle
 * `EnkeltOppslagKjoretoydata` har hundrevis av felter (ADR-tankdata,
 * WLTP-koeffisienter, akselgrupper …). Vi speiler kun det verkstedet trenger.
 * `.loose()` gjør at ukjente felter passerer i stedet for å velte oppslaget når
 * Vegvesenet utvider API-et.
 *
 * Kilde: https://akfell-datautlevering.atlas.vegvesen.no/v3/api-docs (OpenAPI 3.1)
 */
const merke = z.object({ merke: z.string().optional() }).loose();

const generelt = z
  .object({
    merke: z.array(merke).optional(),
    handelsbetegnelse: z.array(z.string()).optional(),
  })
  .loose();

const kjoretoydata = z
  .object({
    kjoretoyId: z
      .object({
        kjennemerke: z.string().optional(),
        understellsnummer: z.string().optional(),
      })
      .loose()
      .optional(),
    forstegangsregistrering: z
      .object({ registrertForstegangNorgeDato: z.string().optional() })
      .loose()
      .optional(),
    godkjenning: z
      .object({
        tekniskGodkjenning: z
          .object({
            tekniskeData: z.object({ generelt: generelt.optional() }).loose().optional(),
          })
          .loose()
          .optional(),
      })
      .loose()
      .optional(),
    /** EU-kontroll. `kontrollfrist` er selve grunnen til at vi gjør dette oppslaget. */
    periodiskKjoretoyKontroll: z
      .object({
        kontrollfrist: z.string().optional(),
        sistGodkjent: z.string().optional(),
      })
      .loose()
      .optional(),
  })
  .loose();

export const kjoretoydataResponse = z
  .object({
    feilmelding: z.string().optional(),
    kjoretoydataListe: z.array(kjoretoydata).optional(),
  })
  .loose();

export type KjoretoydataResponse = z.infer<typeof kjoretoydataResponse>;

/** Det flate resultatet resten av Endwise forholder seg til. */
export interface VehicleLookup {
  regNumber: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  /** Årsmodell utledes av første registrering i Norge — API-et har ingen egen «årsmodell». */
  modelYear: string | null;
  /** Neste EU-frist (ISO-dato). */
  inspectionDue: string | null;
  lastInspection: string | null;
}
