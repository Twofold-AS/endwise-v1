import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * F5-15 — Bookinger er slått sammen til «Saker». Denne stien beholdes med vilje
 * som en redirect: varsler (F3-04), bokmerker og eldre lenker peker hit, og en
 * død lenke er en tapt kunde-e-post.
 *
 * Implementasjonen bor nå i `app/(app)/saker/page.tsx` — ÉN liste, ikke to.
 * Detaljruten `/bookinger/[id]` og `/bookinger/ny` står urørt.
 */
export default function BookingerRedirect() {
  redirect('/saker' as Route);
}
