import type { AppRouter } from '@endwise/api/router';
import { createTRPCReact } from '@trpc/react-query';

/** F1 — tRPC v11 React-klient mot apps/api (typet av AppRouter). */
export const trpc = createTRPCReact<AppRouter>();
