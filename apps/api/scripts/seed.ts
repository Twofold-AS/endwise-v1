import { randomUUID } from 'node:crypto';
import { createAuth, createTenant } from '@endwise/auth';
import { and, createDb, eq, schema } from '@endwise/db';

/**
 * DEV-SEED — demo-kontoer + tenant A-data. IKKE for produksjon.
 *
 * Kjør: `pnpm db:seed` (krever Docker-DB oppe: `pnpm db:up`).
 * Kjører som eier (DATABASE_URL) → RLS er usynlig, så vi kan skrive på tvers.
 * Demo-kontoene har e-post/passord + verifisert e-post + 2FA AV (dev-only).
 * Produksjonsflyten (OTP + obligatorisk e-post-2FA) er uendret.
 */

if (process.env.NODE_ENV === 'production') {
  console.error('db:seed er dev-only. Avbryter i produksjon.');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    'DATABASE_URL mangler (owner). Opprett .env (cp .env.example .env), start DB med `pnpm db:up`, kjør `pnpm db:setup`, deretter `pnpm db:seed`.',
  );
  process.exit(1);
}

const PASSWORD = 'endwise-demo-1';
const db = createDb(url);
const auth = createAuth(db);

async function ensureUser(email: string, name: string): Promise<string> {
  try {
    await auth.api.signUpEmail({ body: { email, password: PASSWORD, name } });
  } catch {
    // finnes trolig fra før — hentes under.
  }
  const [u] = await db.select().from(schema.user).where(eq(schema.user.email, email));
  if (!u) throw new Error(`Klarte ikke opprette/hente bruker ${email}`);
  await db
    .update(schema.user)
    .set({ emailVerified: true, twoFactorEnabled: false })
    .where(eq(schema.user.id, u.id));
  return u.id;
}

async function ensureTenant(
  name: string,
  slug: string,
  ownerUserId: string,
  plan: string,
  modules: string[],
): Promise<string> {
  const [existing] = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, slug));
  if (existing) return existing.id;
  const { tenantId } = await createTenant(auth, db, {
    name,
    slug,
    ownerUserId,
    plan,
    modules,
  });
  return tenantId;
}

async function setMemberRole(orgId: string, userId: string, role: string): Promise<void> {
  await db
    .delete(schema.member)
    .where(and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, userId)));
  await db.insert(schema.member).values({
    id: randomUUID(),
    organizationId: orgId,
    userId,
    role,
    createdAt: new Date(),
  });
}

async function main() {
  console.info('Seeder demo-kontoer …');

  const endwiseAdmin = await ensureUser('mikkis@twofold.no', 'Mikkis (Endwise-admin)');
  const adminA = await ensureUser('admin-a@verksted.test', 'Anna Admin (Verksted A)');
  const staffA = await ensureUser('ansatt-a@verksted.test', 'Stein Ansatt (Verksted A)');
  const mekA = await ensureUser('mekaniker-a@verksted.test', 'Ola Mekaniker (Verksted A)');
  const adminB = await ensureUser('admin-b@verksted.test', 'Bjørn Admin (Verksted B)');

  const tenantA = await ensureTenant('Verksted A', 'verksted-a', adminA, 'pluss', [
    'booking',
    'messages',
    'vegvesen',
    'quick',
    'resend',
    'twilio',
  ]);
  const tenantB = await ensureTenant('Verksted B', 'verksted-b', adminB, 'basis', [
    'booking',
    'messages',
    'vegvesen',
  ]);

  // Roller (createTenant satte owner-medlemskap; vi overstyrer eksplisitt).
  await setMemberRole(tenantA, adminA, 'dealer_admin');
  await setMemberRole(tenantA, staffA, 'dealer_staff');
  await setMemberRole(tenantA, mekA, 'dealer_staff'); // mekaniker = staff + profil
  await setMemberRole(tenantA, endwiseAdmin, 'endwise_admin');
  await setMemberRole(tenantB, adminB, 'dealer_admin');

  // Mekaniker-profil (kobler mekaniker-brukeren til tenant A).
  let [mech] = await db
    .select()
    .from(schema.mechanics)
    .where(and(eq(schema.mechanics.tenantId, tenantA), eq(schema.mechanics.userId, mekA)));
  if (!mech) {
    [mech] = await db
      .insert(schema.mechanics)
      .values({ tenantId: tenantA, userId: mekA, name: 'Ola Mekaniker', capacity: 1 })
      .returning();
  }

  // Ferdigheter/sertifiseringer (én utløper snart → varsel i Min dag).
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const later = new Date();
  later.setFullYear(later.getFullYear() + 2);
  for (const s of [
    { skillKey: 'mc-service', level: 5, certificationExpiresAt: later.toISOString().slice(0, 10) },
    { skillKey: 'el-sykkel', level: 3, certificationExpiresAt: soon.toISOString().slice(0, 10) },
  ]) {
    await db
      .insert(schema.mechanicSkills)
      .values({ tenantId: tenantA, mechanicId: mech.id, ...s })
      .onConflictDoNothing();
  }

  // Kunder + kjøretøy.
  const [kunde] = await db
    .insert(schema.customers)
    .values({ tenantId: tenantA, name: 'Kari Kunde', phone: '+4790000000' })
    .returning();
  const [bil] = await db
    .insert(schema.vehicles)
    .values({ tenantId: tenantA, type: 'mc', regNumber: 'AB12345', customerId: kunde.id })
    .returning();

  // Tjeneste + versjon (bookinger peker på versjonen).
  const [svc] = await db
    .insert(schema.services)
    .values({ tenantId: tenantA, name: 'EU-kontroll MC', vehicleType: 'mc' })
    .returning();
  const [ver] = await db
    .insert(schema.serviceVersions)
    .values({
      tenantId: tenantA,
      serviceId: svc.id,
      version: 1,
      skills: ['mc-service'],
      durationMinutes: 90,
      priceMinor: 149000,
    })
    .returning();

  // Dagens bookinger til mekanikeren.
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const startsAt = new Date(today);
    startsAt.setHours(9 + i * 2);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + 90);
    await db.insert(schema.bookings).values({
      tenantId: tenantA,
      customerId: kunde.id,
      vehicleId: bil.id,
      serviceVersionId: ver.id,
      mechanicId: mech.id,
      status: i === 0 ? 'in_progress' : 'confirmed',
      startsAt,
      endsAt,
      source: 'seed',
      notes: i === 1 ? 'Kunden nevnte ulyd i bremsene' : null,
    });
  }

  console.info('\n✅ Seed ferdig. Demo-kontoer (passord: %s):', PASSWORD);
  console.info('  endwise_admin  mikkis@twofold.no        (Verksted A)');
  console.info('  dealer_admin   admin-a@verksted.test    (Verksted A)');
  console.info('  dealer_staff   ansatt-a@verksted.test   (Verksted A)');
  console.info('  mekaniker      mekaniker-a@verksted.test (Verksted A)');
  console.info('  dealer_admin   admin-b@verksted.test    (Verksted B)');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
