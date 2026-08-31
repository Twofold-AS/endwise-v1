'use client';

import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';
import { useEffect, useState } from 'react';
import { lesTema, type Tema } from '../_lib/tema';

function fargerFor(tema: Tema): { kropp: string; papir: string } {
  if (tema === 'dark') {
    return { kropp: '#ffffff', papir: '#000000' };
  }
  return { kropp: '#111111', papir: '#ffffff' };
}

/**
 * Tema-skall over BloubBot. Motoren remountes ikke — tilstand går via setState.
 */
export function BotFigur({
  tilstand,
  uttrykk,
  storrelse,
  folgPeker,
  spiller,
  onTilstand,
}: {
  tilstand: StateId;
  uttrykk: ExpressionId;
  storrelse: number;
  folgPeker: boolean;
  spiller: boolean;
  onTilstand: (id: StateId) => void;
}) {
  const [tema, setTema] = useState<Tema>('light');

  useEffect(() => {
    const sync = () => setTema(lesTema());
    sync();
    const root = document.documentElement;
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const { kropp, papir } = fargerFor(tema);

  return (
    <BloubBot
      size={storrelse}
      state={tilstand}
      expression={uttrykk}
      follow={folgPeker}
      playing={spiller}
      color={kropp}
      paper={papir}
      shape="cercle"
      onStateChange={onTilstand}
    />
  );
}
