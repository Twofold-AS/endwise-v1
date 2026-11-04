import { z } from 'zod';
import { erReservertSlug } from '../tenant-host/reserverte-slugs.ts';

/** 30 min reservasjon under onboarding (plan §3.4). */
export const SLUG_RESERVASJON_MINUTTER = 30;
/** Gamle slugs kan ikke tas av andre på 12 måneder. */
export const SLUG_KARANTENE_MAANEDER = 12;
/** Omdirigering etter slug-bytte. */
export const SLUG_OMDIRIGER_DAGER = 90;

export const SLUG_MIN = 3;
export const SLUG_MAX = 32;

/** Merkenavn som krever manuell godkjenning. Utkast. */
export const MANUELL_SLUGS = ['vipps', 'bankid', 'posten', 'nav', 'skatteetaten'] as const;

const MANUELL_SETT = new Set<string>(MANUELL_SLUGS);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugFormatSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SLUG_MIN, 'Minst 3 tegn')
  .max(SLUG_MAX, 'Maks 32 tegn')
  .refine((s) => SLUG_RE.test(s), 'Kun små bokstaver, tall og bindestrek')
  .refine((s) => !s.includes('--') && !s.startsWith('xn--'), 'Ugyldig bindestrek');

export const slugSchema = slugFormatSchema.refine(
  (s) => !erReservertSlug(s),
  'Dette navnet er reservert',
);

export type Slug = z.infer<typeof slugSchema>;

/** Forhåndsvisning på admin-flaten. Tom slug → plassholder. */
export function kundeVert(slug: string, rot = 'endwise.no'): string {
  const s = slug.trim().toLowerCase();
  return `${s || '…'}.${rot}`;
}

export function erManuellSlug(slug: string): boolean {
  return MANUELL_SETT.has(slug.trim().toLowerCase());
}

export function vurderSlugFormat(verdi: string): { ok: true; slug: string } | { ok: false } {
  const parsed = slugFormatSchema.safeParse(verdi);
  if (!parsed.success) return { ok: false };
  return { ok: true, slug: parsed.data };
}

const TRANSLIT: Record<string, string> = {
  æ: 'ae',
  ø: 'o',
  å: 'aa',
  ä: 'ae',
  ö: 'o',
  ü: 'u',
  é: 'e',
  è: 'e',
  ê: 'e',
  á: 'a',
  à: 'a',
};

/** Firmanavn eller sted → slug-forslag (æ→ae, ø→o, å→aa). */
export function foreslaSlug(navn: string): string {
  const s = navn.trim().toLowerCase();
  let ut = '';
  for (const ch of s) {
    const bytta = TRANSLIT[ch];
    if (bytta) {
      ut += bytta;
      continue;
    }
    const kode = ch.charCodeAt(0);
    if ((kode >= 97 && kode <= 122) || (kode >= 48 && kode <= 57)) {
      ut += ch;
    } else if (ch === ' ' || ch === '_' || ch === '.' || ch === '/' || ch === '-') {
      ut += '-';
    }
  }
  ut = ut.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (ut.length > SLUG_MAX) ut = ut.slice(0, SLUG_MAX).replace(/-$/, '');
  if (ut.length < SLUG_MIN) return '';
  const parsed = slugSchema.safeParse(ut);
  return parsed.success ? parsed.data : '';
}

export type KollisjonForslag = {
  slug: string;
  sted?: string;
  firmanavn?: string;
};

/**
 * Tre forslag ved kollisjon. Ingen opplysning om hvem som har navnet.
 * `bergen` → bergen-sentrum, bergen-<firma>, bergen-2.
 */
export function forslagVedKollisjon(input: KollisjonForslag): string[] {
  const base = input.slug.trim().toLowerCase();
  const ut: string[] = [];
  const stedSlug = input.sted ? foreslaSlug(input.sted) : '';
  const firmaSlug = input.firmanavn ? foreslaSlug(input.firmanavn) : '';
  const kandidater = [
    `${base}-sentrum`,
    stedSlug ? `${base}-${stedSlug}` : '',
    firmaSlug ? `${base}-${firmaSlug}` : '',
    `${base}-2`,
  ];
  for (const k of kandidater) {
    if (!k || k === base || ut.includes(k)) continue;
    const parsed = slugSchema.safeParse(k);
    if (parsed.success && !erManuellSlug(parsed.data)) ut.push(parsed.data);
    if (ut.length >= 3) break;
  }
  let n = 3;
  while (ut.length < 3 && n < 20) {
    const k = `${base}-${n}`;
    n += 1;
    const parsed = slugSchema.safeParse(k);
    if (parsed.success && !ut.includes(parsed.data)) ut.push(parsed.data);
  }
  return ut.slice(0, 3);
}

export type SlugLedigGrunn = 'ledig' | 'reservert' | 'opptatt' | 'manuell' | 'ugyldig';

export type SlugLedigSvar = {
  ledig: boolean;
  grunn: SlugLedigGrunn;
  slug?: string;
  forslag: string[];
};

export function byggSlugSvar(
  verdi: string,
  opts: { opptatt: boolean; sted?: string; firmanavn?: string },
): SlugLedigSvar {
  const format = vurderSlugFormat(verdi);
  if (!format.ok) {
    return { ledig: false, grunn: 'ugyldig', forslag: [] };
  }
  const slug = format.slug;
  if (erReservertSlug(slug)) {
    return { ledig: false, grunn: 'reservert', slug, forslag: [] };
  }
  if (erManuellSlug(slug)) {
    return {
      ledig: false,
      grunn: 'manuell',
      slug,
      forslag: forslagVedKollisjon({ slug, sted: opts.sted, firmanavn: opts.firmanavn }),
    };
  }
  if (opts.opptatt) {
    return {
      ledig: false,
      grunn: 'opptatt',
      slug,
      forslag: forslagVedKollisjon({ slug, sted: opts.sted, firmanavn: opts.firmanavn }),
    };
  }
  return { ledig: true, grunn: 'ledig', slug, forslag: [] };
}

/** In-memory rate limit per invitasjon. 20 sjekker / minutt. */
const SLUG_SJEKK_PER_MIN = 20;
const slugSjekkTeller = new Map<string, { n: number; reset: number }>();

export function slugSjekkTillatt(nokkel: string, naa = Date.now()): boolean {
  const rad = slugSjekkTeller.get(nokkel);
  if (!rad || naa >= rad.reset) {
    slugSjekkTeller.set(nokkel, { n: 1, reset: naa + 60_000 });
    return true;
  }
  if (rad.n >= SLUG_SJEKK_PER_MIN) return false;
  rad.n += 1;
  return true;
}

export function nullstillSlugSjekkTeller(): void {
  slugSjekkTeller.clear();
}
