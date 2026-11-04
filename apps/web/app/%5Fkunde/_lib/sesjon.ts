import { harSesjonsCookie, kundeErInnloggetHosSlug } from '@endwise/auth';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/** Innlogget = gyldig sesjon OG kunde hos DENNE tenanten. Cookie alene er ikke nok. */
export async function kundeErInnlogget(): Promise<boolean> {
  const h = await headers();
  if (!harSesjonsCookie(h)) return false;
  const slug = h.get('x-endwise-slug')?.trim();
  if (!slug) return false;
  return kundeErInnloggetHosSlug(h, slug);
}

export async function krevKundeInnlogging(): Promise<void> {
  if (!(await kundeErInnlogget())) redirect('/logg-inn' as Route);
}
