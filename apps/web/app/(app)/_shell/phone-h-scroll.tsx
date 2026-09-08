'use client';

import type { ReactNode } from 'react';
import { PHONE_H_SCROLL } from './phone-chrome';

/**
 * Horisontal dest-rad. Ingen tilbake-pil, ingen end-spacer —
 * siste pille er siste innhold, uten død scroll etterpå.
 */
export function PhoneHScroll({
  children,
  className = '',
}: {
  children: ReactNode;
  lockKey?: string;
  className?: string;
  telefonBareSpacer?: boolean;
}) {
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-2 ${PHONE_H_SCROLL} ${className}`}
    >
      {children}
    </div>
  );
}
