import { randomUUID } from 'node:crypto';
import { createAuth, createTenant } from '@endwise/auth';
import { and, createDb, eq, isNull, schema } from '@endwise/db';
import { createInvitasjonsmodul } from '@endwise/modules/invitasjoner';

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
  if (existing) {
    // Idempotent: eldre seedede tenants ble opprettet før `kind` fantes og
    // står som 'live'. Da ville dev-mode-gaten (F5-28) avvist dem — helt
    // korrekt, men ubrukelig lokalt.
    if (existing.kind !== 'demo') {
      await db
        .update(schema.tenants)
        .set({ kind: 'demo' })
        .where(eq(schema.tenants.id, existing.id));
    }
    // F0-16: synk TILLEGGENE idempotent. Uten dette beholder eldre seedede
    // tenants modullista fra før basis/tillegg-skillet, og gaten låser flater
    // demoen skal vise.
    for (const moduleKey of modules) {
      await db
        .insert(schema.tenantModules)
        .values({ tenantId: existing.id, moduleKey, plan, enabled: true })
        .onConflictDoUpdate({
          target: [schema.tenantModules.tenantId, schema.tenantModules.moduleKey],
          set: { enabled: true, plan },
        });
    }
    return existing.id;
  }
  const { tenantId } = await createTenant(auth, db, {
    name,
    slug,
    ownerUserId,
    plan,
    modules,
    // ⛔ DEV-SEEDEN OPPRETTER KUN DEMO-TENANTS. Scriptet nekter å kjøre i
    // produksjon (sjekken øverst), så dette kan ikke lekke ut. «Verksted A» og
    // «Verksted B» ER oppdiktede verksteder — å merke dem 'live' ville vært
    // feil på egne premisser, og det er nettopp merkingen dev-mode-gaten
    // krever som sitt tredje lag.
    kind: 'demo',
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
  // F1-14 — én per jobbfunksjon, så landingsvisningen kan testes for hånd.
  const selgerA = await ensureUser('selger-a@verksted.test', 'Silje Selger (Verksted A)');
  const supportA = await ensureUser('support-a@verksted.test', 'Sara Support (Verksted A)');

  /**
   * ⚠️ F0-16: kun TILLEGG her. 'booking' og 'messages' er fjernet — de er basis
   * og har ingen gate, så en rad for dem ville antydet at de kunne tas bort.
   *
   * Verksted A får alt, så hele demoen (AI-verktøy, Quick, widget, rapporter)
   * faktisk lar seg klikke gjennom lokalt.
   */
  const tenantA = await ensureTenant('Verksted A', 'verksted-a', adminA, 'proff', [
    'vegvesen',
    'quick',
    'resend',
    'twilio',
    'widget',
    'ai-support',
    'ai-diagnose',
    'ai-providers',
    'nyhetsbrev',
    'analyse-pro',
  ]);
  // Verksted B står med vilje på BASIS — den er kontrasten: her skal AI-verktøy
  // og Quick faktisk være låst, så gaten kan sees virke i UI-et.
  const tenantB = await ensureTenant('Verksted B', 'verksted-b', adminB, 'basis', ['vegvesen']);

  // Roller (createTenant satte owner-medlemskap; vi overstyrer eksplisitt).
  await setMemberRole(tenantA, adminA, 'dealer_admin');
  await setMemberRole(tenantA, staffA, 'dealer_staff');
  await setMemberRole(tenantA, mekA, 'dealer_staff'); // mekaniker = staff + profil
  // ⛔ Selger og support er BEGGE dealer_staff — nøyaktig samme tilgang.
  // Forskjellen ligger i jobbfunksjonen under, ikke i rettigheter.
  await setMemberRole(tenantA, selgerA, 'dealer_staff');
  await setMemberRole(tenantA, supportA, 'dealer_staff');
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

  /* ══ KUNDER, KJØRETØY OG UKAS BOOKINGER ═══════════════════════════════
   *
   * ⚠️ **Skrevet om 08.08.2026 — og grunnen er verdt å huske.** Blokken her
   * var IKKE idempotent: hver `pnpm db:seed` la inn en ny «Kari Kunde», et nytt
   * kjøretøy, en ny tjeneste og tre nye bookinger. Etter noen kjøringer sto
   * Verksted A med åtte identiske kunder og 25 bookinger på to datoer — data
   * som verken lignet et verksted eller lot seg teste mot. Nå slås alt opp før
   * det skrives, og bookingene bruker `idempotencyKey` (unik per tenant), som
   * er samme mekanisme widgeten bruker mot dobbeltklikk.
   *
   * Dataene er valgt for å STRESSE flatene, ikke for å pynte dem:
   *   · navn som faktisk kan søkes fra hverandre (ikke åtte Kari)
   *   · en EU-frist som er GÅTT UT og en som går ut snart → rød og gul i UI
   *   · en båt uten regnr → kolonnen må tåle «—», ikke gjemme raden
   *   · en kunde med Better-Auth-bruker → navneoppslaget i innboksen kan sees
   *   · bookinger på BEGGE mekanikere gjennom hele uka → kalenderen får noe å
   *     legge ved siden av hverandre, ikke én kloss i et tomt rutenett
   */
  type KundeSpek = {
    navn: string;
    telefon: string;
    epost: string | null;
    kilde: 'endwise' | 'quick';
    /** E-post på en Better-Auth-konto som skal kobles til kunden («Min side»). */
    innlogging?: string;
  };

  const KUNDER: KundeSpek[] = [
    {
      navn: 'Kari Nordmann',
      telefon: '+4790000001',
      epost: 'kari@kunde.test',
      kilde: 'endwise',
      innlogging: 'kunde-kari@kunde.test',
    },
    {
      navn: 'Ola Hansen',
      telefon: '+4790000002',
      epost: 'ola.hansen@kunde.test',
      kilde: 'endwise',
    },
    { navn: 'Ingrid Berg', telefon: '+4790000003', epost: 'ingrid@kunde.test', kilde: 'quick' },
    { navn: 'Per Solheim', telefon: '+4790000004', epost: 'per@kunde.test', kilde: 'endwise' },
    { navn: 'Silje Aas', telefon: '+4790000005', epost: 'silje@kunde.test', kilde: 'quick' },
    { navn: 'Jonas Lie', telefon: '+4790000006', epost: 'jonas@kunde.test', kilde: 'endwise' },
    // Uten e-post med vilje: kundekortet skal tåle et tomt felt uten å se ødelagt ut.
    { navn: 'Marte Vik', telefon: '+4790000007', epost: null, kilde: 'endwise' },
    { navn: 'Trond Bakke', telefon: '+4790000008', epost: 'trond@kunde.test', kilde: 'quick' },
  ];

  /** Dato n dager fra i dag, som `YYYY-MM-DD` (EU-frist er en `date`, ikke et tidspunkt). */
  function omDager(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  type KjoretoySpek = {
    eier: string;
    type: 'mc' | 'boat' | 'atv';
    reg: string | null;
    merke: string;
    modell: string;
    aar: string;
    vin: string;
    /** Dager til EU-frist. Negativ = gått ut. Null = ingen frist registrert. */
    euOm: number | null;
  };

  const KJORETOY: KjoretoySpek[] = [
    {
      eier: 'Kari Nordmann',
      type: 'mc',
      reg: 'EK12345',
      merke: 'Yamaha',
      modell: 'MT-07',
      aar: '2021',
      vin: 'JYARM33E9MA012345',
      euOm: 38,
    },
    {
      eier: 'Kari Nordmann',
      type: 'atv',
      reg: 'EK54321',
      merke: 'Polaris',
      modell: 'Sportsman 570',
      aar: '2019',
      vin: '4XASEA507KA123456',
      euOm: null,
    },
    // Gått ut: skal vises RØD i lista og på kortet.
    {
      eier: 'Ola Hansen',
      type: 'mc',
      reg: 'EL22110',
      merke: 'Honda',
      modell: 'CB500F',
      aar: '2018',
      vin: 'MLHPC4410J5000123',
      euOm: -21,
    },
    {
      eier: 'Ingrid Berg',
      type: 'mc',
      reg: 'EM33221',
      merke: 'BMW',
      modell: 'R 1250 GS',
      aar: '2022',
      vin: 'WB10J1301NZ654321',
      euOm: 210,
    },
    // Båt uten regnr — det vanlige tilfellet, ikke et unntak å skjule.
    {
      eier: 'Per Solheim',
      type: 'boat',
      reg: null,
      merke: 'Yamarin',
      modell: '63 BR',
      aar: '2020',
      vin: 'FI-YAM63BR20A0771',
      euOm: null,
    },
    {
      eier: 'Silje Aas',
      type: 'mc',
      reg: 'EN44332',
      merke: 'Ducati',
      modell: 'Monster 937',
      aar: '2023',
      vin: 'ZDM14BUW6PB009911',
      euOm: 300,
    },
    {
      eier: 'Jonas Lie',
      type: 'mc',
      reg: 'EO55443',
      merke: 'KTM',
      modell: '390 Duke',
      aar: '2017',
      vin: 'VBKJTJ408HM334455',
      euOm: 12,
    },
    {
      eier: 'Marte Vik',
      type: 'atv',
      reg: 'EP66554',
      merke: 'Can-Am',
      modell: 'Outlander 650',
      aar: '2021',
      vin: '3JBLMAP24MJ998877',
      euOm: null,
    },
    {
      eier: 'Trond Bakke',
      type: 'mc',
      reg: 'EQ77665',
      merke: 'Harley-Davidson',
      modell: 'Iron 883',
      aar: '2016',
      vin: '1HD4LE212GC443322',
      euOm: -60,
    },
    {
      eier: 'Trond Bakke',
      type: 'boat',
      reg: null,
      merke: 'Suzuki',
      modell: 'DF115',
      aar: '2015',
      vin: 'SZ-DF115-2015-4471',
      euOm: null,
    },
  ];

  const TJENESTER = [
    { navn: 'EU-kontroll MC', type: 'mc' as const, min: 60, pris: 149000, skills: ['mc-service'] },
    {
      navn: 'Liten service MC',
      type: 'mc' as const,
      min: 90,
      pris: 249000,
      skills: ['mc-service'],
    },
    {
      navn: 'Stor service MC',
      type: 'mc' as const,
      min: 180,
      pris: 549000,
      skills: ['mc-service'],
    },
    { navn: 'Dekkskift', type: 'mc' as const, min: 45, pris: 89000, skills: [] },
    { navn: 'Båtmotor-service', type: 'boat' as const, min: 120, pris: 395000, skills: [] },
  ];

  // ── Kunder ────────────────────────────────────────────────────────────
  const kundeIder: Record<string, string> = {};
  for (const k of KUNDER) {
    const [finnes] = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.tenantId, tenantA), eq(schema.customers.name, k.navn)));
    if (finnes) {
      kundeIder[k.navn] = finnes.id;
      continue;
    }
    // Kun ÉN demo-kunde får en innlogging. Det holder for å se navneoppslaget
    // i innboksen virke, og hver ekstra konto er en ekte bruker i basen.
    const userId = k.innlogging ? await ensureUser(k.innlogging, k.navn) : null;
    const [ny] = await db
      .insert(schema.customers)
      .values({
        tenantId: tenantA,
        name: k.navn,
        phone: k.telefon,
        email: k.epost,
        source: k.kilde,
        userId,
      })
      .returning();
    kundeIder[k.navn] = ny.id;
  }

  // ── Kjøretøy ──────────────────────────────────────────────────────────
  const kjoretoyIder: Record<string, string> = {};
  for (const v of KJORETOY) {
    const noekkel = v.reg ?? v.vin;
    const [finnes] = await db
      .select()
      .from(schema.vehicles)
      .where(and(eq(schema.vehicles.tenantId, tenantA), eq(schema.vehicles.vin, v.vin)));
    if (finnes) {
      kjoretoyIder[noekkel] = finnes.id;
      continue;
    }
    const [ny] = await db
      .insert(schema.vehicles)
      .values({
        tenantId: tenantA,
        customerId: kundeIder[v.eier],
        type: v.type,
        regNumber: v.reg,
        make: v.merke,
        model: v.modell,
        modelYear: v.aar,
        vin: v.vin,
        inspectionDue: v.euOm === null ? null : omDager(v.euOm),
        // Speilet «i går»: kjøretøykortet viser når oppslaget sist ble gjort,
        // og et felt uten alder er en påstand uten dato.
        lookupAt: new Date(Date.now() - 24 * 3600 * 1000),
      })
      .returning();
    kjoretoyIder[noekkel] = ny.id;
  }

  // ── Tjenester (bookinger peker på VERSJONEN, ikke tjenesten) ──────────
  const versjonIder: Record<string, string> = {};
  for (const t of TJENESTER) {
    let [svc] = await db
      .select()
      .from(schema.services)
      .where(and(eq(schema.services.tenantId, tenantA), eq(schema.services.name, t.navn)));
    if (!svc) {
      [svc] = await db
        .insert(schema.services)
        .values({ tenantId: tenantA, name: t.navn, vehicleType: t.type })
        .returning();
    }
    let [ver] = await db
      .select()
      .from(schema.serviceVersions)
      .where(eq(schema.serviceVersions.serviceId, svc.id));
    if (!ver) {
      [ver] = await db
        .insert(schema.serviceVersions)
        .values({
          tenantId: tenantA,
          serviceId: svc.id,
          version: 1,
          skills: t.skills,
          durationMinutes: t.min,
          priceMinor: t.pris,
        })
        .returning();
    }
    versjonIder[t.navn] = ver.id;
  }

  /* ── Ukas bookinger ────────────────────────────────────────────────────
   *
   * Lagt ut fra MANDAG i inneværende uke, ikke fra faste datoer: seeden skal
   * gi en kalender med innhold uansett når den kjøres. Begge mekanikerne får
   * jobber som overlapper i tid — det er nettopp da per-mekaniker-kolonnene
   * i dagsvisningen har en jobb å gjøre.
   */
  const mandag = new Date();
  mandag.setHours(0, 0, 0, 0);
  // getDay(): 0 = søndag. Norsk uke starter mandag.
  mandag.setDate(mandag.getDate() - ((mandag.getDay() + 6) % 7));

  /** `mek: 0` = Ola Mekaniker, `1` = hovedbrukerens demo-mekaniker. */
  const UKE: {
    dag: number;
    time: number;
    minutt: number;
    mek: 0 | 1;
    tjeneste: string;
    kjoretoy: string;
    status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    notat?: string;
  }[] = [
    {
      dag: 0,
      time: 8,
      minutt: 0,
      mek: 0,
      tjeneste: 'EU-kontroll MC',
      kjoretoy: 'EK12345',
      status: 'completed',
    },
    {
      dag: 0,
      time: 9,
      minutt: 30,
      mek: 1,
      tjeneste: 'Dekkskift',
      kjoretoy: 'EN44332',
      status: 'completed',
    },
    {
      dag: 0,
      time: 11,
      minutt: 0,
      mek: 0,
      tjeneste: 'Liten service MC',
      kjoretoy: 'EL22110',
      status: 'completed',
      notat: 'Kunden nevnte ulyd i bremsene',
    },
    {
      dag: 0,
      time: 13,
      minutt: 0,
      mek: 1,
      tjeneste: 'Stor service MC',
      kjoretoy: 'EM33221',
      status: 'completed',
    },
    {
      dag: 1,
      time: 8,
      minutt: 0,
      mek: 0,
      tjeneste: 'Stor service MC',
      kjoretoy: 'EQ77665',
      status: 'completed',
      notat: 'EU-frist gikk ut i forrige måned — kunden varslet',
    },
    {
      dag: 1,
      time: 10,
      minutt: 0,
      mek: 1,
      tjeneste: 'EU-kontroll MC',
      kjoretoy: 'EO55443',
      status: 'no_show',
    },
    {
      dag: 1,
      time: 12,
      minutt: 30,
      mek: 0,
      tjeneste: 'Dekkskift',
      kjoretoy: 'EN44332',
      status: 'completed',
    },
    {
      dag: 2,
      time: 8,
      minutt: 30,
      mek: 0,
      tjeneste: 'Liten service MC',
      kjoretoy: 'EK12345',
      status: 'in_progress',
    },
    {
      dag: 2,
      time: 9,
      minutt: 0,
      mek: 1,
      tjeneste: 'Båtmotor-service',
      kjoretoy: 'FI-YAM63BR20A0771',
      status: 'in_progress',
      notat: 'Båten står på henger utenfor',
    },
    {
      dag: 2,
      time: 11,
      minutt: 0,
      mek: 0,
      tjeneste: 'EU-kontroll MC',
      kjoretoy: 'EM33221',
      status: 'confirmed',
    },
    {
      dag: 2,
      time: 13,
      minutt: 0,
      mek: 1,
      tjeneste: 'Dekkskift',
      kjoretoy: 'EO55443',
      status: 'confirmed',
    },
    {
      dag: 2,
      time: 14,
      minutt: 30,
      mek: 0,
      tjeneste: 'Stor service MC',
      kjoretoy: 'EL22110',
      status: 'confirmed',
    },
    {
      dag: 3,
      time: 8,
      minutt: 0,
      mek: 0,
      tjeneste: 'EU-kontroll MC',
      kjoretoy: 'EQ77665',
      status: 'confirmed',
      notat: 'Må ha ny EU før den kan kjøres lovlig',
    },
    {
      dag: 3,
      time: 9,
      minutt: 30,
      mek: 1,
      tjeneste: 'Liten service MC',
      kjoretoy: 'EN44332',
      status: 'confirmed',
    },
    {
      dag: 3,
      time: 11,
      minutt: 30,
      mek: 0,
      tjeneste: 'Dekkskift',
      kjoretoy: 'EK12345',
      status: 'confirmed',
    },
    {
      dag: 3,
      time: 13,
      minutt: 0,
      mek: 1,
      tjeneste: 'Båtmotor-service',
      kjoretoy: 'SZ-DF115-2015-4471',
      status: 'confirmed',
    },
    {
      dag: 4,
      time: 8,
      minutt: 30,
      mek: 0,
      tjeneste: 'Stor service MC',
      kjoretoy: 'EM33221',
      status: 'confirmed',
    },
    {
      dag: 4,
      time: 10,
      minutt: 0,
      mek: 1,
      tjeneste: 'EU-kontroll MC',
      kjoretoy: 'EL22110',
      status: 'confirmed',
    },
    {
      dag: 4,
      time: 12,
      minutt: 0,
      mek: 0,
      tjeneste: 'Liten service MC',
      kjoretoy: 'EO55443',
      status: 'cancelled',
      notat: 'Kunden avlyste – reiser bort',
    },
    {
      dag: 4,
      time: 14,
      minutt: 0,
      mek: 1,
      tjeneste: 'Dekkskift',
      kjoretoy: 'EQ77665',
      status: 'confirmed',
    },
  ];

  // Hovedbrukerens mekanikerprofil opprettes lenger ned; her trenger vi den
  // allerede, så den hentes/lages først.
  let [minMekProfil] = await db
    .select()
    .from(schema.mechanics)
    .where(and(eq(schema.mechanics.tenantId, tenantA), eq(schema.mechanics.userId, endwiseAdmin)));
  if (!minMekProfil) {
    [minMekProfil] = await db
      .insert(schema.mechanics)
      .values({
        tenantId: tenantA,
        userId: endwiseAdmin,
        name: 'Mikkis (demo-mekaniker)',
        capacity: 2,
      })
      .returning();
  }
  const mekanikere = [mech, minMekProfil];

  let nyeBookinger = 0;
  for (const [i, b] of UKE.entries()) {
    const startsAt = new Date(mandag);
    startsAt.setDate(mandag.getDate() + b.dag);
    startsAt.setHours(b.time, b.minutt, 0, 0);
    const varighet = TJENESTER.find((t) => t.navn === b.tjeneste)?.min ?? 60;
    const endsAt = new Date(startsAt.getTime() + varighet * 60_000);

    const vehicleId = kjoretoyIder[b.kjoretoy];
    const eier = KJORETOY.find((v) => (v.reg ?? v.vin) === b.kjoretoy)?.eier;

    /**
     * Idempotensnøkkelen bærer UKEN, ikke bare indeksen: kjører du seeden
     * neste uke skal du få neste ukes bookinger, ikke null nye fordi nøklene
     * kolliderte med forrige ukes.
     */
    const key = `seed-${mandag.toISOString().slice(0, 10)}-${i}`;
    const [finnes] = await db
      .select()
      .from(schema.bookings)
      .where(and(eq(schema.bookings.tenantId, tenantA), eq(schema.bookings.idempotencyKey, key)));
    if (finnes) continue;

    await db.insert(schema.bookings).values({
      tenantId: tenantA,
      customerId: eier ? kundeIder[eier] : null,
      vehicleId,
      serviceVersionId: versjonIder[b.tjeneste],
      mechanicId: mekanikere[b.mek].id,
      status: b.status,
      startsAt,
      endsAt,
      idempotencyKey: key,
      source: 'seed',
      notes: b.notat ?? null,
    });
    nyeBookinger++;
  }

  /* ══ LAGER (F2-09) — demo-deler gjennom EKTE tabeller ═════════════════
   *
   * Ikke hardkodet UI: dette er rader i `parts`/`stock_locations`/
   * `stock_levels`/`stock_movements`, hentet av `inventory`-ruteren gjennom
   * RLS som alt annet. Er noe umulig å seede, er det en gap i backend — ikke
   * noe å skjule bak en mock.
   *
   * Beholdningen bygges av BEVEGELSER, ikke ved å sette et tall: det er slik
   * den fungerer i drift, og da tester seeden faktisk regnestykket.
   *
   * ⚠️ Kjøres for HVER demo-tenant brukeren er medlem av — ikke bare Verksted A.
   * Hvilken tenant man lander i ved innlogging avgjøres av Better-Auths
   * organisasjonsliste, og en tom Lager-fane fordi man havnet i «feil» demo
   * ville sett ut som en feil i Lager.
   */
  /** Tillegg demo-tenantene får. Speiler «proff» + de som ikke selges ennå. */
  const ALLE_TILLEGG = [
    'vegvesen',
    'quick',
    'resend',
    'twilio',
    'widget',
    'ai-support',
    'ai-diagnose',
    'ai-providers',
    'nyhetsbrev',
    'analyse-pro',
  ];

  const LOKASJONER = [
    { code: 'A-01', name: 'Hylle A, rad 1' },
    { code: 'A-02', name: 'Hylle A, rad 2' },
    { code: 'BIL-1', name: 'Servicebil 1' },
  ];

  /** Realistiske MC-verkstedsdeler. `min` gir noen som havner under minimum. */
  const DELER = [
    {
      sku: 'BRK-1042',
      name: 'Bremseklosser foran',
      category: 'Bremser',
      cost: 48000,
      min: 4,
      inn: 12,
      res: 2,
      lok: 'A-01',
    },
    {
      sku: 'BRK-1043',
      name: 'Bremseklosser bak',
      category: 'Bremser',
      cost: 39000,
      min: 4,
      inn: 3,
      res: 1,
      lok: 'A-01',
    },
    {
      sku: 'OLJ-0510',
      name: 'Motorolje 10W-40, 1 l',
      category: 'Olje',
      cost: 14900,
      min: 10,
      inn: 24,
      res: 0,
      lok: 'A-02',
    },
    {
      sku: 'FLT-2201',
      name: 'Oljefilter',
      category: 'Filter',
      cost: 12500,
      min: 6,
      inn: 18,
      res: 3,
      lok: 'A-02',
    },
    {
      sku: 'FLT-2202',
      name: 'Luftfilter',
      category: 'Filter',
      cost: 22000,
      min: 5,
      inn: 2,
      res: 0,
      lok: 'A-02',
    },
    {
      sku: 'TND-3301',
      name: 'Tennplugg',
      category: 'Tenning',
      cost: 8900,
      min: 8,
      inn: 30,
      res: 4,
      lok: 'A-01',
    },
    {
      sku: 'KJD-4401',
      name: 'Kjedesett',
      category: 'Drivverk',
      cost: 189000,
      min: 2,
      inn: 5,
      res: 1,
      lok: 'A-01',
    },
    {
      sku: 'DEK-5501',
      name: 'Dekk 120/70-17',
      category: 'Dekk',
      cost: 165000,
      min: 2,
      inn: 6,
      res: 2,
      lok: 'BIL-1',
    },
  ];

  async function seedLager(tenantId: string, actorUserId: string): Promise<void> {
    const lokIder: Record<string, string> = {};
    for (const l of LOKASJONER) {
      const [finnes] = await db
        .select()
        .from(schema.stockLocations)
        .where(
          and(eq(schema.stockLocations.tenantId, tenantId), eq(schema.stockLocations.code, l.code)),
        );
      if (finnes) {
        lokIder[l.code] = finnes.id;
        continue;
      }
      const [nyLok] = await db
        .insert(schema.stockLocations)
        .values({ tenantId, ...l })
        .returning();
      lokIder[l.code] = nyLok.id;
    }

    for (const d of DELER) {
      const [finnes] = await db
        .select()
        .from(schema.parts)
        .where(and(eq(schema.parts.tenantId, tenantId), eq(schema.parts.sku, d.sku)));
      if (finnes) continue;

      const [del] = await db
        .insert(schema.parts)
        .values({
          tenantId,
          sku: d.sku,
          name: d.name,
          category: d.category,
          costMinor: d.cost,
          minStock: d.min,
        })
        .returning();

      const locationId = lokIder[d.lok];
      await db
        .insert(schema.stockLevels)
        .values({ tenantId, partId: del.id, locationId, onHand: d.inn, reserved: d.res });

      // Bevegelsene som FORKLARER tallene over. Historikken er fasiten.
      await db.insert(schema.stockMovements).values({
        tenantId,
        partId: del.id,
        locationId,
        kind: 'in',
        quantity: d.inn,
        actorUserId,
        note: 'Varemottak (demo)',
      });
      if (d.res > 0) {
        await db.insert(schema.stockMovements).values({
          tenantId,
          partId: del.id,
          locationId,
          kind: 'reserve',
          quantity: d.res,
          actorUserId,
          note: 'Reservert til planlagt jobb (demo)',
        });
      }
    }
  }

  // Alle demo-tenants hovedbrukeren er medlem av — inkludert demo-tenants
  // opprettet fra Endwise-admin-flaten, ikke bare de to seeden lager selv.
  const minesOrger = await db
    .select({ orgId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, endwiseAdmin));
  let lagerTenants = 0;
  for (const { orgId } of minesOrger) {
    const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, orgId));
    if (t?.kind !== 'demo') continue;

    /* ⚠️ **LÅST-INNE-BUGEN (fikset 09.08.2026).**
     *
     * Hovedbrukeren sto som `owner` i «Yamaha Bergen» — Better-Auths egen
     * standardrolle fra `createOrganization`, som ikke finnes i vår RBAC-modell.
     * Da matchet hun ingen rolleliste i navet: kontekstvelgeren forsvant, og
     * hun kunne ikke bytte tilbake til de andre demoene. Låst inne.
     *
     * Rotårsaken er fikset i `createTenant` (den normaliserer nå til
     * dealer_admin). Denne linja rydder opp i tenants som allerede FINNES, og
     * hever hovedbrukeren til `endwise_admin` i alle sine demo-tenants slik at
     * dev-mode faktisk slår inn overalt.
     *
     * ⛔ Gaten er URØRT: flagg + endwise_admin + kind='demo' gjelder fortsatt.
     * Vi gjør ikke betingelsen svakere — vi OPPFYLLER den, og bare i tenants
     * som allerede er merket `demo`. En live tenant treffes aldri av loopen.
     */
    await setMemberRole(t.id, endwiseAdmin, 'endwise_admin');

    await seedLager(t.id, endwiseAdmin);
    // F0-16: gi demo-tenantene ALLE tillegg, så hele produktet lar seg klikke
    // gjennom lokalt uansett hvilken demo man lander i. Verksted B er unntaket
    // og står på basis med vilje — den er kontrasten der gaten kan SEES virke.
    if (t.slug !== 'verksted-b') {
      for (const moduleKey of ALLE_TILLEGG) {
        await db
          .insert(schema.tenantModules)
          .values({ tenantId: t.id, moduleKey, plan: 'proff', enabled: true })
          .onConflictDoUpdate({
            target: [schema.tenantModules.tenantId, schema.tenantModules.moduleKey],
            set: { enabled: true },
          });
      }
    }
    lagerTenants++;
  }

  /* ══ DEV-MODE: gjør hovedbrukeren klar UTEN å røre gaten ═══════════════
   *
   * Gaten (F5-28) står urørt og krever fortsatt ALLE tre:
   *   (a) flagget `dev-mode` på
   *   (b) rollen endwise_admin
   *   (c) tenants.kind = 'demo'
   *
   * Det seeden gjør er å OPPFYLLE dem med ekte data lokalt — ikke å omgå dem.
   * (b) settes av setMemberRole over, (c) av ensureTenant; her tar vi (a).
   *
   * ⛔ Scriptet nekter å kjøre i produksjon (sjekken øverst), så ingenting av
   * dette kan nå en ekte forhandler.
   */
  await db
    .insert(schema.featureFlags)
    .values({
      key: 'dev-mode',
      enabled: true,
      description: 'F5-27 — dev-mode. Krever i tillegg endwise_admin OG tenants.kind=demo.',
    })
    .onConflictDoUpdate({ target: schema.featureFlags.key, set: { enabled: true } });

  /* Mekaniker-profil på HOVEDBRUKEREN er allerede opprettet over (den trengtes
   * for ukas bookinger). Uten den er `isMechanic` false, og mekanikervisningen
   * står låst med «Krever mekaniker-profil» (F5-29). Vi jukser ikke med gaten —
   * vi oppretter raden gaten spør etter. */

  /* ══ TRÅDER ═══════════════════════════════════════════════════════════
   *
   * Tre tråder, én per kanal, og alle med FLERE deltakere enn hovedbrukeren.
   * Det siste er poenget: en tråd med bare deg selv kunne aldri avslørt at
   * innboksen skrev ut rå UUID-er i stedet for navn (F6-01, fikset 08.08.2026).
   * Kunde-tråden krever at kunden har en Better-Auth-bruker — derfor har Kari
   * Nordmann en innlogging.
   */
  /* ══ KALLENAVN (F7-06) ════════════════════════════════════════════════
   *
   * Ola Mekaniker får et kallenavn, slik at grensen faktisk kan SEES virke:
   *   · i «Deler til Iron 883» (mechanic_dealer = intern) → «Skiftenøkkelen»
   *   · i «Ulyd i bremsene på MT-07» (customer_dealer)   → «Ola Mekaniker»
   *
   * ⛔ Anna Admin får IKKE kallenavn. `dealer_admin` er forhandlerens offisielle
   * konto, og mutasjonen ville uansett avvist det (`kanHaKallenavn`). Seeden
   * skal ikke lage en tilstand UI-et nekter å opprette.
   */
  await db
    .insert(schema.memberProfiles)
    .values({ tenantId: tenantA, userId: mekA, nickname: 'Skiftenøkkelen' })
    .onConflictDoUpdate({
      target: [schema.memberProfiles.tenantId, schema.memberProfiles.userId],
      set: { nickname: 'Skiftenøkkelen', updatedAt: new Date() },
    });

  /* ══ JOBBFUNKSJON (F1-14) ═════════════════════════════════════════════
   *
   * ⛔ Merk at INGEN av disse endrer rolle. Alle tre er `dealer_staff` med
   * nøyaktig samme tilgang — funksjonen styrer kun hvor de lander og hvordan
   * navet vektlegges. Det er hele poenget med å ha to akser.
   *
   * Anna (dealer_admin) får bevisst INGEN rad: `leder` utledes av rollen, og
   * en lagret verdi ville vært en sannhet som kunne komme i utakt med den.
   */
  for (const [userId, funksjon] of [
    [selgerA, 'selger'],
    [supportA, 'support'],
    [mekA, 'mekaniker'],
  ] as const) {
    await db
      .insert(schema.memberProfiles)
      .values({ tenantId: tenantA, userId, jobFunction: funksjon })
      .onConflictDoUpdate({
        target: [schema.memberProfiles.tenantId, schema.memberProfiles.userId],
        // Kun funksjonen — kallenavnet til Ola skal overleve en ny seed-kjøring.
        set: { jobFunction: funksjon, updatedAt: new Date() },
      });
  }

  const [kariKunde] = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.tenantId, tenantA), eq(schema.customers.name, 'Kari Nordmann')));

  /**
   * ── Kanal på demo-trådene (08.08.2026) ────────────────────────────────
   *
   * `channel` er nå en ekte kolonne, ikke en prototype. Demo-dataene dekker
   * derfor alle fire kanalene, for det er nettopp variasjonen indikatoren
   * skal vise: fire tråder som alle er `app` beviser ingenting.
   *
   * ⚠️ `direction: 'inbound'` betyr at meldingen kom UTENFRA. Kundens SMS og
   * e-post er innkommende; forhandlerens svar er `outbound` — også når det er
   * skrevet i panelet, som er hele poenget med at kanalen på svaret er `app`
   * inntil utsending over SMS/e-post faktisk finnes (F6-14).
   */
  const TRADER: {
    kind: 'customer_dealer' | 'mechanic_dealer' | 'dealer_admin';
    subject: string;
    /** Trådens svarkanal. */
    channel: 'app' | 'sms' | 'email' | 'web';
    /** Kundens adresse/nummer i den eksterne kanalen. */
    externalRef?: string;
    deltakere: (string | null)[];
    meldinger: {
      fra: string | null;
      tekst: string;
      channel?: 'app' | 'sms' | 'email' | 'web';
      direction?: 'inbound' | 'outbound';
      externalId?: string;
      externalRef?: string;
    }[];
  }[] = [
    {
      kind: 'customer_dealer',
      subject: 'Ulyd i bremsene på MT-07',
      // E-POST-tråden: kunden skrev til forhandlerens postkasse.
      channel: 'email',
      externalRef: 'kari@kunde.test',
      // Ola er med i kundetråden med vilje: der skal han vises med EKTE navn,
      // mens han i den interne tråden vises som «Skiftenøkkelen». Grensen er
      // ikke verdt noe før den kan sees virke på samme person.
      deltakere: [kariKunde?.userId ?? null, adminA, mekA, endwiseAdmin],
      meldinger: [
        {
          fra: kariKunde?.userId ?? null,
          tekst:
            'Hei! Det kommer en skrapelyd fra forbremsen når jeg bremser hardt. Rakk dere å se på den?',
          channel: 'email',
          direction: 'inbound',
          externalId: 'seed-email-kari-1@kunde.test',
          externalRef: 'kari@kunde.test',
        },
        {
          fra: adminA,
          tekst:
            'Hei Kari. Vi har satt av tid onsdag 08:30 — Ola ser på klossene da. Du får beskjed før vi bestiller deler.',
          // Svaret er skrevet i panelet. Utsending over e-post finnes ikke ennå.
          channel: 'app',
        },
        {
          fra: kariKunde?.userId ?? null,
          tekst: 'Perfekt, takk!',
          channel: 'email',
          direction: 'inbound',
          externalId: 'seed-email-kari-2@kunde.test',
          externalRef: 'kari@kunde.test',
        },
      ],
    },
    {
      kind: 'customer_dealer',
      subject: 'Er dere ferdige med Ducatien?',
      // SMS-tråden. Kort, utålmodig, uten emne i virkeligheten — akkurat slik
      // SMS er, og derfor det beste beviset på at kanalen betyr noe.
      channel: 'sms',
      externalRef: '+4790000005',
      deltakere: [adminA, endwiseAdmin],
      meldinger: [
        {
          fra: adminA,
          tekst:
            '[Silje Aas, +4790000005] Hei, er dere ferdige med Ducatien? Trenger den til helgen.',
          channel: 'sms',
          direction: 'inbound',
          externalId: 'seed-sms-silje-1',
          externalRef: '+4790000005',
        },
        {
          fra: endwiseAdmin,
          tekst: 'Den er klar til henting fredag ettermiddag.',
          channel: 'app',
        },
      ],
    },
    {
      kind: 'customer_dealer',
      subject: 'Ledig time for EU-kontroll?',
      // WIDGET-tråden: kunden skrev i bookingwidgeten på nettsiden (F4).
      channel: 'web',
      deltakere: [adminA, endwiseAdmin],
      meldinger: [
        {
          fra: adminA,
          tekst: '[Widget] Har dere ledig time for EU-kontroll på MC neste uke?',
          channel: 'web',
          direction: 'inbound',
          externalId: 'seed-web-1',
        },
      ],
    },
    {
      kind: 'mechanic_dealer',
      subject: 'Deler til Iron 883',
      // Intern tråd — app hele veien. Normaltilstanden.
      channel: 'app',
      deltakere: [mekA, adminA, endwiseAdmin],
      meldinger: [
        {
          fra: mekA,
          tekst: 'Bremseklosser bak er nede i 3 stk. Bestiller vi flere før stor service torsdag?',
        },
        { fra: adminA, tekst: 'Ja, bestill 10. Vi ligger under minimum uansett.' },
      ],
    },
    {
      kind: 'dealer_admin',
      subject: 'Notat til meg selv',
      channel: 'app',
      deltakere: [endwiseAdmin],
      meldinger: [
        {
          fra: endwiseAdmin,
          tekst:
            'En tråd med bare deg selv tester IKKE sanntid — du varsles aldri om dine egne meldinger. Bruk to ulike brukere.',
        },
      ],
    },
  ];

  /**
   * ⚠️ **SYNKER, hopper ikke over.** Loopen sa tidligere `if (finnes) continue`.
   * Det er riktig mot duplikater, men gjør seeden ute av stand til å RETTE noe:
   * da `channel` kom til 08.08.2026, sto trådene som allerede fantes igjen som
   * `app`, og demoen viste ikke det den nettopp hadde fått. En dev-seed som
   * bare kan skrive én gang er en engangsseed.
   *
   * Nå oppdateres trådens kanal, og meldingene matches på `(thread_id, body)`.
   * Teksten er en gyldig nøkkel her fordi seed-meldingene ER faste strenger i
   * denne fila — det er ikke et mønster for produksjonskode.
   */
  for (const t of TRADER) {
    let [traad] = await db
      .select()
      .from(schema.threads)
      .where(and(eq(schema.threads.tenantId, tenantA), eq(schema.threads.subject, t.subject)));

    if (traad) {
      await db
        .update(schema.threads)
        .set({ channel: t.channel, externalRef: t.externalRef ?? null })
        .where(eq(schema.threads.id, traad.id));
    } else {
      [traad] = await db
        .insert(schema.threads)
        .values({
          tenantId: tenantA,
          kind: t.kind,
          subject: t.subject,
          channel: t.channel,
          externalRef: t.externalRef ?? null,
        })
        .returning();
    }

    for (const p of t.deltakere.filter((d): d is string => Boolean(d))) {
      await db
        .insert(schema.threadParticipants)
        .values({ tenantId: tenantA, threadId: traad.id, participantId: p })
        .onConflictDoNothing();
    }

    for (const m of t.meldinger) {
      if (!m.fra) continue;
      const felter = {
        channel: m.channel ?? ('app' as const),
        direction: m.direction ?? ('outbound' as const),
        externalId: m.externalId ?? null,
        externalRef: m.externalRef ?? null,
      };
      const [finnesMelding] = await db
        .select({ id: schema.messages.id })
        .from(schema.messages)
        .where(and(eq(schema.messages.threadId, traad.id), eq(schema.messages.body, m.tekst)));

      if (finnesMelding) {
        await db
          .update(schema.messages)
          .set(felter)
          .where(eq(schema.messages.id, finnesMelding.id));
      } else {
        await db.insert(schema.messages).values({
          tenantId: tenantA,
          threadId: traad.id,
          authorId: m.fra,
          body: m.tekst,
          ...felter,
        });
      }
    }
  }

  console.info('\n✅ Seed ferdig. Demo-kontoer (passord: %s):', PASSWORD);
  console.info('  endwise_admin  mikkis@twofold.no        (Verksted A)');
  console.info('  dealer_admin   admin-a@verksted.test    (Verksted A)');
  console.info('  dealer_staff   ansatt-a@verksted.test   (Verksted A)');
  console.info('  mekaniker      mekaniker-a@verksted.test (Verksted A)');
  console.info('  dealer_admin   admin-b@verksted.test    (Verksted B)');
  console.info('\n👔 Jobbfunksjoner i Verksted A (alle dealer_staff — samme tilgang):');
  console.info('  selger     selger-a@verksted.test    → lander på /dashboard');
  console.info('  support    support-a@verksted.test   → lander på /innboks');
  console.info('  mekaniker  mekaniker-a@verksted.test → lander på /min-dag');
  console.info('  leder      admin-a@verksted.test     (dealer_admin, utledet)');
  // ── F1-10 — ÅPEN DEMO-INVITASJON i Verksted A ────────────────────────
  //
  // ⚠️ Idempotent: eventuelle eksisterende ÅPNE demo-invitasjoner til samme
  // adresse tilbakekalles først, så en ny seed ikke etterlater en haug med
  // gyldige lenker på samme e-post.
  //
  // ⛔ Tokenet skrives til konsollen HER fordi dette er seed-skriptet for et
  // lokalt demo-oppsett — samme resonnement som dev-leveransen i
  // senders/resend.ts. Skriptet nekter uansett å kjøre mot produksjon
  // (sjekken øverst i fila).
  const DEMO_INVITASJON = 'ny.ansatt@verksted.test';
  await db
    .update(schema.invitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.invitations.tenantId, tenantA),
        eq(schema.invitations.email, DEMO_INVITASJON),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
      ),
    );
  const demoInv = await createInvitasjonsmodul(db).opprett({
    tenantId: tenantA,
    epost: DEMO_INVITASJON,
    funksjon: 'support',
    invitedBy: adminA,
  });
  const invBase = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  console.info('\n✉️  Åpen demo-invitasjon (Verksted A · support):');
  console.info('   %s/invitasjon/%s', invBase.replace(/\/$/, ''), demoInv.token);
  console.info(
    '   Engangs. Gyldig til %s.',
    demoInv.invitasjon.utloper.toLocaleDateString('nb-NO'),
  );

  console.info('\n🔧 Dev-mode er KLART for mikkis@twofold.no:');
  console.info('   flagg=på · rolle=endwise_admin · Verksted A kind=demo · mekaniker-profil');
  console.info('   → hele kontekstvelgeren ved innlogging, uten å bytte tenant først.');
  console.info('\n📦 Lager: 8 deler + 3 lokasjoner i %s demo-tenant(er).', lagerTenants);
  console.info(
    '👥 Verksted A: %s kunder, %s kjøretøy, %s tjenester, %s nye bookinger denne uka.',
    KUNDER.length,
    KJORETOY.length,
    TJENESTER.length,
    nyeBookinger,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
