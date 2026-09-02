/**
 * Endwise-logoen som PNG, base64, for e-post. **Generert fil — ikke rediger.**
 *
 * Lages av `scripts/lag-logo-png.js` fra `apps/web/public/logo/logo.svg`.
 * 64×80 px (2× av visningsstørrelsen 32×40), ink #1d1d1f, gjennomsiktig bakgrunn.
 *
 * Hvorfor base64 HER og ikke i `<img src="data:…">`
 * De to er ikke det samme. Gmail og Outlook **fjerner** `data:`-URI-er i
 * `src`, så en «inline base64-logo» i markupen vises ikke hos de fleste
 * mottakere. Denne strengen er derimot innholdet i et VEDLEGG, som sendes med
 * `contentId` og refereres som `cid:` i HTML-en — det er den varianten
 * e-postklienter faktisk støtter.
 *
 * Hvorfor ikke en URL
 * En hostet PNG er det vanlige valget, men den krever et offentlig domene å
 * ligge på. `BETTER_AUTH_URL` er `http://localhost:3000` fram til F13 er
 * gjort, og en logo som peker på localhost vises hos nøyaktig én mottaker:
 * den som sendte den.
 *
 * Størrelsen er 1.0 kB base64. Holdes den under ~10 kB, er den
 * billigere enn den ekstra rundturen en hostet URL koster mottakeren.
 */
export const LOGO_EPOST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABQCAMAAACeYYN3AAABBVBMVEVMaXEbGxscHCAcHB8ZGSIdHR8cHCAcHB8cHB8bGx8bGx8dHR0eHh4dHR8dHSAdHR8dHR0eHh4dHR0bGyAdHR0AAAAdHR0dHR4eHh4dHR8cHBwkJCQfHx8iIiIcHCAcHB8dHR8dHR8dHSAdHR8dHR8cHB4dHR4cHB4dHR8hISEzMzMdHR4aGh8cHB8cHB8eHh4cHCEdHR8dHR8cHB4dHR4eHh4cHBwYGCQdHR4eHh4cHB4AAAAdHR4dHR4cHB8dHR4dHR8eHh4cHB8dHR4TEyccHB8eHh4AAAAfHx8cHB4cHB4eHh4dHR8eHh4dHR0cHB4dHR4dHR8dHR0dHR8cHB4cHB8dHR+NZH6dAAAAVnRSTlMAHD+qHvM+u8xAQUVC9l/0GkM8L14EPfIZ/BsHGA9HavV4RnBg+cDpkhcFvzChxTM244G54mYSFa4yawKe4WHH7Eup0Q2zOwEx4GRUkzor+KZpZ2j3wzeftQEAAAAJcEhZcwAACxMAAAsTAQCanBgAAAFeSURBVFjD7ddpTwIxEAbgurpdYcFVEPECFfG+71u87/vo//8pRgWmQGN3ZmJMTN+PzfbZhJ2ZFiFcXFz+fYbkxup++2e2Az3ZeNvnF9LKnESst98NKMUAzuaU4gB754oH3CgekFthAseKCUxzgUkucK0/nj9dDAJcJea0Gpq6ncX3QAH2T2QpTbQFwAmpC7sBGCMBbQCMc4GRPwd2ScAgAOudhtwjAGNKiM9oTMgFemxAvwVIcgFrOw9bAO/XgUKa+RuI8GchZa/FZASPH1WaJlpwFaOa+/zq9oPiJe1ov/gWHh/Il4PMl/DEuF6kRskjrRoZUUea9jWfeZek8O2Vec0qlUnbZmB6vbwbRtqODeiAMuyVUWspSwwgpI/vxgbAICQQQFetolDt3ARAZ1EBkcnj5kELILwINdY1oNzQm3EB7XA9rK15PuJk2oTpVawvLq/VF5fcXykXFxdzPgBEyTxot+6UxQAAAABJRU5ErkJggg==';

/** Filnavn og content-id vedlegget sendes med. `cid:`-referansen må matche. */
export const LOGO_EPOST_CID = 'endwise-logo';
export const LOGO_EPOST_FILNAVN = 'endwise.png';
