/**
 * Claude Design-struktur — pageTitle · pageSub · CHIP / ACT / TAG.
 * Farger er Mobbin-tokens (ink / muted / field / hairline). Ingen Claude-hex.
 * Inter, stadium-piller, shadow-free. Ingen pip.
 */

export const CLAUDE_PAGE_TITLE = 'text-[22px] font-[650] leading-[1.1] tracking-[-0.02em] text-fg';
export const CLAUDE_PAGE_SUB = 'text-[15px] font-[450] leading-[1.3] text-fg-muted';
export const CLAUDE_SECTION = 'text-[13px] font-[650] leading-none text-fg-muted';
export const CLAUDE_ROW_TITLE = 'text-[17px] font-[450] leading-[1.3] text-fg';
export const CLAUDE_ROW_SUB = 'text-[14px] font-[450] leading-[1.3] text-fg-muted';
export const CLAUDE_CHIP =
  'inline-flex h-8 items-center rounded-full px-3 text-[13px] font-[450] [touch-action:manipulation]';
export const CLAUDE_ACT =
  'inline-flex h-10 items-center justify-center rounded-full px-4 text-[15px] font-[450] [touch-action:manipulation]';
export const CLAUDE_TAG =
  'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-[650] uppercase tracking-[0.04em]';
export const CLAUDE_CARD = 'rounded-[24px] border border-divide bg-card text-fg shadow-none';
export const CLAUDE_SOFT = 'rounded-[24px] bg-surface-2 text-fg shadow-none';

export const NORSK_ALPHA = [
  '#',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'Æ',
  'Ø',
  'Å',
] as const;

export type NorskBokstav = (typeof NORSK_ALPHA)[number];

export function initialer(navn: string): string {
  const deler = navn.trim().split(/\s+/).filter(Boolean);
  if (deler.length === 0) return '?';
  const forste = deler[0]?.[0] ?? '';
  const siste = deler.length > 1 ? (deler[deler.length - 1]?.[0] ?? '') : '';
  return `${forste}${siste}`.toUpperCase();
}

export function forbokstav(navn: string): NorskBokstav {
  const raw = navn.trim().charAt(0).toUpperCase();
  if ((NORSK_ALPHA as readonly string[]).includes(raw) && raw !== '#') {
    return raw as NorskBokstav;
  }
  return '#';
}

/** Norsk tall med hardt mellomrom (4 820). */
export function fmtNorskTall(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n)
    .toLocaleString('nb-NO')
    .replace(/\u00a0/g, ' ');
}

export function fmtDelta(prosent: number | null): { tekst: string; opp: boolean } | null {
  if (prosent == null || !Number.isFinite(prosent)) return null;
  const avrundet = Math.round(prosent);
  if (avrundet === 0) return { tekst: '0 %', opp: true };
  const fortegn = avrundet > 0 ? '+' : '−';
  return { tekst: `${fortegn}${Math.abs(avrundet)} %`, opp: avrundet > 0 };
}

export function prosentEndring(denne: number, forrige: number): number | null {
  if (forrige <= 0 && denne <= 0) return null;
  if (forrige <= 0) return 100;
  return ((denne - forrige) / forrige) * 100;
}

export function fmtSvarMs(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const min = Math.round(ms / 60_000);
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const timer = min / 60;
  if (timer < 10) return `${timer.toFixed(1).replace('.', ',')} t`;
  return `${Math.round(timer)} t`;
}

export function fmtSlaAlder(from: Date | string | null | undefined, naa = new Date()): string {
  if (!from) return '—';
  const ms = Math.max(0, naa.getTime() - new Date(from).getTime());
  const min = Math.round(ms / 60_000);
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const timer = Math.round(min / 60);
  if (timer < 24) return `${timer} t`;
  return `${Math.round(timer / 24)} d`;
}
