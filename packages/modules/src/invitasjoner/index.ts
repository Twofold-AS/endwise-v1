import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, type Database, desc, eq, isNull, schema, sql, withTenant } from '@endwise/db';
import { type Jobbfunksjon, kanTildeles, TILDELBARE_FUNKSJONER } from '../profil/index.ts';

/**
 * F1-10 — INVITASJONER. Lederen inviterer, den ansatte fullfører selv.
 *
 * ── ⛔ Tokenet finnes ETT sted: i lenka ──────────────────────────────────
 * Vi genererer 32 tilfeldige byte, sender dem i lenka, og lagrer **bare
 * SHA-256 av dem**. Databasen kjenner aldri hemmeligheten. En dump, en backup
 * på avveie eller en logget spørring gir ingen brukbare invitasjoner.
 *
 * ── ⛔ Hvorfor oppslaget går via en SQL-funksjon ─────────────────────────
 * `invitations` er RLS-isolert som alt annet, men den som åpner lenka har
 * verken sesjon eller tenant — så `app.tenant_id` er ikke satt, og RLS
 * returnerer null rader (verifisert 16.08.2026: unscopet select gir 0).
 * `lookup_open_invitation` / `consume_invitation` er SECURITY DEFINER-funksjoner
 * som gjør nøyaktig ett oppslag på hash. Se `packages/db/sql/functions.sql`.
 *
 * ── ⛔ Staff-sporet kan aldri bli mer enn `dealer_staff` ─────────────────
 * Tre lag på `opprett`: denne funksjonen validerer, ruta er `adminProcedure`,
 * og CHECKen (`kind = staff` → `dealer_staff`, ikke `leder`). Owner-sporet
 * (`opprettEier`) er et eget kall som setter `kind = owner` bevisst.
 */

export type Invitasjonskind = 'staff' | 'owner';

/** 7 dager. Lenge nok til en ferieuke, kort nok til at en glemt e-post dør. */
export const INVITASJON_GYLDIGHET_DAGER = 7;

const TOKEN_BYTES = 32;

export class InvitasjonUgyldigError extends Error {
  readonly code = 'INVITASJON_UGYLDIG';
}

/**
 * Hasher tokenet. Eksportert fordi godta-stien må hashe det samme, og to
 * implementasjoner ville før eller siden blitt ulike.
 *
 * SHA-256 uten salt er riktig HER, i motsetning til for passord: tokenet er
 * 256 bit kryptografisk tilfeldig, så det finnes ingen ordbok å angripe det
 * med. Bcrypt ville bare gjort oppslaget tregt uten å gjøre det tryggere.
 */
export function hashInvitasjonstoken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Normaliserer e-post ett sted, så «Ola@X.no» og «ola@x.no» er samme person. */
export function normaliserEpost(epost: string): string {
  return epost.trim().toLowerCase();
}

export interface NyInvitasjon {
  tenantId: string;
  epost: string;
  funksjon: Jobbfunksjon;
  invitedBy: string;
  gyldighetDager?: number;
}

export interface ApenInvitasjon {
  id: string;
  tenantId: string;
  epost: string;
  funksjon: Jobbfunksjon;
  rolle: string;
  kind: Invitasjonskind;
  utloper: Date;
}

export interface NyEierInvitasjon {
  tenantId: string;
  epost: string;
  invitedBy: string;
  gyldighetDager?: number;
}

export function createInvitasjonsmodul(db: Database) {
  return {
    /**
     * Oppretter en invitasjon og returnerer RÅ-TOKENET én gang.
     *
     * ⚠️ Returverdien er eneste sted tokenet noen gang finnes utenfor lenka.
     * Kallstedet skal sende det og så glemme det — ikke logge det, ikke lagre
     * det, ikke returnere det til en liste-visning.
     */
    async opprett(input: NyInvitasjon): Promise<{ invitasjon: ApenInvitasjon; token: string }> {
      if (!kanTildeles(input.funksjon)) {
        throw new InvitasjonUgyldigError(
          `Funksjonen «${input.funksjon}» kan ikke tildeles. Gyldige: ${TILDELBARE_FUNKSJONER.join(', ')}.`,
        );
      }

      const epost = normaliserEpost(input.epost);
      if (!epost.includes('@')) throw new InvitasjonUgyldigError('Ugyldig e-postadresse.');

      const token = randomBytes(TOKEN_BYTES).toString('base64url');
      const utloper = new Date(
        Date.now() + (input.gyldighetDager ?? INVITASJON_GYLDIGHET_DAGER) * 24 * 60 * 60 * 1000,
      );

      const [rad] = await withTenant(db, input.tenantId, (tx) =>
        tx
          .insert(schema.invitations)
          .values({
            tenantId: input.tenantId,
            email: epost,
            tokenHash: hashInvitasjonstoken(token),
            jobFunction: input.funksjon,
            // ⛔ Aldri fra input. Staff-sporet er låst — se filhodet.
            kind: 'staff',
            role: 'dealer_staff',
            invitedBy: input.invitedBy,
            expiresAt: utloper,
          })
          .returning(),
      );
      if (!rad) throw new Error('Invitasjonen ble ikke opprettet');

      return {
        token,
        invitasjon: {
          id: rad.id,
          tenantId: rad.tenantId,
          epost: rad.email,
          funksjon: rad.jobFunction as Jobbfunksjon,
          rolle: rad.role,
          kind: 'staff',
          utloper: rad.expiresAt,
        },
      };
    },

    /**
     * F5-26 — EIER-INVITASJON. Eget spor, ikke en parameter på `opprett`.
     *
     * ⛔ `leder` / `dealer_admin` settes her, aldri fra klienten. Staff-CHECken
     * står urørt: `opprett` kan fortsatt ikke lage dette.
     */
    async opprettEier(
      input: NyEierInvitasjon,
    ): Promise<{ invitasjon: ApenInvitasjon; token: string }> {
      const epost = normaliserEpost(input.epost);
      if (!epost.includes('@')) throw new InvitasjonUgyldigError('Ugyldig e-postadresse.');

      const token = randomBytes(TOKEN_BYTES).toString('base64url');
      const utloper = new Date(
        Date.now() + (input.gyldighetDager ?? INVITASJON_GYLDIGHET_DAGER) * 24 * 60 * 60 * 1000,
      );

      const [rad] = await withTenant(db, input.tenantId, (tx) =>
        tx
          .insert(schema.invitations)
          .values({
            tenantId: input.tenantId,
            email: epost,
            tokenHash: hashInvitasjonstoken(token),
            kind: 'owner',
            jobFunction: 'leder',
            role: 'dealer_admin',
            invitedBy: input.invitedBy,
            expiresAt: utloper,
          })
          .returning(),
      );
      if (!rad) throw new Error('Eier-invitasjonen ble ikke opprettet');

      return {
        token,
        invitasjon: {
          id: rad.id,
          tenantId: rad.tenantId,
          epost: rad.email,
          funksjon: 'leder',
          rolle: rad.role,
          kind: 'owner',
          utloper: rad.expiresAt,
        },
      };
    },

    /**
     * Tilbakekall åpne eier-invitasjoner for en e-post (eller alle) i tenanten.
     * Brukes før ny utsending, så det ikke ligger flere gyldige eier-lenker.
     */
    async tilbakekallApneEier(tenantId: string, epost?: string): Promise<number> {
      const rader = await withTenant(db, tenantId, (tx) =>
        tx
          .update(schema.invitations)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(schema.invitations.tenantId, tenantId),
              eq(schema.invitations.kind, 'owner'),
              isNull(schema.invitations.acceptedAt),
              isNull(schema.invitations.revokedAt),
              epost ? eq(schema.invitations.email, normaliserEpost(epost)) : sql`true`,
            ),
          )
          .returning({ id: schema.invitations.id }),
      );
      return rader.length;
    },

    async sisteEierInvitasjon(tenantId: string) {
      const [rad] = await withTenant(db, tenantId, (tx) =>
        tx
          .select({
            id: schema.invitations.id,
            epost: schema.invitations.email,
            utloper: schema.invitations.expiresAt,
            akseptert: schema.invitations.acceptedAt,
            trukket: schema.invitations.revokedAt,
          })
          .from(schema.invitations)
          .where(
            and(eq(schema.invitations.tenantId, tenantId), eq(schema.invitations.kind, 'owner')),
          )
          .orderBy(desc(schema.invitations.createdAt))
          .limit(1),
      );
      return rad ?? null;
    },

    /** Åpne invitasjoner for lederens liste. Tenant-skopet av RLS. */
    async listApne(tenantId: string) {
      return withTenant(db, tenantId, (tx) =>
        tx
          .select({
            id: schema.invitations.id,
            epost: schema.invitations.email,
            funksjon: schema.invitations.jobFunction,
            utloper: schema.invitations.expiresAt,
            opprettet: schema.invitations.createdAt,
            invitertAv: schema.invitations.invitedBy,
          })
          .from(schema.invitations)
          .where(
            and(
              eq(schema.invitations.tenantId, tenantId),
              eq(schema.invitations.kind, 'staff'),
              isNull(schema.invitations.acceptedAt),
              isNull(schema.invitations.revokedAt),
            ),
          )
          .orderBy(desc(schema.invitations.createdAt)),
      );
    },

    /**
     * Tilbakekall. ⚠️ Tenant-ID kommer fra sesjonen, ikke fra klienten, og står
     * i WHERE-en i tillegg til RLS. En leder skal ikke kunne tilbakekalle en
     * annen forhandlers invitasjon selv om hen gjetter en ID.
     */
    async tilbakekall(tenantId: string, id: string): Promise<boolean> {
      const rader = await withTenant(db, tenantId, (tx) =>
        tx
          .update(schema.invitations)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(schema.invitations.id, id),
              eq(schema.invitations.tenantId, tenantId),
              isNull(schema.invitations.acceptedAt),
              isNull(schema.invitations.revokedAt),
            ),
          )
          .returning({ id: schema.invitations.id }),
      );
      return rader.length > 0;
    },

    /**
     * Slår opp en ÅPEN invitasjon fra rå-token. Ingen sesjon nødvendig.
     *
     * Returnerer null for alt som ikke er åpent — utløpt, brukt, tilbakekalt
     * eller ukjent. ⚠️ Med vilje samme svar for alle fire: en angriper som
     * prøver seg skal ikke få vite om et token fantes en gang.
     */
    async finnApen(token: string): Promise<ApenInvitasjon | null> {
      if (!token) return null;
      const hash = hashInvitasjonstoken(token);
      const res = await db.execute(
        sql`select id, tenant_id, email, job_function, role, kind, expires_at
              from lookup_open_invitation(${hash})`,
      );
      const rad = (res.rows ?? res)[0] as
        | {
            id: string;
            tenant_id: string;
            email: string;
            job_function: string;
            role: string;
            kind?: string;
            expires_at: string | Date;
          }
        | undefined;
      if (!rad) return null;

      const kind: Invitasjonskind =
        rad.kind === 'owner' || rad.role === 'dealer_admin' ? 'owner' : 'staff';

      return {
        id: rad.id,
        tenantId: rad.tenant_id,
        epost: rad.email,
        funksjon: rad.job_function as Jobbfunksjon,
        rolle: rad.role,
        kind,
        utloper: new Date(rad.expires_at),
      };
    },

    /**
     * ⛔ ENGANGS-GARANTIEN. Merker invitasjonen brukt og returnerer IDen.
     * Null = den var ikke åpen lenger.
     *
     * Garantien ligger i SQL-funksjonens `where accepted_at is null` — to
     * samtidige forsøk gir én vinner, avgjort av databasen og ikke av
     * rekkefølgen på to HTTP-kall.
     */
    async forbruk(token: string): Promise<string | null> {
      const hash = hashInvitasjonstoken(token);
      const res = await db.execute(sql`select consume_invitation(${hash}) as id`);
      const rad = (res.rows ?? res)[0] as { id: string | null } | undefined;
      return rad?.id ?? null;
    },
  };
}

export type Invitasjonsmodul = ReturnType<typeof createInvitasjonsmodul>;

/**
 * Konstant-tids sammenligning av to tokens. Ikke brukt i oppslaget (der er det
 * en indeksert hash-likhet, som ikke lekker noe), men eksportert fordi neste
 * person som trenger å sammenligne et token skal finne den her i stedet for å
 * skrive `a === b`.
 */
export function tokenErLike(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
