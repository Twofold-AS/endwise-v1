import {
  type Auth,
  type AuthSone,
  assertMember,
  brukerHarPasskey,
  createAuth,
  erBedriftVinduAktiv,
  harSesjonsCookie,
  lesAuthSone,
  lesTenantIdFraSlug,
  type Role,
  requireSession,
  rolleTillattISone,
  type SesjonKontekst,
  TwoFactorRequiredError,
  velgAktivOrganisasjon,
} from '@endwise/auth';
import {
  and,
  createConcurrencyGate,
  createDb,
  type Database,
  eq,
  schema,
  withTenant,
} from '@endwise/db';
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
  /**
   * Begrenser parallelle tRPC-prosedyrer i ÉN HTTP-batch.
   * Uten port: fetch-adapteren kjører batchen med Promise.all mot pool max 5.
   */
  limitBatch?: <T>(fn: () => Promise<T>) => Promise<T>;
  /** F5: satt når white label er på og proxyen har sone-header. */
  authSone: AuthSone | null;
  /** F5: platform krever bundet passkey for admin-prosedyrer. */
  passkeyOk: boolean;
  /** F7: privat | bedrift. Null uten flagg / uten sesjon. */
  kontekst: SesjonKontekst | null;
  /** F7: tenant fra Host. Avvik mot sesjon avviser. */
  hostTenantId: string | null;
  /** F7: Set-Cookie ved sesjonsrotasjon. */
  setAuthCookie?: (cookie: string) => void;
  /** F7: CSRF-header og Host-tenant. */
  requestHeaders: Headers;
}

/** Samme tall som tenant-tx-porten: 2, ikke gjett-opp av pool-max. */
export const TRPC_BATCH_CONCURRENCY = 2;

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
    limitBatch: (fn) => fn(),
    authSone: null,
    passkeyOk: false,
    kontekst: null,
    hostTenantId: null,
    requestHeaders: new Headers(),
  };
}

let defaultAuth: Auth | undefined;
let platformAuth: Auth | undefined;
function getAuthForContext(sone: AuthSone | null): Auth {
  if (sone === 'platform') {
    platformAuth ??= createAuth(getDb(), { sone: 'platform' });
    return platformAuth;
  }
  defaultAuth ??= createAuth(getDb(), sone ? { sone } : undefined);
  return defaultAuth;
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
 * Ingen sesjonskake: returner uautentisert uten `requireSession`/`getSession`.
 * protectedProcedure kaster 401. Produktregler (idle, absolut, 2FA) urørt
 * når kaken finnes.
 */
export async function createRequestContext(headers: Headers): Promise<AppContext> {
  const authSone = lesAuthSone(headers);
  const base = { ...createAppContext(), authSone, requestHeaders: headers };
  const gate = createConcurrencyGate(TRPC_BATCH_CONCURRENCY);
  const medPort = (rest: Partial<AppContext> = {}): AppContext => ({
    ...base,
    ...rest,
    authSone,
    limitBatch: (fn) => gate.run(fn),
  });

  const hostSlug = headers.get('x-endwise-slug')?.trim() ?? '';
  const hostTenantId =
    authSone === 'forhandler' && hostSlug
      ? await lesTenantIdFraSlug(base.db, hostSlug).catch(() => null)
      : null;

  if (!harSesjonsCookie(headers)) return medPort({ hostTenantId });
  try {
    const data = await requireSession(getAuthForContext(authSone), base.db, headers);
    const sesjonOrg = data.session.activeOrganizationId ?? null;
    if (hostTenantId && sesjonOrg && sesjonOrg !== hostTenantId) {
      return medPort({ hostTenantId, userId: data.user.id });
    }
    let tenantId = hostTenantId ?? sesjonOrg;
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
      tenantId = velgAktivOrganisasjon(medlemskap, authSone);
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
    if (!tenantId) return medPort({ userId: data.user.id, hostTenantId });
    const sesjon = data.session as {
      kontekst?: string | null;
      bedriftVerifisertAt?: Date | string | null;
      bedriftUtloperAt?: Date | string | null;
    };
    const kontekst: SesjonKontekst | null = erBedriftVinduAktiv({
      kontekst: sesjon.kontekst,
      verifisertAt: sesjon.bedriftVerifisertAt,
      utloperAt: sesjon.bedriftUtloperAt,
    })
      ? 'bedrift'
      : 'privat';
    try {
      const role = await assertMember(base.db, data.user.id, tenantId);
      if (authSone && !rolleTillattISone(role, authSone)) {
        return medPort({ hostTenantId });
      }
      const passkeyOk =
        authSone === 'platform' ? await brukerHarPasskey(base.db, data.user.id) : false;
      const profil = await lesJobbOgMekaniker(base.db, tenantId, data.user.id);
      return medPort({
        userId: data.user.id,
        tenantId,
        role,
        passkeyOk,
        kontekst,
        hostTenantId,
        ...profil,
      });
    } catch {
      const [kunde] = await withTenant(base.db, tenantId, (tx) =>
        tx
          .select({ id: schema.customers.id })
          .from(schema.customers)
          .where(
            and(eq(schema.customers.tenantId, tenantId), eq(schema.customers.userId, data.user.id)),
          )
          .limit(1),
      ).catch(() => [null]);
      if (kunde) {
        return medPort({
          userId: data.user.id,
          tenantId,
          role: 'customer',
          kontekst: 'privat',
          hostTenantId,
        });
      }
      return medPort({ userId: data.user.id, hostTenantId });
    }
  } catch (error) {
    // TOTP er valgfri. TWO_FACTOR_REQUIRED tømmer ikke tRPC/REST.
    if (error instanceof TwoFactorRequiredError) return medPort();
    return medPort();
  }
}
