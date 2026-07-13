import { publicProcedure, router } from './init.ts';

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, at: new Date().toISOString() })),
});

export type AppRouter = typeof appRouter;
