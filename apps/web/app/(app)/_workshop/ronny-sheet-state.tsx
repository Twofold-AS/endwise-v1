'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { RonnySheetSnap } from './ronny-sheet';

type RonnySheetState = {
  apen: boolean;
  hoyde: RonnySheetSnap;
  apne: () => void;
  lukk: () => void;
  forstor: () => void;
};

const fallback: RonnySheetState = {
  apen: false,
  hoyde: 80,
  apne: () => {},
  lukk: () => {},
  forstor: () => {},
};

const Ctx = createContext<RonnySheetState>(fallback);

export function RonnySheetProvider({ children }: { children: ReactNode }) {
  const [apen, setApen] = useState(false);
  const [hoyde, setHoyde] = useState<RonnySheetSnap>(80);
  const apne = useCallback(() => {
    setHoyde(80);
    setApen(true);
  }, []);
  const lukk = useCallback(() => {
    setApen(false);
    setHoyde(80);
  }, []);
  const forstor = useCallback(() => {
    setHoyde(100);
    setApen(true);
  }, []);
  const value = useMemo(
    () => ({ apen, hoyde, apne, lukk, forstor }),
    [apen, hoyde, apne, lukk, forstor],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRonnySheet(): RonnySheetState {
  return useContext(Ctx);
}
