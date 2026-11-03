import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { krevEndwiseAdminSide } from '@/lib/endwise-admin-gate';

export const dynamic = 'force-dynamic';

/**
 * Landing på platform.endwise.no.
 * Innlogget Endwise med passkey → /endwise.
 * Ellers → /logg-inn (gate kaster redirect).
 */
export default async function PlattformStart() {
  await krevEndwiseAdminSide();
  redirect('/endwise' as Route);
}
