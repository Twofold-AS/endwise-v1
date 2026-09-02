import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { APP_TENANT_SETTING } from './rls.ts';
import * as schema from './schema/index.ts';

export type Database = ReturnType<typeof createDb>;

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export type PgConnectionConfig = {
  connectionString: string;
  ssl?: { rejectUnauthorized: false };
};

export type PgPoolConfig = PgConnectionConfig & {
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
};

function hostnameFromConnectionString(connectionString: string): string | null {
  try {
    const host = new URL(connectionString).hostname.toLowerCase();
    return host.replace(/^\[(.*)\]$/, '$1');
  } catch {
    return null;
  }
}

function portFromConnectionString(connectionString: string): string {
  try {
    return new URL(connectionString).port;
  } catch {
    return '';
  }
}

/**
 * node-postgres overskriver `ssl` når connection-stringen inneholder
 * `sslmode` / `sslrootcert` / `sslcert` / `sslkey`. Fjern dem slik at
 * `{ rejectUnauthorized: false }` faktisk gjelder (Scaleway-ca på Vercel).
 */
function withoutPgSslQueryParams(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslrootcert');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    return url.toString();
  } catch {
    return connectionString;
  }
}

/**
 * TLS mot Scaleway Managed PostgreSQL.
 * Scaleway public TLS bruker egen ca. `sslmode=require` i URL-en behandles
 * av node-postgres som verify-full, og Node kaster
 * `DEPTH_ZERO_SELF_SIGNED_CERT` fra Vercel. Ingen Scaleway-ca i repoet.
 * Fjern host: TLS på, uten ca-sjekk. Localhost/Docker: urørt — Docker-Postgres
 * har typisk ikke TLS, og workarounen ville krevd SSL mot 127.0.0.1.
 * PgBouncer :6432: ingen `ssl`-nøkkel. Containeren lytter uten klient-TLS
 * (`server_tls` gjelder bare bouncer → Postgres). node-pg med
 * `{ rejectUnauthorized: false }` gir «The server does not support SSL
 * connections», og `sslmode=disable` i URL-en hjelper ikke fordi
 * `withoutPgSslQueryParams` fjerner den før `ssl` settes.
 * TLS skrus aldri av mot Managed Postgres (`ssl: false`).
 */
export function pgConnectionConfig(connectionString: string): PgConnectionConfig {
  const host = hostnameFromConnectionString(connectionString);
  if (host !== null && LOCAL_DB_HOSTS.has(host)) {
    return { connectionString };
  }

  const cleaned = withoutPgSslQueryParams(connectionString);
  if (portFromConnectionString(connectionString) === '6432') {
    return { connectionString: cleaned };
  }

  return {
    connectionString: cleaned,
    ssl: { rejectUnauthorized: false },
  };
}

/**
 * drizzle-kit 0.31: `url` + `ssl` er ikke lov sammen (kun `url`, eller
 * host/user/database + `ssl`). Scaleway-ca krever rejectUnauthorized:false,
 * ellers blir `drizzle-kit migrate` exit 1 med bare SSL-advarsler.
 */
export function drizzleKitPgCredentials(connectionString: string) {
  const pg = pgConnectionConfig(connectionString);
  const url = new URL(pg.connectionString);
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres';
  return {
    host,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ...(pg.ssl ? { ssl: pg.ssl } : {}),
  };
}

/**
 * Driver: node-postgres (`pg`) over vanlig TCP.
 * Vanlig TCP fungerer mot både Docker-basen vi utvikler mot og Scaleway
 * Managed PostgreSQL i produksjon (besluttet ). Serverless-drivere
 * som snakker WebSocket til en leverandørs egen proxy er bevisst unngått: de
 * kan ikke koble til en vanlig Postgres, og de ville låst oss til én leverandør.
 * Pooling: låsing bruker `pg_advisory_xact_lock` (transaksjons-skopet), ikke
 * session-skopet. Gjennom vår PgBouncer (transaction-mode) gjenbrukes
 * forbindelser på tvers av forespørsler, og en session-lås ville fulgt med
 * neste låner. Transaksjonslåsen slippes av commit/rollback uansett.
 * Vercel: hver isolate fikk default max=10 og tømte max_connections (53300
 * på magic-link/sign-out mot delt preview/prod-DB). Direkte fjern host
 * (`:5432` / `:19800`): max 1. PgBouncer `:6432` (transaction-mode): max 5
 * — pooleren tåler flere klienter per isolate (`max_client_conn` 1000,
 * `default_pool_size` 20). Localhost: max 5. Ingen WebSocket/serverless-driver.
 */
export function pgPoolConfig(connectionString: string): PgPoolConfig {
  const host = hostnameFromConnectionString(connectionString);
  const remote = host !== null && !LOCAL_DB_HOSTS.has(host);
  const pgbouncer = portFromConnectionString(connectionString) === '6432';
  return {
    ...pgConnectionConfig(connectionString),
    max: remote && !pgbouncer ? 1 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  };
}

/**
 * Runtime (web / tRPC / auth / cron / magic-link): app-rollen, RLS på.
 * Prod/preview peker `APP_DATABASE_URL` på vår PgBouncer `:6432` når
 * containeren er oppe. Mangler den lokalt, faller vi tilbake til
 * `DATABASE_URL` (Docker har begge). Tom streng teller som mangler.
 * Aldri eier-rollen alene i prod — da er RLS av.
 */
export function appDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.APP_DATABASE_URL || env.DATABASE_URL;
  if (!url) {
    throw new Error('APP_DATABASE_URL (eller DATABASE_URL) mangler');
  }
  return url;
}

/**
 * Eier, direkte TCP `:5432`. Migrasjoner, drizzle-kit, grants, stream LISTEN.
 * Aldri gjennom pooleren — LISTEN og DDL er session-tilstand.
 */
export function ownerDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL mangler');
  return url;
}

/**
 * Driver: node-postgres (`pg`) over vanlig TCP.
 * `prepare: false` — transaction-pooler (PgBouncer) tåler ikke named PREPARE
 * på tvers av klienter. drizzle-orm 0.45 `DrizzleConfig` typer ikke feltet;
 * node-pg navngir bare PREPARE når `QueryConfig.name` er satt. Vi bruker
 * ikke named prepare-API. Flagget er eksplisitt for pooleren / nyere drizzle.
 */
export function createDb(connectionString: string) {
  const pool = new Pool(pgPoolConfig(connectionString));
  return drizzle({
    client: pool,
    schema,
    casing: 'snake_case',
    prepare: false,
  } as { client: Pool; schema: typeof schema; casing: 'snake_case' });
}

/**
 * Eneste lovlige inngang til tenant-data.
 * Setter `app.tenant_id` lokalt i transaksjonen, slik at RLS-policyene filtrerer.
 * Aldri `SET` uten `LOCAL`/`is_local=true`: det ville lekket tenant-konteksten
 * videre til neste låner av pool-forbindelsen.
 * Merk: kall alltid assertMember (@endwise/auth) før denne. RLS stoler på
 * `app.tenant_id` — den verifiserer ikke at brukeren har lov til å be om den.
 */
export async function withTenant<T>(
  db: Database,
  tenantId: string,
  fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config(${APP_TENANT_SETTING}, ${tenantId}, true)`);
    return fn(tx);
  });
}

/**
 * Kryss-tenant lesning for Endwise-admin. **Bruk med vett.**
 * Setter `app.platform_admin` transaksjons-lokalt, som slår på den
 * Select-only-policyen `tenants_platform_admin_read`. Den finnes fordi
 * `tenants`-policyen ellers gir **null rader** utenfor en tenant-kontekst — og
 * Endwise-admin må kunne se forhandlerlista.
 * Tre regler, og de er ikke forhandlingsbare:
 * 1. Kalles kun fra `endwiseAdminProcedure`. Rollen er sperren; dette er
 * bare mekanismen som lar den gjøre jobben uten at RLS skrus av.
 * 2. Policyen er `for: 'select'` uten `withCheck`. Skriving på tvers av
 * tenants er fortsatt umulig, også for oss.
 * 3. For authenticated åpner denne guc-en SELECT på `tenants` og på
 * `dealer_admin`-tråder (F5-11: threads / messages / thread_participants).
 * Ikke customer_dealer, ikke mechanic_dealer, og ingen skriving.
 * `slett_forhandler` sine to public-policyer krever `platform_admin`
 * og `app.slett_tenant_id` **og** at kalleren ikke er
 * `authenticated` — app-trafikk som bare setter guc-er åpnes ikke.
 * Alternativet — å koble til som DB-eier for akkurat denne spørringen — ville
 * omgått RLS fullstendig og gjort den ene lesestien til den ene uten isolasjon.
 * Dette er det smalest mulige hullet som løser problemet.
 */
export async function withPlatformAdmin<T>(
  db: Database,
  fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
    return fn(tx);
  });
}

/**
 * Read-only inspeksjon av ÉN forhandler. Brukes av Se verkstedet.
 * Setter `app.platform_inspect` til forhandlerens UUID og
 * `SET TRANSACTION READ ONLY`. Kalles kun fra `endwiseInspectProcedure`.
 * Ikke tenant-guc-en — det ville åpnet force RLS for hele tenanten
 * (kunder e-post/telefon, alle tråder, integrasjonstokens).
 * Ikke impersonering. Sesjonens aktive org forblir plattformen.
 */
export async function withPlatformInspect<T>(
  db: Database,
  tenantId: string,
  fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set transaction read only`);
    await tx.execute(sql`select set_config('app.platform_inspect', ${tenantId}, true)`);
    return fn(tx);
  });
}
