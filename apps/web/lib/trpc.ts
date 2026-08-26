import type { AppRouter } from '@endwise/api/router';
import { createTRPCReact } from '@trpc/react-query';
import type { inferRouterOutputs } from '@trpc/server';

/** F1 / F13-03 — tRPC v11 React-klient mot `/trpc` i Next (typet av AppRouter). */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Utledede svartyper fra ruteren.
 * Brukes når en komponent tar en gren av et union-svar som prop
 * (`_detaljer.tsx` tegner kunde/mekaniker/konto hver for seg). Å utlede typen
 * fra `useQuery(...)['data']` virker ikke: hooken krever argumenter, og
 * `ReturnType` på et ukalt kall gir `never`. `inferRouterOutputs` er den
 * offisielle veien — og den holder seg synk med serveren av seg selv.
 */
export type RouterOutput = inferRouterOutputs<AppRouter>;
