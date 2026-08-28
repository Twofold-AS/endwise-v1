'use client';

import { useParams, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Telefon-landing er lista. Tom-postkassa og compose bor i denne
 * kolonnen — skjult på telefon når ingen tråd og ikke Ny chat.
 */
export function InboxHovedflate({ children }: { children: ReactNode }) {
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const vis = Boolean(params?.id) || search?.get('ny') === '1';

  return (
    <div className={`min-w-0 flex-1 overflow-y-auto ${vis ? '' : 'max-md:hidden'}`}>{children}</div>
  );
}
