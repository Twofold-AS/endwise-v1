import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql, withTenant } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createInvitasjonsmodul,
  hashInvitasjonstoken,
  InvitasjonUgyldigError,
  normaliserEpost,
} from '../src/invitasjoner/index.ts';

/**
 * F1-10 — **ANGREPSTESTER for invitasjonsflyten.**
 *
 * Hvert `⛔`-tilfelle er et forsøk på å komme inn med et token som ikke skal
 * virke. Består testene, betyr det at SERVEREN stoppet forsøket — ikke at
 * UI-et lot være å vise en knapp.
 */

// ── Ting som ikke trenger database. Kjører alltid, også i CI uten Docker. ──
describe('F1-10: token og validering (uten database)', () => {
  it('⛔ tokenet lagres ALDRI i klartekst — hashen er noe annet enn tokenet', () => {
    const token = 'et-token-som-later-som-om-det-er-tilfeldig';
    const hash = hashInvitasjonstoken(token);
    expect(hash).not.toBe(token);
    expect(hash).toHaveLength(64); // SHA-256 hex
    // Deterministisk: samme token gir samme hash, ellers ville oppslag feilet.
    expect(hashInvitasjonstoken(token)).toBe(hash);
  });

  it('to ulike tokens gir ulike hasher', () => {
    expect(hashInvitasjonstoken('a')).not.toBe(hashInvitasjonstoken('b'));
  });

  it('e-post normaliseres, så «Ola@X.no» og «ola@x.no» er samme person', () => {
    expect(normaliserEpost('  Ola@Verksted.NO ')).toBe('ola@verksted.no');
  });
});

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

describeDb('F1-10: invitasjoner mot database', () => {
  let db: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const leder = randomUUID();

  beforeAll(async () => {
    db = createDb(OWNER_URL as string);
    const now = new Date();
    for (const [id, navn] of [
      [tenantA, 'Inv A'],
      [tenantB, 'Inv B'],
    ] as const) {
      await db.insert(schema.tenants).values({ id, name: navn, slug: `inv-${id.slice(0, 8)}` });
      await db
        .insert(schema.organization)
        .values({ id, name: navn, slug: `inv-${id.slice(0, 8)}`, createdAt: now });
    }
  });

  afterAll(async () => {
    for (const id of [tenantA, tenantB]) {
      await db.delete(schema.invitations).where(eq(schema.invitations.tenantId, id));
      await db.delete(schema.organization).where(eq(schema.organization.id, id));
      await db.delete(schema.tenants).where(eq(schema.tenants.id, id));
    }
  });

  const modul = () => createInvitasjonsmodul(db);

  it('oppretter en invitasjon og returnerer tokenet ÉN gang', async () => {
    const { invitasjon, token } = await modul().opprett({
      tenantId: tenantA,
      epost: 'Ny.Ansatt@Verksted.no',
      funksjon: 'selger',
      invitedBy: leder,
    });

    expect(token).toBeTruthy();
    expect(invitasjon.epost).toBe('ny.ansatt@verksted.no');
    expect(invitasjon.rolle).toBe('dealer_staff');
    expect(invitasjon.kind).toBe('staff');

    // ⛔ Raden skal inneholde hashen, ikke tokenet.
    const [rad] = await withTenant(db, tenantA, (tx) =>
      tx
        .select({ hash: schema.invitations.tokenHash })
        .from(schema.invitations)
        .where(eq(schema.invitations.id, invitasjon.id)),
    );
    expect(rad?.hash).toBe(hashInvitasjonstoken(token));
    expect(rad?.hash).not.toBe(token);
  });

  it('⛔ `leder` kan ikke tildeles via invitasjon', async () => {
    await expect(
      modul().opprett({
        tenantId: tenantA,
        epost: 'sjef@verksted.no',
        // @ts-expect-error — poenget er at den avvises i runtime, ikke bare i typer.
        funksjon: 'leder',
        invitedBy: leder,
      }),
    ).rejects.toBeInstanceOf(InvitasjonUgyldigError);
  });

  /**
   * ⛔ DATABASEN er siste skanse. Selv om noen skriver en ny rute som glemmer
   * modulens validering, skal en `dealer_admin`-invitasjon avvises.
   */
  it('⛔ CHECK-constraint avviser en rolle som ikke er dealer_staff på staff-sporet', async () => {
    await expect(
      db.execute(
        sql`insert into invitations (tenant_id, email, token_hash, job_function, role, invited_by, expires_at)
            values (${tenantA}, 'hacker@x.no', ${randomUUID()}, 'selger', 'dealer_admin', ${leder}, now() + interval '7 days')`,
      ),
    ).rejects.toThrow();
  });

  it('⛔ staff-sporet kan fortsatt ikke settes til kind=owner via opprett', async () => {
    const { invitasjon } = await modul().opprett({
      tenantId: tenantA,
      epost: 'ikke-eier@verksted.no',
      funksjon: 'selger',
      invitedBy: leder,
    });
    expect(invitasjon.kind).toBe('staff');
    expect(invitasjon.rolle).toBe('dealer_staff');
  });

  it('eier-sporet oppretter dealer_admin + leder uten å svekke staff-CHECken', async () => {
    const { invitasjon, token } = await modul().opprettEier({
      tenantId: tenantA,
      epost: 'Eier@Verksted.no',
      invitedBy: leder,
    });
    expect(invitasjon.kind).toBe('owner');
    expect(invitasjon.rolle).toBe('dealer_admin');
    expect(invitasjon.funksjon).toBe('leder');
    expect(token).toBeTruthy();

    const funnet = await modul().finnApen(token);
    expect(funnet?.kind).toBe('owner');
    expect(funnet?.rolle).toBe('dealer_admin');
  });

  it('⛔ rå INSERT med kind=staff og dealer_admin avvises fortsatt', async () => {
    await expect(
      db.execute(
        sql`insert into invitations (tenant_id, email, token_hash, job_function, kind, role, invited_by, expires_at)
            values (${tenantA}, 'staff-admin@x.no', ${randomUUID()}, 'selger', 'staff', 'dealer_admin', ${leder}, now() + interval '7 days')`,
      ),
    ).rejects.toThrow();
  });

  it('⛔ rå INSERT med kind=owner og dealer_staff avvises', async () => {
    await expect(
      db.execute(
        sql`insert into invitations (tenant_id, email, token_hash, job_function, kind, role, invited_by, expires_at)
            values (${tenantA}, 'owner-staff@x.no', ${randomUUID()}, 'leder', 'owner', 'dealer_staff', ${leder}, now() + interval '7 days')`,
      ),
    ).rejects.toThrow();
  });

  it('⛔ CHECK-constraint avviser jobbfunksjonen `leder`', async () => {
    await expect(
      db.execute(
        sql`insert into invitations (tenant_id, email, token_hash, job_function, role, invited_by, expires_at)
            values (${tenantA}, 'sjef2@x.no', ${randomUUID()}, 'leder', 'dealer_staff', ${leder}, now() + interval '7 days')`,
      ),
    ).rejects.toThrow();
  });

  it('finner en åpen invitasjon fra rå-token, uten sesjon eller tenant-kontekst', async () => {
    const { token, invitasjon } = await modul().opprett({
      tenantId: tenantA,
      epost: 'apen@verksted.no',
      funksjon: 'support',
      invitedBy: leder,
    });
    const funnet = await modul().finnApen(token);
    expect(funnet?.id).toBe(invitasjon.id);
    expect(funnet?.tenantId).toBe(tenantA);
    expect(funnet?.funksjon).toBe('support');
  });

  it('⛔ ANGREP: et gjenbrukt token avvises', async () => {
    const { token } = await modul().opprett({
      tenantId: tenantA,
      epost: 'engangs@verksted.no',
      funksjon: 'mekaniker',
      invitedBy: leder,
    });

    // Første bruk vinner.
    expect(await modul().forbruk(token)).toBeTruthy();
    // Andre bruk får ingenting — og oppslaget finner den heller ikke lenger.
    expect(await modul().forbruk(token)).toBeNull();
    expect(await modul().finnApen(token)).toBeNull();
  });

  it('⛔ ANGREP: et UTLØPT token avvises', async () => {
    const { token, invitasjon } = await modul().opprett({
      tenantId: tenantA,
      epost: 'utlopt@verksted.no',
      funksjon: 'selger',
      invitedBy: leder,
    });

    // Skru klokka tilbake på raden.
    await db.execute(
      sql`update invitations set expires_at = now() - interval '1 minute' where id = ${invitasjon.id}`,
    );

    expect(await modul().finnApen(token)).toBeNull();
    expect(await modul().forbruk(token)).toBeNull();
  });

  it('⛔ ANGREP: et TILBAKEKALT token avvises', async () => {
    const { token, invitasjon } = await modul().opprett({
      tenantId: tenantA,
      epost: 'trukket@verksted.no',
      funksjon: 'selger',
      invitedBy: leder,
    });

    expect(await modul().tilbakekall(tenantA, invitasjon.id)).toBe(true);
    expect(await modul().finnApen(token)).toBeNull();
    expect(await modul().forbruk(token)).toBeNull();
  });

  /**
   * ⛔ ANGREPET SOM BETYR MEST: lederen i forhandler B prøver å tilbakekalle —
   * eller på annen måte røre — forhandler A sin invitasjon. Hen har en gyldig
   * sesjon og en gyldig rolle; det eneste som stopper hen er at tenant-IDen
   * kommer fra sesjonen og står i WHERE-en.
   */
  it('⛔ ANGREP: leder i tenant B kan ikke tilbakekalle tenant A sin invitasjon', async () => {
    const { invitasjon, token } = await modul().opprett({
      tenantId: tenantA,
      epost: 'krysset@verksted.no',
      funksjon: 'selger',
      invitedBy: leder,
    });

    expect(await modul().tilbakekall(tenantB, invitasjon.id)).toBe(false);
    // Og invitasjonen er urørt — den virker fortsatt for den den gjelder.
    expect(await modul().finnApen(token)).not.toBeNull();
  });

  it('eier-invitasjon vises ikke i staff-lista', async () => {
    await modul().opprettEier({
      tenantId: tenantA,
      epost: 'skjult-eier@verksted.no',
      invitedBy: leder,
    });
    const liste = await modul().listApne(tenantA);
    expect(liste.map((i) => i.epost)).not.toContain('skjult-eier@verksted.no');
  });

  it('⛔ ANGREP: tenant B ser ikke tenant A sine invitasjoner i lista', async () => {
    await modul().opprett({
      tenantId: tenantA,
      epost: 'skjult@verksted.no',
      funksjon: 'selger',
      invitedBy: leder,
    });
    const listeB = await modul().listApne(tenantB);
    expect(listeB.map((i) => i.epost)).not.toContain('skjult@verksted.no');
  });

  it('⛔ ANGREP: et oppdiktet token gir samme svar som et ekte som er brukt opp', async () => {
    // Ingen forskjell utad mellom «fantes aldri» og «er brukt». En angriper
    // skal ikke kunne kartlegge hvilke tokens som en gang har eksistert.
    expect(await modul().finnApen('fullstendig-oppdiktet-token')).toBeNull();
  });
});
