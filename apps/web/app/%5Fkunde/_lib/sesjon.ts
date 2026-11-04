import { harSesjonsCookie } from '@endwise/auth';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function kundeErInnlogget(): Promise<boolean> {
  const h = await headers();
  return harSesjonsCookie(h);
}

export async function krevKundeInnlogging(): Promise<void> {
  if (!(await kundeErInnlogget())) redirect('/logg-inn' as Route);
}
