import { randomUUID } from 'node:crypto';
import { createAuth, rolleKrever2FA, settPassordUtenSesjon } from '@endwise/auth';
import { and, eq, schema, withTenant } from '@endwise/db';
import {
  type ApenInvitasjon,
  createInvitasjonsmodul,
  inviteeKreverPassord,
} from '@endwise/modules/invitasjoner';
import { erPlattformTenant } from '@endwise/modules/plattform';
import { tildelAnsattFarge } from '@endwise/modules/profil';
import { Hono } from 'hono';
import { z } from 'zod';
import { createAppContext } from '../context.ts';
import { lesPostgresCause } from '../trpc/slett-postgres.ts';

/**
 * Den offentlige siden av invitasjonsflyten.
 * Hvorfor denne ikke er en tRPC-rute
 * Den som åpner en invitasjonslenke har ingen konto, ingen sesjon og ingen
 * forhandler. Alle tRPC-rutene går gjennom `createRequestContext`, som
 * håndhever sesjon og 2FA (F1-11) — altså nøyaktig det invitee ikke har ennå.
 * Dette er samme klasse flate som `/widget/*`: offentlig inngang, med
 * hemmeligheten i forespørselen i stedet for i en cookie.
 * Hva som beskytter den
 * Tokenet er 256 bit tilfeldig og finnes bare i lenka. Det er ingen liste
 * å ramse opp — uten et gyldig token er det ingen inngang.
 * Oppslaget går gjennom `lookup_open_invitation` (SECURITY DEFINER), som
 * kun svarer på Åpne invitasjoner. Utløpt, brukt og tilbakekalt gir samme
 * svar som ukjent: null.
 * `consume_invitation` er atomisk. To samtidige forsøk gir én vinner.
 * Rollen kommer fra raden, aldri fra forespørselen. Klienten kan ikke be om
 * å bli `dealer_admin` — det finnes ikke et felt for det.
 */
export const invitasjon = new Hono();

/** Samme setning som siden viser når JSON-parse / nett feiler. Ikke 404-ugyldig. */
export const INVITASJON_HENT_FEILET = 'Klarte ikke hente invitasjonen. Prøv igjen.';

function oppslagFeilet(error: unknown): boolean {
  const pg = lesPostgresCause(error);
  return pg.code === '42883' || /function .* does not exist/i.test(pg.message ?? '');
}

function loggOppslagFeil(error: unknown): void {
  const pg = lesPostgresCause(error);
  console.error('[invitasjon] oppslag feilet', {
    code: pg.code,
    missingFunction: oppslagFeilet(error),
  });
}

async function harCredentialKonto(userId: string): Promise<boolean> {
  const [konto] = await db()
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'credential')))
    .limit(1);
  return Boolean(konto);
}

/**
 * Lat DB. `createAppContext` kaster uten DATABASE_URL — det må ikke
 * skje ved import, ellers feiler `next build` på Vercel (F13-03).
 */
function db() {
  return createAppContext().db;
}
let authInstance: ReturnType<typeof createAuth> | undefined;
const getAuth = () => {
  authInstance ??= createAuth(db());
  return authInstance;
};

/**
 * GET — hva gjelder invitasjonen? Kalles av oppsett-siden for å vise
 * forhandlernavn og funksjon før brukeren skriver passordet sitt.
 * Svarer bevisst tynt: forhandlernavn, funksjon, e-post og utløp. Ikke hvem
 * som inviterte, ikke tenant-ID, ikke noe om andre ansatte.
 */
invitasjon.get('/:token', async (c) => {
  const modul = createInvitasjonsmodul(db());
  let inv: ApenInvitasjon | null;
  try {
    inv = await modul.finnApen(c.req.param('token'));
  } catch (error) {
    loggOppslagFeil(error);
    return c.json({ gyldig: false, grunn: INVITASJON_HENT_FEILET }, 500);
  }
  if (!inv) {
    return c.json({ gyldig: false, grunn: 'Invitasjonen er ugyldig, brukt eller utløpt.' }, 404);
  }

  /**
   * `withTenant`, ikke et rått select. `tenants` har RLS + force RLS, så et
   * oppslag uten kontekst returnerer NULL rader — ikke en feil. Første versjon
   * hadde et rått select her, og resultatet var at forhandlernavnet stille ble
   * «Endwise» for alle: fallbacken så ut som en fornuftig standard i stedet for
   * som en tom spørring. Fanget i ende-til-ende-testen, ikke av typecheck.
   * Tenanten er kjent fra invitasjonsraden, så konteksten kan settes trygt
   * den kommer fra tokenet, ikke fra forespørselen.
   */
  const [forhandler] = await withTenant(db(), inv.tenantId, (tx) =>
    tx
      .select({ navn: schema.tenants.name })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, inv.tenantId))
      .limit(1),
  );

  // 2FA-pliktig rolle: passord + kode i samme skall, også om kontoen finnes.
  // Uten credential (Opprett ansatt, deretter invitert): passord uansett.
  const [eksisterende] = await db()
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, inv.epost))
    .limit(1);
  const harCredential = eksisterende ? await harCredentialKonto(eksisterende.id) : false;

  const krever2FA = rolleKrever2FA(inv.rolle);
  const kreverPassord =
    krever2FA ||
    inviteeKreverPassord({
      kind: inv.kind,
      harBruker: Boolean(eksisterende),
      harCredential,
    });
  return c.json({
    gyldig: true,
    epost: inv.epost,
    funksjon: inv.funksjon,
    kind: inv.kind,
    platformLevel: inv.platformLevel,
    forhandler: inv.kind === 'platform' ? 'Endwise' : (forhandler?.navn ?? 'Endwise'),
    utloper: inv.utloper,
    harKonto: Boolean(eksisterende),
    krever2FA,
    kreverPassord,
  });
});

const godtaKropp = z.object({
  token: z.string().min(10),
  navn: z.string().trim().min(2).max(120),
  /** Samme minimum som Better-Auth er konfigurert med (`minPasswordLength: 12`). */
  passord: z.string().min(12).max(200).optional(),
});

/**
 * POST — godta invitasjonen.
 * Rekkefølgen er valgt bevisst:
 * 1. Valider input før noe forbrukes. En for kort passordstreng skal ikke
 * brenne invitasjonen.
 * 2. Slå opp at den er åpen.
 * 3. **Forbruk tokenet** — atomisk, én vinner.
 * 4. Opprett/hent bruker, medlemskap og profil.
 * Feiler steg 4 etter at steg 3 er gjort, er invitasjonen brukt opp uten at
 * kontoen ble ferdig. Det er den trygge feilretningen: aldri to kontoer fra ett
 * token. Lederen kan invitere på nytt. Motsatt rekkefølge ville gjort et
 * kappløp mellom to faner til to medlemskap.
 */
invitasjon.post('/godta', async (c) => {
  const parsed = godtaKropp.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Ugyldig forespørsel. Navn kreves, passord minst 12 tegn.' }, 400);
  }

  const modul = createInvitasjonsmodul(db());
  let inv: ApenInvitasjon | null;
  try {
    inv = await modul.finnApen(parsed.data.token);
  } catch (error) {
    loggOppslagFeil(error);
    return c.json({ error: INVITASJON_HENT_FEILET }, 500);
  }
  if (!inv) {
    return c.json({ error: 'Invitasjonen er ugyldig, brukt eller utløpt.' }, 410);
  }

  if (inv.kind === 'platform') {
    const [tenant] = await withTenant(db(), inv.tenantId, (tx) =>
      tx
        .select({ kind: schema.tenants.kind, slug: schema.tenants.slug })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, inv.tenantId))
        .limit(1),
    );
    if (!tenant || !erPlattformTenant(tenant)) {
      return c.json({ error: 'Plattform-invitasjonen peker ikke på Endwise-org.' }, 403);
    }
  }

  const [eksisterende] = await db()
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, inv.epost))
    .limit(1);
  const harCredential = eksisterende ? await harCredentialKonto(eksisterende.id) : false;

  const krever2FA = rolleKrever2FA(inv.rolle);
  const kreverPassord =
    krever2FA ||
    inviteeKreverPassord({
      kind: inv.kind,
      harBruker: Boolean(eksisterende),
      harCredential,
    });
  if (kreverPassord && !parsed.data.passord) {
    return c.json(
      {
        error: krever2FA
          ? 'Passord kreves. Tofaktor er påkrevd for denne rollen.'
          : inv.kind === 'owner'
            ? 'Sett eller bytt passord (minst 12 tegn).'
            : 'Passord kreves for en ny konto.',
      },
      400,
    );
  }

  // 3. Forbruk. Etter denne linja er tokenet dødt.
  const forbrukt = await modul.forbruk(parsed.data.token);
  if (!forbrukt) {
    // Noen andre kom først — eller den ble tilbakekalt i mellomtiden.
    return c.json({ error: 'Invitasjonen er ugyldig, brukt eller utløpt.' }, 410);
  }

  try {
    let userId = eksisterende?.id;

    if (!userId) {
      await getAuth().api.signUpEmail({
        body: {
          email: inv.epost,
          password: parsed.data.passord as string,
          name: parsed.data.navn,
        },
      });
      const [ny] = await db()
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, inv.epost))
        .limit(1);
      if (!ny) throw new Error('Brukeren ble ikke opprettet');
      userId = ny.id;

      /**
       * E-posten er allerede bevist: invitasjonen ble sendt dit, og bare den
       * som leste den har tokenet. Å kreve en ny verifiseringsmail ville vært å
       * be om bevis for noe vi nettopp har fått bevist — og i dev uten Resend
       * ville det låst hele flyten.
       * `twoFactorEnabled` settes ikke her. Den ansatte er `dealer_staff`,
       * som krever 2FA (F1-11), og skal gjennom oppsettet selv. Å sette den her
       * ville gitt en konto som består 2FA-gaten uten at noen kode er tastet.
       */
      await db()
        .update(schema.user)
        .set({
          name: parsed.data.navn,
          email: inv.epost,
          emailVerified: true,
        })
        .where(eq(schema.user.id, userId));
    } else {
      if (parsed.data.passord && (inv.kind === 'owner' || !harCredential)) {
        await settPassordUtenSesjon(db(), userId, parsed.data.passord);
      }
      await db()
        .update(schema.user)
        .set({
          name: parsed.data.navn,
          email: inv.epost,
          emailVerified: true,
        })
        .where(eq(schema.user.id, userId));
    }

    // 4. Medlemskap + profil, i tenanten fra raden.
    // Alltid invitert rolle — aldri behold en høyere rolle («ikke elevere»).
    const [alleredeMedlem] = await db()
      .select({ id: schema.member.id, role: schema.member.role })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, inv.tenantId),
          eq(schema.member.userId, userId as string),
        ),
      )
      .limit(1);

    if (!alleredeMedlem) {
      await db()
        .insert(schema.member)
        .values({
          id: randomUUID(),
          organizationId: inv.tenantId,
          userId: userId as string,
          // Fra raden, aldri fra forespørselen. Staff er dealer_staff;
          // owner-sporet kan være dealer_admin — CHECKen skiller på kind.
          role: inv.rolle,
          createdAt: new Date(),
        });
    } else if (alleredeMedlem.role !== inv.rolle) {
      await db()
        .update(schema.member)
        .set({ role: inv.rolle })
        .where(eq(schema.member.id, alleredeMedlem.id));
    }

    if (inv.kind !== 'platform' && inv.funksjon) {
      await withTenant(db(), inv.tenantId, (tx) =>
        tx
          .insert(schema.memberProfiles)
          .values({
            tenantId: inv.tenantId,
            userId: userId as string,
            jobFunction: inv.funksjon,
          })
          .onConflictDoUpdate({
            target: [schema.memberProfiles.tenantId, schema.memberProfiles.userId],
            set: { jobFunction: inv.funksjon, updatedAt: new Date() },
          }),
      );
    }

    if (inv.funksjon === 'mekaniker') {
      await withTenant(db(), inv.tenantId, async (tx) => {
        const [finnes] = await tx
          .select({ id: schema.mechanics.id })
          .from(schema.mechanics)
          .where(eq(schema.mechanics.userId, userId as string))
          .limit(1);
        if (!finnes) {
          await tx.insert(schema.mechanics).values({
            tenantId: inv.tenantId,
            userId: userId as string,
            name: parsed.data.navn,
            capacity: 1,
          });
        }
      });
    }

    if (inv.kind !== 'platform') {
      await tildelAnsattFarge(db(), inv.tenantId, userId as string);
    }

    return c.json({
      ok: true,
      epost: inv.epost,
      funksjon: inv.funksjon,
      nyKonto: !eksisterende,
    });
  } catch (error) {
    // Invitasjonen er forbrukt. Si det rett ut i stedet for å late som om
    // brukeren kan prøve igjen med samme lenke.
    console.error(`[invitasjon] godta feilet etter forbruk: ${(error as Error).message}`);
    return c.json(
      {
        error:
          'Kontoen kunne ikke opprettes, og invitasjonen er brukt opp. Be lederen din om en ny.',
      },
      500,
    );
  }
});
