/**
 * Endwise-logoen som PNG, base64, for e-post. **Generert fil — ikke rediger.**
 *
 * Lages av `scripts/lag-logo-png.js` fra `apps/web/public/logo/logo.svg`.
 * 64×80 px (2× av visningsstørrelsen 32×40), hvit, gjennomsiktig bakgrunn.
 *
 * ── ⚠️ Hvorfor base64 HER og ikke i `<img src="data:…">` ─────────────────
 * De to er ikke det samme. Gmail og Outlook **fjerner** `data:`-URI-er i
 * `src`, så en «inline base64-logo» i markupen vises ikke hos de fleste
 * mottakere. Denne strengen er derimot innholdet i et VEDLEGG, som sendes med
 * `contentId` og refereres som `cid:` i HTML-en — det er den varianten
 * e-postklienter faktisk støtter.
 *
 * ── Hvorfor ikke en URL ──────────────────────────────────────────────────
 * En hostet PNG er det vanlige valget, men den krever et offentlig domene å
 * ligge på. `BETTER_AUTH_URL` er `http://localhost:3000` fram til F13 er
 * gjort, og en logo som peker på localhost vises hos nøyaktig én mottaker:
 * den som sendte den.
 *
 * ⚠️ Størrelsen er 1.0 kB base64. Holdes den under ~10 kB, er den
 * billigere enn den ekstra rundturen en hostet URL koster mottakeren.
 */
export const LOGO_EPOST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABQCAMAAACeYYN3AAABBVBMVEVMaXH///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////9TigTeAAAAVnRSTlMAqkE/HvM+u8xAHEVC9l/0QzwaL17yDxtqRxgHBPw9GfV4cEZgO2QV0flLMAG5OuzAZuOuoYHgxxdhEumT4Q1rkp7iqTYyxQIzMVQFs78r+Kb3aGdpw+0LDuoAAAAJcEhZcwAACxMAAAsTAQCanBgAAAFdSURBVHja7ddpTwIxEAbgyrpdccEVERTFE7zv+xbv+z76/3+KUYEp0NidmRgT0/djs302YWemRQgXF5d/n0G5snHc9pm1QE823va59bQyJxnr7ftDSjGAw3ulOMDlneIBk4oHFFeZwKxiAkdcYJkLbOqP56YvggBXiUWthvZubvE9kIf9M1lKE00BcErqwh4AxkhAJwDjXKD/z4EKCegD4KTDkEUEYEwJ8RmNCblAtw0YsQAJLmBt5wEL4P06kE8zfwMR/iyk7LWYiODxpa2miRZcx6jmYb+6/aAwTzvaJ76Fxwfy5SDzJTwxrhepUfJIq0ZG1JGmfc033iUpfH5hXrNKZdK2bZher++GkXZuA9qhDHtl1FrKEgMI6eO7sQEwCEkE0FWrKFQ7NwHQWVRAZHK4edACCC9CjXUNKDf0ZlxAO1x3amuejziZdmF6FeqLZwv1xSv3V8rFxcWcD0POPGgpVQ5VAAAAAElFTkSuQmCC';

/** Filnavn og content-id vedlegget sendes med. `cid:`-referansen må matche. */
export const LOGO_EPOST_CID = 'endwise-logo';
export const LOGO_EPOST_FILNAVN = 'endwise.png';
