'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * + Ny åpner lokal state. ?ny=1 og gamle ?fane=opprett strippes fra URL.
 */
export function useNyHandling() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const params = useSearchParams();
  const [apen, setApen] = useState(false);

  const raa = params?.toString() ?? '';
  const skalAapne =
    params?.get('ny') === '1' ||
    params?.get('fane') === 'opprett' ||
    params?.get('fane') === 'ny';

  useEffect(() => {
    if (!skalAapne) return;
    setApen(true);
    const neste = new URLSearchParams(raa);
    if (neste.get('fane') === 'opprett' || neste.get('fane') === 'ny') neste.delete('fane');
    neste.delete('ny');
    const q = neste.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, raa, router, skalAapne]);

  return { apen, apne: () => setApen(true), lukk: () => setApen(false) };
}

export function NyKnapp({
  onClick,
  children,
}: {
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      data-ny-knapp
      onClick={onClick}
      className="inline-flex h-11 items-center rounded-pill bg-fg px-4 text-label text-bg"
    >
      {children.startsWith('+') ? children : `+ ${children}`}
    </button>
  );
}
