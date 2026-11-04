import { erReservertSlug } from './reserverte-slugs.ts';

export type VertSone = 'marked' | 'platform' | 'app' | 'forhandler' | 'reservert' | 'ukjent';

export type TenantOpplosning = {
  sone: VertSone;
  slug: string | null;
  vert: string;
};

export type OpplosOpts = {
  rotDomene?: string;
  /** Resultat av eget-domene-oppslag (F0-stub returnerer alltid null). */
  egetDomeneSlug?: string | null;
  vercelEnv?: string;
  /** Preview/dev-overstyring. Ignoreres når vercelEnv === 'production'. */
  previewSlug?: string | null;
};

const DEFAULT_ROT = 'endwise.no';
const SLUG_RE = /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/;

/** Fjerner ledende/avsluttende punktum uten regex (unngår ReDoS på Host). */
function trimPunktum(verdi: string): string {
  let start = 0;
  let slutt = verdi.length;
  while (start < slutt && verdi.charCodeAt(start) === 46) start += 1;
  while (slutt > start && verdi.charCodeAt(slutt - 1) === 46) slutt -= 1;
  return verdi.slice(start, slutt);
}

export function normaliserVert(host: string | null | undefined): string {
  if (!host) return '';
  let v = host.trim().toLowerCase();
  if (v.startsWith('[') && v.includes(']')) {
    const slutt = v.indexOf(']');
    v = v.slice(0, slutt + 1);
  } else {
    const kolon = v.lastIndexOf(':');
    if (kolon > 0 && /^\d+$/.test(v.slice(kolon + 1))) {
      v = v.slice(0, kolon);
    }
  }
  if (v.endsWith('.')) v = v.slice(0, -1);
  return v;
}

/**
 * F0-stub. Eget CNAME-domene slås opp i `tenant_domains` fra F3.
 * Returnerer alltid null — ingen atferd, ingen lekkasje av hvilke domener som finnes.
 */
export function slaaOppEgetDomene(_vert: string): string | null {
  return null;
}

function slugErGyldig(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 32 && SLUG_RE.test(slug) && !slug.includes('--');
}

function forhandlerEllerReservert(slug: string, vert: string): TenantOpplosning {
  if (erReservertSlug(slug) || slug.includes('--')) {
    return { sone: 'reservert', slug: null, vert };
  }
  if (!slugErGyldig(slug)) {
    return { sone: 'ukjent', slug: null, vert };
  }
  return { sone: 'forhandler', slug, vert };
}

function erLokalVert(vert: string): boolean {
  return (
    vert === 'localhost' || vert === '127.0.0.1' || vert === '[::1]' || vert.endsWith('.localhost')
  );
}

/**
 * Bestemmer sone fra Host. Ingen database. Ukjent slug røper ikke hvilke som finnes.
 */
export function opplosTenantFraHost(
  host: string | null | undefined,
  opts: OpplosOpts = {},
): TenantOpplosning {
  const vert = normaliserVert(host);
  const rot = trimPunktum((opts.rotDomene ?? DEFAULT_ROT).trim().toLowerCase());

  if (opts.vercelEnv !== 'production') {
    const preview = opts.previewSlug?.trim().toLowerCase() ?? '';
    if (preview) return forhandlerEllerReservert(preview, vert || `preview.${rot}`);
  }

  if (!vert) return { sone: 'ukjent', slug: null, vert: '' };

  if (vert === 'localhost' || vert === '127.0.0.1' || vert === '[::1]') {
    return { sone: 'marked', slug: null, vert };
  }

  if (vert.endsWith('.localhost')) {
    const slug = vert.slice(0, -'.localhost'.length);
    if (slug === 'platform') return { sone: 'platform', slug: null, vert };
    if (slug === 'app') return { sone: 'app', slug: null, vert };
    if (slug === 'www' || slug === '') return { sone: 'marked', slug: null, vert };
    return forhandlerEllerReservert(slug, vert);
  }

  if (vert === rot || vert === `www.${rot}`) {
    return { sone: 'marked', slug: null, vert };
  }

  if (vert === `platform.${rot}`) {
    return { sone: 'platform', slug: null, vert };
  }

  if (vert === `app.${rot}`) {
    return { sone: 'app', slug: null, vert };
  }

  if (vert.endsWith(`.${rot}`)) {
    const slug = vert.slice(0, -(rot.length + 1));
    if (!slug || slug.includes('.')) {
      return { sone: 'ukjent', slug: null, vert };
    }
    if (slug === 'platform') return { sone: 'platform', slug: null, vert };
    if (slug === 'app') return { sone: 'app', slug: null, vert };
    return forhandlerEllerReservert(slug, vert);
  }

  if (erLokalVert(vert)) {
    return { sone: 'ukjent', slug: null, vert };
  }

  const eget = opts.egetDomeneSlug?.trim().toLowerCase() ?? null;
  if (eget) return forhandlerEllerReservert(eget, vert);

  return { sone: 'ukjent', slug: null, vert };
}
