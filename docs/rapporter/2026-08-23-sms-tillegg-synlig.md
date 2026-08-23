# Øktrapport — F5-26 / F5-32: SMS-tillegg synlig i admin

## 1. Hva er gjort

**F5-26 / F5-32** (SMS som avkrysnings-tillegg)

- `tilleggForNivaa` i `apps/web/app/(app)/endwise/_pakke-valg.tsx` filtrerer bare `shop`. `twilio` vises i Ny forhandler og Endre pakke når det er i katalogen og ikke i `TIERS.modules`.
- Kommentar oppdatert: SMS er et avkrysnings-tillegg, ikke en planmodul, 0 kr/mnd.
- Teser som krevde at SMS ble skjult, er snudd. Shop forblir skjult.
- `TIERS.modules` er urørt (ingen `twilio`). Prisene 4 490 / 8 490 / 12 490 urørt. Ingen månedspris på SMS.
- Server `tenants.create` / `tenants.setModules` via `erGyldigEkstraTillegg` godtar allerede `twilio` som ekstra tillegg på alle nivåer — ikke rørt.

## 2. Hva gikk galt

UI/UX P0 (4d9ad34) skjulte SMS-avkrysningen mot Jens Martins produktregel. GDPR-slett og helpdesk er urørt (ingen rebase). Alt annet gikk som planlagt.

## 3. Hvilke fikser ble gjort

- Filter: `t.module !== 'shop' && !inkludert.has(t.module)` — ikke `twilio`.
- `TILLEGG`-teksten for SMS sto allerede riktig («Pass-through per bookingmelding. Ingen månedsavgift.»).
- Roadmap F5-26/F5-32 og `docs/UI-PAKKER.md` oppdatert slik at avkrysningen ikke lenger beskrives som skjult.

## 4. Neste fase / neste steg

- F5-32 forblir `progress` (metered overforbruk, past_due-jobb, provision-hooks).
- Ikke merge uten gjennomgang.
