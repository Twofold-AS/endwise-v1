/**
 * Kalenderdag i Europe/Oslo for Timeplan / Jobber / Verkstedet.
 * Kilden er `@endwise/modules/tid` — web importerer ikke resten av
 * server-laget. #89 (`packages/auth/src/tid.ts`) eier reset-klokke, ikke
 * jobb-døgn, og er ikke en avhengighet her.
 */
export {
  osloDagsvindu,
  osloKalenderdag,
  osloPlusDager,
  osloStartAvDag,
  osloStartAvUke,
  osloUkedagMandag0,
  osloVegg,
  osloVeggklokke,
  osloVeggtid,
  PRODUKT_TIDSSONE,
  sammeOsloDag,
} from '@endwise/modules/tid';
