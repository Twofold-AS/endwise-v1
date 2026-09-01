'use client';

import { BloubBot, type ExpressionId, type StateId } from '@endwise/ui/bloub/BloubBot';

/**
 * Lab-skall over BloubBot. Produktet er lys-only — kropp `#111` / papir `#fff`.
 * Motoren remountes ikke — tilstand går via setState.
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
  return (
    <BloubBot
      size={storrelse}
      state={tilstand}
      expression={uttrykk}
      follow={folgPeker}
      playing={spiller}
      shape="cercle"
      color="#111111"
      paper="#ffffff"
      still={false}
      onStateChange={onTilstand}
    />
  );
}
