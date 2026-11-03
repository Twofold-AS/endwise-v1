'use client';

import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { PHONE_H_SCROLL } from './phone-chrome';

/**
 * Horisontal dest-rad. Sentraliserer aktiv pille. Kantfade når det er mer.
 */
export function PhoneHScroll({
  children,
  lockKey,
  className = '',
}: {
  children: ReactNode;
  lockKey?: string;
  className?: string;
  telefonBareSpacer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const rot = ref.current;
    if (!rot) return;
    const aktiv = rot.querySelector<HTMLElement>('[aria-current=page]');
    aktiv?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [lockKey]);

  return (
    <div
      ref={ref}
      data-phone-h-scroll
      className={`no-scrollbar -mx-3 flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto px-3 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)] ${PHONE_H_SCROLL} ${className}`}
    >
      {children}
    </div>
  );
}
