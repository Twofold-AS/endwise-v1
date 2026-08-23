import { TRPCError } from '@trpc/server';

/**
 * F5-26 — Drizzle viser «Failed query: select slett_forhandler(…)» og gjemmer
 * Postgres-årsaken i `error.cause`. Produksjon på Scaleway (17ec774) ga 500
 * uten SQLSTATE i Vercel-loggen.
 *
 * Mappes hit slik at Endwise-admin ser klassen (mangler funksjon / RLS / FK),
 * ikke en rå spørring. Ruta er `endwiseAdminProcedure` — ikke-admin kommer
 * aldri hit.
 */

export type SlettPostgres = {
  code?: string;
  message?: string;
  constraint?: string;
};

function somObjekt(verdi: unknown): Record<string, unknown> | null {
  return verdi !== null && typeof verdi === 'object' ? (verdi as Record<string, unknown>) : null;
}

export function lesPostgresCause(error: unknown): SlettPostgres {
  const topp = somObjekt(error);
  const cause = topp ? somObjekt(topp.cause) : null;
  const kilde = cause ?? topp;
  if (!kilde) return {};
  return {
    code: typeof kilde.code === 'string' ? kilde.code : undefined,
    message: typeof kilde.message === 'string' ? kilde.message : undefined,
    constraint: typeof kilde.constraint === 'string' ? kilde.constraint : undefined,
  };
}

function adminMelding(pg: SlettPostgres, fallback: string): string {
  const m = pg.message?.trim() ?? '';
  if (!m || m.startsWith('Failed query:')) return fallback;
  return `Slettingen feilet: ${m}`;
}

export function mapSlettPostgresFeil(error: unknown): TRPCError {
  const pg = lesPostgresCause(error);
  const msg = pg.message ?? '';
  const sqlstate = pg.code ?? '';

  if (/finnes ikke/i.test(msg)) {
    return new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren.' });
  }
  if (/kan ikke slette Endwise/i.test(msg) || /krever platform_admin/i.test(msg)) {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: 'Du kan ikke slette denne tenanten.',
    });
  }
  if (sqlstate === '42883' || /function .* does not exist/i.test(msg)) {
    return new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Slettefunksjonen mangler i databasen. Kjør pnpm db:setup på Scaleway.',
    });
  }
  if (
    sqlstate === '42501' ||
    /row-level security|insufficient_privilege|permission denied/i.test(msg)
  ) {
    return new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Databasen avviste slettingen (RLS). Kjør pnpm db:setup på Scaleway.',
    });
  }
  if (sqlstate === '23503' || /foreign key/i.test(msg)) {
    return new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Slettingen stoppet på gjenværende koblinger i databasen.',
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: adminMelding(pg, 'Slettingen feilet. Se serverloggen for Postgres-årsaken.'),
  });
}

export function loggSlettPostgresFeil(tenantId: string, error: unknown): void {
  const pg = lesPostgresCause(error);
  console.error('[tenants.slett]', {
    tenantId,
    code: pg.code,
    constraint: pg.constraint,
    message: pg.message,
  });
}
