import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * F5-28 ③ — «Er RLS i det hele tatt PÅ for den rollen appen bruker?»
 *
 * De andre isolasjonstestene angriper policyene. Denne testen angriper
 * FORUTSETNINGEN for dem: at runtime-forbindelsen faktisk er underlagt RLS.
 *
 * Det er en reell fare, ikke en teoretisk. `enable row level security` gjelder
 * for alle andre enn TABELLEIEREN. Peker `APP_DATABASE_URL` på eieren — eller
 * er rollen superuser eller `bypassrls` — er hele tenant-isolasjonen borte, og
 * **alle de andre testene blir grønne likevel**. Det ville vært den farligste
 * grønne testen i repoet.
 *
 * Derfor sjekker denne fire ting, og alle fire må holde:
 *   ① runtime-rollen eier ingen RLS-tabell
 *   ② runtime-rollen er hverken superuser eller bypassrls
 *   ③ hver RLS-tabell har FORCE (så ① ikke lenger er nok til å ødelegge noe)
 *   ④ RLS er faktisk påslått på tabellene vi tror den er påslått på
 *
 * Krever `pnpm db:setup` (migrasjoner + grants). Uten DB skippes testen — som
 * alle de andre DB-testene.
 */
const APP_URL = process.env.APP_DATABASE_URL;
const OWNER_URL = process.env.DATABASE_URL;
const describeDb = APP_URL && OWNER_URL ? describe : describe.skip;

/** Tabeller som SKAL ha RLS. Ikke uttømmende — en stikkprøve med tenner. */
const MÅ_HA_RLS = [
  'tenants',
  'tenant_modules',
  'bookings',
  'customers',
  'vehicles',
  'mechanics',
  'messages',
  'threads',
  'feature_flag_overrides',
];

describeDb('FORCE RLS + runtime-rollen', () => {
  let app: Database;

  beforeAll(() => {
    app = createDb(APP_URL as string);
  });

  it('① runtime-brukeren eier INGEN tabell med RLS', async () => {
    const res = await app.execute(sql`
      select c.relname as tabell
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relrowsecurity
        and pg_get_userbyid(c.relowner) = current_user
    `);
    const eide = res.rows.map((r) => r.tabell);

    // Meldingen er viktigere enn assertionen: den som ser denne testen ryke
    // skal ikke måtte gjette hva som er galt.
    expect(
      eide,
      `APP_DATABASE_URL peker på en bruker som EIER ${eide.length} RLS-tabell(er). ` +
        'Uten FORCE ville RLS vært usynlig for den. Bruk endwise_app, ikke eieren.',
    ).toEqual([]);
  });

  it('② runtime-rollen er hverken superuser eller bypassrls', async () => {
    const res = await app.execute(sql`
      select rolsuper, rolbypassrls from pg_roles where rolname = current_user
    `);
    const rolle = res.rows[0] as { rolsuper: boolean; rolbypassrls: boolean } | undefined;
    expect(rolle, 'fant ikke current_user i pg_roles').toBeDefined();
    expect(rolle?.rolsuper, 'runtime-rollen er SUPERUSER — RLS gjelder ikke').toBe(false);
    expect(rolle?.rolbypassrls, 'runtime-rollen har BYPASSRLS').toBe(false);
  });

  it('③ hver tabell med RLS har også FORCE', async () => {
    const res = await app.execute(sql`
      select c.relname as tabell
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relrowsecurity
        and not c.relforcerowsecurity
    `);
    const uten = res.rows.map((r) => r.tabell);
    expect(
      uten,
      `Disse mangler FORCE ROW LEVEL SECURITY: ${uten.join(', ')}. Kjør \`pnpm db:grants\`.`,
    ).toEqual([]);
  });

  it('④ kjernetabellene har RLS påslått i det hele tatt', async () => {
    const res = await app.execute(sql`
      select c.relname as tabell, c.relrowsecurity as rls
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `);
    const kart = new Map(res.rows.map((r) => [r.tabell as string, r.rls as boolean]));
    for (const t of MÅ_HA_RLS) {
      expect(kart.get(t), `tabellen ${t} finnes ikke`).toBeDefined();
      expect(kart.get(t), `${t} mangler RLS`).toBe(true);
    }
  });
});
