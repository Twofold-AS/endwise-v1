/**
 * F5-20 — Ikon-codegen.
 *
 *   packages/ui/src/assets/icons/<slug>.svg
 *        ↓  dette scriptet
 *   packages/ui/src/icons.generated.ts   (ett createLucideIcon-kall per fil)
 *
 * Kjør:  node --experimental-strip-types packages/ui/scripts/build-icons.ts
 * (samme mønster som packages/db/scripts/grants.ts)
 *
 * ── Hvorfor ingen XML-parser ───────────────────────────────────────────────
 * Ingen ny avhengighet uten godkjenning (CLAUDE.md §2). SVG-ene er VÅRE EGNE,
 * eksportert fra Figma med en kjent og stabil form, så en uttrekker holder.
 * Den er med vilje streng: møter den et element den ikke kjenner, sier den fra
 * i stedet for å slippe det gjennom. Et ikon som stilltiende mister en strek er
 * verre enn et ikon som ikke bygger.
 *
 * ── Normalisering ──────────────────────────────────────────────────────────
 * Figma-eksporter kommer med `<defs>`, `<clipPath>` og en `<g clip-path=…>`
 * rundt alt, pluss hardkodet `stroke="black"`. Ingen av delene kan være med:
 * clip-path kan ikke representeres i `IconNode`, og en hardkodet farge betyr at
 * ikonet ikke snur med temaet. Scriptet fjerner wrapperen og bytter farge til
 * `currentColor` — det er den ENE grunnen til at rå eksporter kan legges rett
 * inn i mappa uten håndarbeid.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HER = dirname(fileURLToPath(import.meta.url));
const IKON_MAPPE = join(HER, '..', 'src', 'assets', 'icons');
const UT_FIL = join(HER, '..', 'src', 'icons.generated.ts');

/** Elementene `IconNode` kan representere. Alt annet er en feil. */
const TILLATT = new Set(['path', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'g']);

/** Attributter som skal STRIPPES — de settes av wrapperen, ikke av ikonet. */
const STRIPP = new Set([
  'stroke-width',
  'strokewidth',
  'stroke-linecap',
  'strokelinecap',
  'stroke-linejoin',
  'strokelinejoin',
  'clip-path',
  'clippath',
  'xmlns',
  'id',
  'class',
]);

export type IkonNode = [string, Record<string, string>];

/**
 * ⚠️ SVG-attributt → React DOM-prop. **Dette er ikke kosmetikk.**
 *
 * En SVG skriver `fill-rule`. React vil ha `fillRule`, og kaster ellers
 * «Invalid DOM property `fill-rule`. Did you mean `fillRule`?» i konsollen —
 * og dropper attributtet, så ikonet rendrer FEIL (evenodd-hull blir fylt).
 *
 * Feilen dukket opp da `settings.svg` kom inn i leveranse 2: den er den første
 * med `fill-rule`/`clip-rule`. Konverteringen er derfor generell og ikke en
 * liste over de to — neste Figma-eksport kan ta med `stroke-dasharray`,
 * `stop-color` eller hva som helst annet.
 *
 * Navn med kolon (`xlink:href`, `xml:space`) konverteres IKKE — de er
 * navnerom og hører ikke hjemme i et ikon uansett; de strippes over.
 */
function tilCamel(navn: string): string {
  if (!navn.includes('-')) return navn;
  return navn.replace(/-([a-z])/g, (_, bokstav: string) => bokstav.toUpperCase());
}

/** `shield-check` → `ShieldCheck`. */
export function tilPascal(slug: string): string {
  return slug
    .split('-')
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .join('');
}

function parseAttrs(raw: string): Record<string, string> {
  const ut: Record<string, string> = {};
  for (const m of raw.matchAll(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) {
    const navn = m[1];
    const verdi = m[2];
    if (STRIPP.has(navn.toLowerCase())) continue;
    // Navnerom (xlink:href, xml:space) kan ikke representeres — og skal ikke.
    if (navn.includes(':')) continue;

    // Hardkodet farge → currentColor. Dette er hele poenget: uten det snur
    // ikke ikonet med lys/mørk-toggelen.
    if (navn === 'stroke') {
      if (verdi === 'none') ut.stroke = 'none';
      else ut.stroke = 'currentColor';
      continue;
    }
    if (navn === 'fill') {
      // `fill="white"` i Figma-eksporter er clip-rektangelet, aldri tegningen.
      if (verdi === 'none' || verdi === 'white' || verdi === '#fff' || verdi === '#ffffff')
        continue;
      ut.fill = 'currentColor';
      // Et fylt ikon skal ikke ALSO få wrapperens strek rundt seg.
      ut.stroke = 'none';
      continue;
    }
    // Alt annet slipper gjennom — men ALLTID som React-prop, aldri som rått
    // SVG-attributtnavn.
    ut[tilCamel(navn)] = verdi;
  }
  return ut;
}

export function svgTilNoder(svg: string, filnavn: string): IkonNode[] {
  // Fjern kommentarer og hele <defs>-blokken (clipPath bor der).
  let kropp = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<defs[\s\S]*?<\/defs>/g, '');
  // Behold bare innmaten i <svg>.
  const svgMatch = kropp.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!svgMatch) throw new Error(`${filnavn}: fant ingen <svg>-rot`);
  kropp = svgMatch[1];

  // Pakk ut <g>-wrappere. En <g> uten transform bærer ingen informasjon —
  // den er bare Figmas clip-emballasje.
  kropp = kropp.replace(/<g(?![^>]*\btransform=)[^>]*>/g, '').replace(/<\/g>/g, '');

  const noder: IkonNode[] = [];
  const sett = new Set<string>();

  for (const m of kropp.matchAll(/<([a-zA-Z]+)([^>]*?)\/?>/g)) {
    const tag = m[1].toLowerCase();
    if (tag === 'svg') continue;
    if (!TILLATT.has(tag)) {
      throw new Error(`${filnavn}: elementet <${tag}> kan ikke representeres i IconNode`);
    }
    const attrs = parseAttrs(m[2]);
    if (Object.keys(attrs).length === 0) continue;

    // Figma dupliserer ofte samme path to ganger. Slipp den andre gjennom, og
    // ikonet får dobbel strek på retina.
    const nokkel = `${tag}:${JSON.stringify(attrs)}`;
    if (sett.has(nokkel)) continue;
    sett.add(nokkel);

    noder.push([tag, attrs]);
  }

  if (noder.length === 0) throw new Error(`${filnavn}: ingen tegnbare elementer igjen`);
  return noder;
}

function main() {
  const filer = readdirSync(IKON_MAPPE)
    .filter((f) => f.endsWith('.svg'))
    .sort();

  if (filer.length === 0) {
    console.error(`Ingen .svg i ${IKON_MAPPE}`);
    process.exit(1);
  }

  const deler: string[] = [];
  const navn: string[] = [];

  for (const fil of filer) {
    const slug = fil.replace(/\.svg$/, '');
    const pascal = tilPascal(slug);
    const noder = svgTilNoder(readFileSync(join(IKON_MAPPE, fil), 'utf8'), fil);

    // ⛔ Sikkerhetsnett: en kebab-nøkkel her ville blitt en React-advarsel i
    // konsollen og et attributt som stilltiende droppes. Feil hardt i stedet.
    for (const [, attrs] of noder) {
      const kebab = Object.keys(attrs).filter((k) => k.includes('-'));
      if (kebab.length > 0) {
        throw new Error(
          `${fil}: attributtene ${kebab.join(', ')} er ikke React DOM-props. Utvid tilCamel().`,
        );
      }
    }

    const nodeKode = noder
      .map(([tag, attrs], i) => {
        const a = Object.entries(attrs)
          .map(([k, v]) => `${/^[a-z]+$/i.test(k) ? k : `'${k}'`}: ${JSON.stringify(v)}`)
          .join(', ');
        return `  ['${tag}', { ${a}, key: '${slug}-${i}' }]`;
      })
      .join(',\n');

    deler.push(
      `/** \`${slug}.svg\` — ${noder.length} element${noder.length === 1 ? '' : 'er'}. */\n` +
        `export const ${pascal}: LucideIcon = createLucideIcon('${slug}', [\n${nodeKode},\n]);`,
    );
    navn.push(pascal);
  }

  const ut = `/**
 * ⚠️ GENERERT FIL — IKKE REDIGER.
 *
 * Kilde: \`packages/ui/src/assets/icons/*.svg\`
 * Generator: \`packages/ui/scripts/build-icons.ts\`
 * Regenerer: \`node --experimental-strip-types packages/ui/scripts/build-icons.ts\`
 *
 * ${filer.length} ikoner: ${navn.join(', ')}
 */
import { createLucideIcon, type LucideIcon } from 'lucide-react';

${deler.join('\n\n')}
`;

  writeFileSync(UT_FIL, ut);
  console.info(`✓ ${filer.length} ikoner → src/icons.generated.ts`);
  for (const n of navn) console.info(`  · ${n}`);
}

main();
