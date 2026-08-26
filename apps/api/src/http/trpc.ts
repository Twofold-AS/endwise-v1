import { TwoFactorRequiredError } from '@endwise/auth';
import { TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createRequestContext } from '../context.ts';
import { appRouter } from '../trpc/router.ts';

/**
 * Trpc som Web Request/Response, uten Hono.
 * Samme `fetchRequestHandler` som Hono-skallet brukte. Next.js route handlers
 * og den lokale `serve`-prosessen kaller begge denne, så Vercel trenger
 * ikke `API_INTERNAL_URL` mot localhost.
 */
export function handleTrpc(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req,
    router: appRouter,
    /**
     * `TwoFactorRequiredError` oversettes til en egen feilkode, ikke
     * til 401. Forskjellen betyr noe for brukeren: 401 sender hen til
     * innloggingsskjermen hen nettopp kom fra (og der virker passordet, så
     * løkka går rundt), mens `TWO_FACTOR_REQUIRED` forteller klienten at det er
     * Oppsett som mangler. Uten dette skillet ville tvungen enrollment blitt en
     * uendelig innloggingsløkke uten forklaring.
     */
    createContext: async () => {
      try {
        return await createRequestContext(req.headers);
      } catch (error) {
        if (error instanceof TwoFactorRequiredError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.code, cause: error });
        }
        throw error;
      }
    },
  });
}
