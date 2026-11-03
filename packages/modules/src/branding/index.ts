/** WCAG AA for vanlig tekst. */
export const MIN_KONTRAST_AA = 4.5;
export const FORBUDT_CTA = '#0066ff';
export const LOGO_MAX_BYTES = 1_500_000;
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export type LogoMime = 'image/png' | 'image/webp';

export type AksentSvar =
  | { ok: true; hex: string; tekst: string; kontrast: number }
  | { ok: false; grunn: string };

export type LogoSvar =
  | { ok: true; mime: LogoMime; bytes: Uint8Array }
  | { ok: false; grunn: string };

export type BrandingUtkast = {
  visningsnavn: string;
  logoUrl: string | null;
  aksentfarge: string | null;
  aksentTekstfarge: string | null;
  visLevertAv: boolean;
};

export function normaliserHex(verdi: string | null | undefined): string | null {
  const v = verdi?.trim() ?? '';
  if (!HEX_RE.test(v)) return null;
  return v.toLowerCase();
}

export function erForbudtCtaFarge(hex: string): boolean {
  const h = normaliserHex(hex);
  if (!h) return false;
  if (h === FORBUDT_CTA) return true;
  const r = Number.parseInt(h.slice(1, 3), 16);
  const g = Number.parseInt(h.slice(3, 5), 16);
  const b = Number.parseInt(h.slice(5, 7), 16);
  return Math.abs(r - 0) <= 24 && Math.abs(g - 0x66) <= 24 && Math.abs(b - 0xff) <= 24;
}

function kanal(n: number): number {
  const s = n / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativLuminans(hex: string): number {
  const h = normaliserHex(hex);
  if (!h) return 0;
  const r = kanal(Number.parseInt(h.slice(1, 3), 16));
  const g = kanal(Number.parseInt(h.slice(3, 5), 16));
  const b = kanal(Number.parseInt(h.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function kontrastForhold(a: string, b: string): number {
  const l1 = relativLuminans(a);
  const l2 = relativLuminans(b);
  const lys = Math.max(l1, l2);
  const mork = Math.min(l1, l2);
  return (lys + 0.05) / (mork + 0.05);
}

export function vurderAksent(verdi: string): AksentSvar {
  const hex = normaliserHex(verdi);
  if (!hex) return { ok: false, grunn: 'Fargen må være #rrggbb.' };
  if (erForbudtCtaFarge(hex)) {
    return { ok: false, grunn: 'Den blåfargen kan ikke brukes. Velg en annen.' };
  }
  const motHvit = kontrastForhold(hex, '#ffffff');
  const motSvart = kontrastForhold(hex, '#141414');
  if (motHvit >= MIN_KONTRAST_AA && motHvit >= motSvart) {
    return { ok: true, hex, tekst: '#ffffff', kontrast: Math.round(motHvit * 100) / 100 };
  }
  if (motSvart >= MIN_KONTRAST_AA) {
    return { ok: true, hex, tekst: '#141414', kontrast: Math.round(motSvart * 100) / 100 };
  }
  return { ok: false, grunn: 'For dårlig kontrast. Velg en mørkere eller lysere farge.' };
}

const PNG_SIGN = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function erPng(bytes: Uint8Array): boolean {
  return PNG_SIGN.every((b, i) => bytes[i] === b);
}

function erWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
  const webp = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0);
  return riff === 'RIFF' && webp === 'WEBP';
}

function serUtSomSvg(bytes: Uint8Array): boolean {
  const hode = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 256)).toLowerCase();
  return hode.includes('<svg') || hode.includes('<!doctype svg');
}

/** Beholder IHDR/PLTE/tRNS/IDAT/IEND — fjerner eXIf og tekstchunks. */
export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  if (!erPng(bytes)) return bytes;
  const behold = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
  const ut: number[] = [...PNG_SIGN];
  let i = 8;
  while (i + 8 <= bytes.length) {
    const len =
      ((bytes[i] ?? 0) << 24) |
      ((bytes[i + 1] ?? 0) << 16) |
      ((bytes[i + 2] ?? 0) << 8) |
      (bytes[i + 3] ?? 0);
    const typ = String.fromCharCode(
      bytes[i + 4] ?? 0,
      bytes[i + 5] ?? 0,
      bytes[i + 6] ?? 0,
      bytes[i + 7] ?? 0,
    );
    const slutt = i + 12 + len;
    if (slutt > bytes.length || len < 0) break;
    if (behold.has(typ)) {
      ut.push(...bytes.slice(i, slutt));
    }
    i = slutt;
    if (typ === 'IEND') break;
  }
  return new Uint8Array(ut);
}

export function sjekkLogoBytes(bytes: Uint8Array): LogoSvar {
  if (bytes.byteLength === 0) return { ok: false, grunn: 'Filen er tom.' };
  if (bytes.byteLength > LOGO_MAX_BYTES) {
    return { ok: false, grunn: 'Logoen er for stor. Maks 1,5 MB.' };
  }
  if (serUtSomSvg(bytes)) return { ok: false, grunn: 'SVG er ikke tillatt.' };
  if (erPng(bytes)) return { ok: true, mime: 'image/png', bytes: stripPngMetadata(bytes) };
  if (erWebp(bytes)) return { ok: true, mime: 'image/webp', bytes };
  return { ok: false, grunn: 'Bare PNG eller WebP.' };
}

export function tomtUtkast(visningsnavn: string): BrandingUtkast {
  return {
    visningsnavn,
    logoUrl: null,
    aksentfarge: null,
    aksentTekstfarge: null,
    visLevertAv: true,
  };
}

export function utkastFraUkjent(verdi: unknown, fallbackNavn: string): BrandingUtkast {
  const tom = tomtUtkast(fallbackNavn);
  if (!verdi || typeof verdi !== 'object') return tom;
  const v = verdi as Record<string, unknown>;
  const navn =
    typeof v.visningsnavn === 'string' && v.visningsnavn.trim()
      ? v.visningsnavn.trim()
      : fallbackNavn;
  const logo = typeof v.logoUrl === 'string' && v.logoUrl.startsWith('https://') ? v.logoUrl : null;
  const farge = normaliserHex(typeof v.aksentfarge === 'string' ? v.aksentfarge : null);
  const tekst = normaliserHex(typeof v.aksentTekstfarge === 'string' ? v.aksentTekstfarge : null);
  return {
    visningsnavn: navn.slice(0, 80),
    logoUrl: logo,
    aksentfarge: farge,
    aksentTekstfarge: tekst,
    visLevertAv: v.visLevertAv !== false,
  };
}
