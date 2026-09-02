import {
  type Auth,
  assertMember,
  createAuth,
  type Role,
  requireSession,
  TwoFactorRequiredError,
  velgAktivOrganisasjon,
} from '@endwise/auth';
import { createDb, type Database, eq, schema, withTenant } from '@endwise/db';
import { createEventBus, type EventBus } from '@endwise/events';

export interface AppContext {
  db: Database;
  events: EventBus;
  /** Settes av auth-middleware i F1. Null = uautentisert. */
  tenantId: string | null;
  userId: string | null;
  /** Rollen brukeren har I denne tenanten (F1-05). Null = uautentisert. */
  role: Role | null;
  /** Jobbfunksjon i tenanten. Null = ikke lastet / ingen profil. */
  jobFunction: string | null;
  /** Har rad i mechanics med userId. */
  isMechanic: boolean;
  mechanicId: string | null;
}

let dbSingleton: Database | undefined;

function getDb(): Database {
  if (!dbSingleton) {
    /**
     * F5-28 ③ — APP_DATABASE_URL først, og det er ikke en preferanse.
     * `DATABASE_URL` er eieren. Kobler API-et seg til som eier, gjelder ikke
     * RLS for den forbindelsen — og det skjer stille: ingen feil, ingen
     * advarsel, bare rader fra alle tenants. Fram til leste denne
     * linja `DATABASE_URL` alene, som alle de andre inngangene (stream,
     * notify, quick-pull) allerede unngikk.
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

async function lesJobbOgMekaniker(
  db: Database,
  tenantId: string,
  userId: string,
): Promise<{ jobFunction: string | null; isMechanic: boolean; mechanicId: string | null }> {
  try {
    return await withTenant(db, tenantId, async (tx) => {
      const [profil] = await tx
        .select({ jobFunction: schema.memberProfiles.jobFunction })
        .from(schema.memberProfiles)
        .where(eq(schema.memberProfiles.userId, userId))
        .limit(1);
      const [mek] = await tx
        .select({ id: schema.mechanics.id })
        .from(schema.mechanics)
        .where(eq(schema.mechanics.userId, userId))
        .limit(1);
      return {
        jobFunction: profil?.jobFunction ?? null,
        isMechanic: Boolean(mek),
        mechanicId: mek?.id ?? null,
      };
    });
  } catch {
    return { jobFunction: null, isMechanic: false, mechanicId: null };
  }
}

export function createAppContext(): AppContext {
  return {
    db: getDb(),
    events,
    tenantId: null,
    userId: null,
    role: null,
    jobFunction: null,
    isMechanic: false,
    mechanicId: null,
  };
}

let authSingleton: Auth | undefined;
function getAuthForContext(): Auth {
  authSingleton ??= createAuth(getDb());
  return authSingleton;
}

/**
 * F1 — Autentisert tRPC-context. Resolver Better-Auth-sesjonen mykt (kaster ikke
 * for uinnloggede — protectedProcedure gjør det): sesjon → aktiv tenant →
 * medlemskapssjekk (assertMember) → rolle. Uten gyldig sesjon/medlemskap står
 * userId/tenantId/role som null.
 * To hull som ble tettet
 * 1. `requireSession` ble hoppet over. Denne funksjonen kalte
 * `auth.api.getSession` direkte, mens REST-middlewaren og SSE-kanalen gikk
 * gjennom `requireSession`. Forskjellen er ikke kosmetisk: `requireSession`
 * håndhever den absolutte maks-levetiden (F1-12), som Better-Auth ikke kjenner.
 * tRPC — altså **hele datatrafikken** — hadde derfor kun det glidende
 * idle-vinduet. En sesjon eldre enn 12 timer ble avvist på SSE og i REST, men
 * sluppet gjennom her.
 * 2. 2FA ble ikke håndhevet (F1-11). Nå ligger sjekken inne i
 * `requireSession`, så alle tre inngangene arver den automatisk.
 * `TwoFactorRequiredError` slippes videre, den svelges ikke som «ikke
 * innlogget». Uten det ville brukeren blitt sendt til innloggingsskjermen hen
 * nettopp kom fra, i en løkke, uten å få vite at det er 2FA som mangler.
 */
export async function createRequestContext(headers: Headers): Promise<AppContext> {
  const base = createAppContext();
  try {
    const data = await requireSession(getAuthForContext(), base.db, headers);
    let tenantId = data.session.activeOrganizationId ?? null;
    if (!tenantId) {
      const medlemskap = await base.db
        .select({
          id: schema.organization.id,
          slug: schema.organization.slug,
          role: schema.member.role,
        })
        .from(schema.member)
        .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
        .where(eq(schema.member.userId, data.user.id));
      tenantId = velgAktivOrganisasjon(medlemskap);
      if (tenantId) {
        try {
          await base.db
            .update(schema.session)
            .set({ activeOrganizationId: tenantId })
            .where(eq(schema.session.id, data.session.id));
        } catch {
          // Neste request velger på nytt. Sidene lastes likevel med tenantId.
        }
      }
    }
    if (!tenantId) return { ...base, userId: data.user.id };
    try {
      const role = await assertMember(base.db, data.user.id, tenantId);
      const profil = await lesJobbOgMekaniker(base.db, tenantId, data.user.id);
      return { ...base, userId: data.user.id, tenantId, role, ...profil };
    } catch {
      return { ...base, userId: data.user.id };
    }
  } catch (error) {
    // TOTP er valgfri. TWO_FACTOR_REQUIRED tømmer ikke tRPC/REST.
    if (error instanceof TwoFactorRequiredError) return base;
    return base;
  }
}
