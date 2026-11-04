import { TRPCError } from '@trpc/server';
import { lesPostgresCause } from './slett-postgres.ts';

const OPPSTART_FEIL = 'Kunne ikke lagre verkstedet. Prøv igjen.';

export function loggOnboardingPostgresFeil(error: unknown): void {
  const pg = lesPostgresCause(error);
  console.error('[onboarding.write]', {
    code: pg.code,
    constraint: pg.constraint,
  });
}

export function mapOnboardingPostgresFeil(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: OPPSTART_FEIL,
  });
}

export function oppstartFeilMelding(error: unknown): string {
  const m = error instanceof Error ? error.message : String(error);
  if (/Failed query|SQLSTATE|params:|42703|42501|42P10|42P01/i.test(m)) {
    return OPPSTART_FEIL;
  }
  return m || OPPSTART_FEIL;
}
