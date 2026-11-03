import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

/** Navigation glyphs mirror; logos, media controls and trend arrows do not. */
const directionalIcons: ReadonlySet<unknown> = new Set([
  ArrowLeft,
  ChevronLeft,
  ArrowRight,
  ChevronRight,
]);

export function directionalIconClass(icon: unknown): string | undefined {
  return directionalIcons.has(icon) ? 'rtl:rotate-180' : undefined;
}
