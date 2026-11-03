'use client';

import { useCallback, useMemo, useState } from 'react';

export type StegDef<T> = {
  id: string;
  tittel: string;
  hjelp?: string;
  gyldig: (utkast: T) => boolean;
  valgfri?: boolean;
};

const LAGER_PREFIKS = 'ew-oppretter:';

export function useOppretter<T extends Record<string, unknown>>({
  steg,
  init,
  lagringsnokkel,
}: {
  steg: readonly StegDef<T>[];
  init: T;
  lagringsnokkel?: string;
}) {
  const [utkast, setUtkast] = useState<T>(() => {
    if (!lagringsnokkel || typeof window === 'undefined') return init;
    try {
      const raa = sessionStorage.getItem(LAGER_PREFIKS + lagringsnokkel);
      return raa ? ({ ...init, ...JSON.parse(raa) } as T) : init;
    } catch {
      return init;
    }
  });
  const [stegIndeks, setStegIndeks] = useState(0);
  const aktiv = steg[Math.min(stegIndeks, steg.length - 1)] ?? steg[0];
  const siste = stegIndeks >= steg.length - 1;
  const kanGaaVidere = aktiv ? aktiv.gyldig(utkast) || Boolean(aktiv.valgfri) : false;

  const lagre = useCallback(
    (neste: T) => {
      setUtkast(neste);
      if (!lagringsnokkel || typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(LAGER_PREFIKS + lagringsnokkel, JSON.stringify(neste));
      } catch {
        /* quota */
      }
    },
    [lagringsnokkel],
  );

  const oppdater = useCallback(
    (del: Partial<T>) => {
      lagre({ ...utkast, ...del });
    },
    [lagre, utkast],
  );

  const neste = useCallback(() => {
    if (!kanGaaVidere || siste) return;
    setStegIndeks((i) => Math.min(i + 1, steg.length - 1));
  }, [kanGaaVidere, siste, steg.length]);

  const tilbake = useCallback(() => {
    setStegIndeks((i) => Math.max(i - 1, 0));
  }, []);

  const gaaTil = useCallback(
    (id: string) => {
      const i = steg.findIndex((s) => s.id === id);
      if (i >= 0) setStegIndeks(i);
    },
    [steg],
  );

  const toem = useCallback(() => {
    setUtkast(init);
    setStegIndeks(0);
    if (lagringsnokkel && typeof window !== 'undefined') {
      sessionStorage.removeItem(LAGER_PREFIKS + lagringsnokkel);
    }
  }, [init, lagringsnokkel]);

  return useMemo(
    () => ({
      utkast,
      oppdater,
      stegIndeks,
      stegAntall: steg.length,
      aktiv,
      siste,
      kanGaaVidere,
      neste,
      tilbake,
      gaaTil,
      toem,
    }),
    [
      aktiv,
      gaaTil,
      kanGaaVidere,
      neste,
      oppdater,
      siste,
      steg.length,
      stegIndeks,
      tilbake,
      toem,
      utkast,
    ],
  );
}
