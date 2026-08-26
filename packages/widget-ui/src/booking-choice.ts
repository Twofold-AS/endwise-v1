/**
 * Valgt starttid og slot-listen hører til (tjeneste, dato).
 * Byttes ett av dem, må begge tømmes. `loadSlots` er for sent: den kjører
 * bare når kunden trykker «Vis ledige tider», og da kan «Send» allerede ha
 * gått med tjeneste B + et slot regnet ut for A.
 */
export function resetBookingChoice(): { slots: string[]; chosen: string } {
  return { slots: [], chosen: '' };
}
