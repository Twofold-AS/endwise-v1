import { type Auth, assertMember, createAuth, type Role } from '@endwise/auth';
import { createDb, type Database } from '@endwise/db';
import { createEventBus, type EventBus } from '@endwise/events';

export interface AppContext {
  db: Database;
  events: EventBus;
  /** Settes av auth-middleware i F1. Null = uautentisert. */
  tenantId: string | null;
  userId: string | null;
  /** Rollen brukeren har I DENNE tenanten (F1-05). Null = uautentisert. */
  role: Role | null;
}

let dbSingleton: Database | undefined;

function getDb(): Database {
  if (!dbSingleton) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL mangler');
    dbSingleton = createDb(url);
  }
  return dbSingleton;
}

const events = createEventBus();

export function createAppContext(): AppContext {
  return { db: getDb(), events, tenantId: null, userId: null, role: null };
}

let authSingleton: Auth | undefined;
function getAuthForContext(): Auth {
  authSingleton ??= createAuth(getDb());
  return authSingleton;
}

/**
 * F1 — Autentisert tRPC-context. Resolver Better-Auth-sesjonen MYKT (kaster ikke
 * for uinnloggede — protectedProcedure gjør det): sesjon → aktiv tenant →
 * medlemskapssjekk (assertMember) → rolle. Uten gyldig sesjon/medlemskap står
 * userId/tenantId/role som null.
 */
export async function createRequestContext(headers: Headers): Promise<AppContext> {
  const base = createAppContext();
  try {
    const data = await getAuthForContext().api.getSession({ headers });
    if (!data?.user) return base;
    const tenantId = data.session.activeOrganizationId ?? null;
    if (!tenantId) return { ...base, userId: data.user.id };
    try {
      const role = await assertMember(base.db, data.user.id, tenantId);
      return { ...base, userId: data.user.id, tenantId, role };
    } catch {
      return { ...base, userId: data.user.id };
    }
  } catch {
    return base;
  }
}
