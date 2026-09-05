/**
 * AI SDK `streamText` defaulter til maxRetries: 2 (= 3 HTTP-forsøk per steg).
 * 429 / Mistral kode 1300 er org-kvote (RPS, TPM eller månedstak). Å prøve
 * igjen med en gang holder oss over grensen og kan gjøre 429 «vedvarende».
 * 0 = feil raskt. Retry-After > 60s respekteres uansett ikke av SDK-en.
 */
export const MODELL_MAX_RETRIES = 0;
