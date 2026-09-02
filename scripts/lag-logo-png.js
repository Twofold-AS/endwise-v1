/**
 * Engangsverktøy: SVG → PNG for e-post.
 * Kjøres for hånd når logoen endres. `sharp` brukes kun her, fra pnpm-storen
 * den legges bevisst ikke til som avhengighet noe sted (§2-endring), fordi
 * resultatet er en committet fil, ikke noe som skjer ved kjøretid.
 */
const fs = require('node:fs');
const path = require('node:path');

const { createRequire } = require('node:module');
const sharpDir = fs
  .readdirSync(path.resolve('node_modules/.pnpm'))
  .find((navn) => navn.startsWith('sharp@'));
if (!sharpDir) throw new Error('sharp ligger ikke i pnpm-storen — kjør pnpm install');
const sharp = createRequire(
  path.resolve('node_modules/.pnpm', sharpDir, 'node_modules/sharp/package.json'),
)('sharp');

const KILDE = 'apps/web/public/logo/logo.svg';
const UT_PNG = 'apps/web/public/logo/logo-epost.png';
const UT_TS = 'packages/auth/src/assets/logo-epost.ts';

// 2× av visningsstørrelsen (32×40 css-piksler) for skjermer med høy tetthet.
const BREDDE = 64;
const HOYDE = 80;

let svg = fs.readFileSync(KILDE, 'utf8');

// C2PA-metadataen er ~12 kB base64 som ikke betyr noe for en rasterisering.
svg = svg.replace(/<metadata>[\s\S]*?<\/metadata>/, '');

/**
 * Pathene i logo.svg har ingen `fill`, så de rasteriseres som svarte.
 * E-postlogoen ligger på hvit canvas (Mikael Apple-lås, se `epost-mal.ts`),
 * så den må være ink `#1d1d1f` — samme som logoen på `/signin`.
 */
svg = svg.replace(/<path /g, '<path fill="#1d1d1f" ');

(async () => {
  const png = await sharp(Buffer.from(svg))
    .resize(BREDDE, HOYDE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  fs.mkdirSync(path.dirname(UT_TS), { recursive: true });
  fs.writeFileSync(UT_PNG, png);

  const b64 = png.toString('base64');
  fs.writeFileSync(
    UT_TS,
    `/**
 * Endwise-logoen som PNG, base64, for e-post. **Generert fil — ikke rediger.**
 *
 * Lages av \`scripts/lag-logo-png.js\` fra \`apps/web/public/logo/logo.svg\`.
 * ${BREDDE}×${HOYDE} px (2× av visningsstørrelsen 32×40), ink #1d1d1f, gjennomsiktig bakgrunn.
 *
 * Hvorfor base64 HER og ikke i \`<img src="data:…">\`
 * De to er ikke det samme. Gmail og Outlook **fjerner** \`data:\`-URI-er i
 * \`src\`, så en «inline base64-logo» i markupen vises ikke hos de fleste
 * mottakere. Denne strengen er derimot innholdet i et VEDLEGG, som sendes med
 * \`contentId\` og refereres som \`cid:\` i HTML-en — det er den varianten
 * e-postklienter faktisk støtter.
 *
 * Hvorfor ikke en URL
 * En hostet PNG er det vanlige valget, men den krever et offentlig domene å
 * ligge på. \`BETTER_AUTH_URL\` er \`http://localhost:3000\` fram til F13 er
 * gjort, og en logo som peker på localhost vises hos nøyaktig én mottaker:
 * den som sendte den.
 *
 * Størrelsen er ${(b64.length / 1024).toFixed(1)} kB base64. Holdes den under ~10 kB, er den
 * billigere enn den ekstra rundturen en hostet URL koster mottakeren.
 */
export const LOGO_EPOST_PNG_BASE64 =
  '${b64}';

/** Filnavn og content-id vedlegget sendes med. \`cid:\`-referansen må matche. */
export const LOGO_EPOST_CID = 'endwise-logo';
export const LOGO_EPOST_FILNAVN = 'endwise.png';
`,
  );

  console.log(`PNG: ${png.length} bytes → ${UT_PNG}`);
  console.log(`base64: ${(b64.length / 1024).toFixed(1)} kB → ${UT_TS}`);
})();
