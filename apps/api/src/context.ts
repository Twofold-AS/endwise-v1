import {
  type Auth,
  assertMember,
  createAuth,
  type Role,
  requireSession,
  TwoFactorRequiredError,
} from '@endwise/auth';
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
    /**
     * ⚠️ F5-28 ③ — APP_DATABASE_URL FØRST, og det er ikke en preferanse.
     *
     * `DATABASE_URL` er EIEREN. Kobler API-et seg til som eier, gjelder ikke
     * RLS for den forbindelsen — og det skjer stille: ingen feil, ingen
     * advarsel, bare rader fra alle tenants. Fram til 07.08.2026 leste denne
     * linja `DATABASE_URL` alene, som alle de andre inngangene (stream,
     * notify, quick-pull) allerede unngikk.
     *
     * `force row level security` i grants.sql lukker hullet i databasen. Denne
     * linja lukker det i applikasjonen. Begge deler, for de feiler ulikt.
     */
    const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error('APP_DATABASE_URL (eller DATABASE_URL) mangler');
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
 *
 * ── ⚠️ To hull som ble tettet 12.08.2026 ────────────────────────────────
 *
 * **1. `requireSession` ble hoppet over.** Denne funksjonen kalte
 * `auth.api.getSession()` direkte, mens REST-middlewaren og SSE-kanalen gikk
 * gjennom `requireSession`. Forskjellen er ikke kosmetisk: `requireSession`
 * håndhever den ABSOLUTTE maks-levetiden (F1-12), som Better-Auth ikke kjenner.
 * tRPC — altså **hele datatrafikken** — hadde derfor kun det glidende
 * idle-vinduet. En sesjon eldre enn 12 timer ble avvist på SSE og i REST, men
 * sluppet gjennom her.
 *
 * **2. 2FA ble ikke håndhevet** (F1-11). Nå ligger sjekken inne i
 * `requireSession`, så alle tre inngangene arver den automatisk.
 *
 * ⛔ `TwoFactorRequiredError` slippes VIDERE, den svelges ikke som «ikke
 * innlogget». Uten det ville brukeren blitt sendt til innloggingsskjermen hen
 * nettopp kom fra, i en løkke, uten å få vite at det er 2FA som mangler.
 */
export async function createRequestContext(headers: Headers): Promise<AppContext> {
  const base = createAppContext();
  try {
    const data = await requireSession(getAuthForContext(), base.db, headers);
    const tenantId = data.session.activeOrganizationId ?? null;
    if (!tenantId) return { ...base, userId: data.user.id };
    try {
      const role = await assertMember(base.db, data.user.id, tenantId);
      return { ...base, userId: data.user.id, tenantId, role };
    } catch {
      return { ...base, userId: data.user.id };
    }
  } catch (error) {
    if (error instanceof TwoFactorRequiredError) throw error;
    return base;
  }
}
