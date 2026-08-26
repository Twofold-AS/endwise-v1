import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROLES_REQUIRING_2FA } from '../src/rbac.ts';
import {
  assertTwoFactorForUser,
  assertTwoFactorSatisfied,
  roleRequires2FA,
  TwoFactorRequiredError,
} from '../src/two-factor.ts';

/**
 * angrepstest for obligatorisk 2FA.
 * Hvert kall her er et forsøk på å få en autorisert sesjon uten å ha fullført
 * tofaktor. Består testene, betyr det at serveren stoppet forsøket — ikke at
 * UI-et lot være å vise en knapp.
 * Hva som var galt før
 * `ROLES_REQUIRING_2FA` var definert og brukt null steder. En `dealer_admin`
 * uten 2FA logget inn med passord alene og fikk en helt vanlig sesjon.
 */

// Den rene regelen. Ingen DB, kjører alltid, også i CI uten Docker.
describe('F1-11: regelen (uten database)', () => {
  it('⚠️ ALLE roller unntatt `customer` krever 2FA — bekreftet mot koden', () => {
    // Oppgaven antok «dealer_admin + endwise_admin». Koden sier også
    // dealer_staff. Testen låser fasiten, så et framtidig tillegg til
    // rolle-listen ikke stille faller utenfor kravet.
    expect([...ROLES_REQUIRING_2FA].sort()).toEqual([
      'dealer_admin',
      'dealer_staff',
      'endwise_admin',
      'endwise_support',
    ]);
    expect(roleRequires2FA('customer')).toBe(false);
  });

  it('⛔ avviser 2FA-pliktig rolle UTEN 2FA', () => {
    expect(() =>
      assertTwoFactorSatisfied({ roles: ['dealer_admin'], twoFactorEnabled: false }),
    ).toThrow(TwoFactorRequiredError);
  });

  it('⛔ `null`/`undefined` teller som IKKE oppfylt — feiler lukket', () => {
    // Kolonnen er nullbar. Ville vi brukt `!== true` feil vei her, ville en rad
    // med NULL sluppet gjennom — og det er standardverdien på gamle brukere.
    for (const verdi of [null, undefined] as const) {
      expect(() =>
        assertTwoFactorSatisfied({ roles: ['endwise_admin'], twoFactorEnabled: verdi }),
      ).toThrow(TwoFactorRequiredError);
    }
  });

  it('slipper gjennom 2FA-pliktig rolle MED 2FA', () => {
    expect(() =>
      assertTwoFactorSatisfied({ roles: ['dealer_admin'], twoFactorEnabled: true }),
    ).not.toThrow();
  });

  it('slipper gjennom `customer` uten 2FA — kunder skal ikke tvinges', () => {
    expect(() =>
      assertTwoFactorSatisfied({ roles: ['customer'], twoFactorEnabled: false }),
    ).not.toThrow();
  });

  /**
   * Omgåelsen som ville vært lettest å finne: vær `customer` hos verksted A,
   * `dealer_admin` hos B. Logg inn uten 2FA med A som aktiv, bytt så til B.
   * Kravet henger på personen, ikke på hvilken fane som er åpen.
   */
  it('⛔ ÉN 2FA-pliktig rolle er nok, selv om de andre ikke krever det', () => {
    expect(() =>
      assertTwoFactorSatisfied({ roles: ['customer', 'dealer_admin'], twoFactorEnabled: false }),
    ).toThrow(TwoFactorRequiredError);
  });

  it('feilen bærer med seg HVILKE roller som utløste kravet', () => {
    try {
      assertTwoFactorSatisfied({ roles: ['customer', 'dealer_staff'], twoFactorEnabled: false });
      expect.unreachable('skulle kastet');
    } catch (error) {
      expect(error).toBeInstanceOf(TwoFactorRequiredError);
      expect((error as TwoFactorRequiredError).roller).toEqual(['dealer_staff']);
      expect((error as TwoFactorRequiredError).reason).toBe('enrollment');
    }
  });
});

// Samme regel, men med ekte medlemskap fra databasen.
const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

describeDb('F1-11: håndhevelse mot ekte medlemskap', () => {
  let owner: Database;
  const orgA = randomUUID();
  const orgB = randomUUID();
  const adminUser = randomUUID();
  const kundeUser = randomUUID();
  const blandetUser = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    const now = new Date();

    await owner.insert(schema.user).values(
      [adminUser, kundeUser, blandetUser].map((id) => ({
        id,
        name: `T-${id.slice(0, 4)}`,
        email: `t-${id.slice(0, 8)}@test.local`,
        emailVerified: true,
        // Ingen av dem har 2FA satt opp. Det er hele poenget.
        twoFactorEnabled: false,
      })),
    );

    await owner.insert(schema.organization).values([
      { id: orgA, name: 'A', slug: `a-${orgA.slice(0, 8)}`, createdAt: now },
      { id: orgB, name: 'B', slug: `b-${orgB.slice(0, 8)}`, createdAt: now },
    ]);

    await owner.insert(schema.member).values([
      {
        id: randomUUID(),
        organizationId: orgA,
        userId: adminUser,
        role: 'dealer_admin',
        createdAt: now,
      },
      {
        id: randomUUID(),
        organizationId: orgA,
        userId: kundeUser,
        role: 'customer',
        createdAt: now,
      },
      // Blandet: kunde hos A, admin hos B.
      {
        id: randomUUID(),
        organizationId: orgA,
        userId: blandetUser,
        role: 'customer',
        createdAt: now,
      },
      {
        id: randomUUID(),
        organizationId: orgB,
        userId: blandetUser,
        role: 'dealer_admin',
        createdAt: now,
      },
    ]);
  });

  afterAll(async () => {
    await owner.delete(schema.member).where(eq(schema.member.organizationId, orgA));
    await owner.delete(schema.member).where(eq(schema.member.organizationId, orgB));
    for (const id of [orgA, orgB]) {
      await owner.delete(schema.organization).where(eq(schema.organization.id, id));
    }
    for (const id of [adminUser, kundeUser, blandetUser]) {
      await owner.delete(schema.user).where(eq(schema.user.id, id));
    }
  });

  it('⛔ dealer_admin uten 2FA får IKKE en autorisert sesjon', async () => {
    await expect(assertTwoFactorForUser(owner, adminUser, false)).rejects.toBeInstanceOf(
      TwoFactorRequiredError,
    );
  });

  it('customer uten 2FA slipper gjennom', async () => {
    await expect(assertTwoFactorForUser(owner, kundeUser, false)).resolves.toBeUndefined();
  });

  it('⛔ kunde hos A + admin hos B blir stoppet — rollen hos B teller', async () => {
    await expect(assertTwoFactorForUser(owner, blandetUser, false)).rejects.toBeInstanceOf(
      TwoFactorRequiredError,
    );
  });

  it('dealer_admin MED 2FA slipper gjennom', async () => {
    await expect(assertTwoFactorForUser(owner, adminUser, true)).resolves.toBeUndefined();
  });
});
