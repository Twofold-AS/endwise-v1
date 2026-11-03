import { randomUUID } from 'node:crypto';
import { harBedriftCsrf, rolleKrever2FA, sendEmail } from '@endwise/auth';
import { and, eq, schema, sql, withTenant } from '@endwise/db';
import {
  genererInvitasjonskode,
  INVITASJON_SAMME_FEIL,
  kanSendeKode,
  nesteAntallForsoek,
  nesteSendVindu,
  vurderInvitasjonskode,
} from '@endwise/modules/invitasjon-kode';
import { type ApenInvitasjon, createInvitasjonsmodul } from '@endwise/modules/invitasjoner';
import { erPlattformTenant } from '@endwise/modules/plattform';
import { tildelAnsattFarge } from '@endwise/modules/profil';
import { erWhiteLabelAktiv } from '@endwise/modules/tenant-host';
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

function loggGodtaFeil(error: unknown): void {
  const pg = lesPostgresCause(error);
  console.error('[invitasjon] godta feilet', {
    code: pg.code,
    constraint: pg.constraint,
  });
}

class InvitasjonAlleredeBruktError extends Error {
  readonly code = 'INVITASJON_ALLEREDE_BRUKT';
}

/**
 * Lat DB. `createAppContext` kaster uten DATABASE_URL — det må ikke
 * skje ved import, ellers feiler `next build` på Vercel (F13-03).
 */
function db() {
  return createAppContext().db;
}

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
  const krever2FA = rolleKrever2FA(inv.rolle);
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
    kreverPassord: false,
    kreverKode: erWhiteLabelAktiv(),
  });
});

function krevInvitasjonCsrf(c: { req: { raw: Request } }): boolean {
  if (!erWhiteLabelAktiv()) return true;
  return harBedriftCsrf(c.req.raw.headers);
}

invitasjon.post('/:token/send-kode', async (c) => {
  if (!krevInvitasjonCsrf(c)) {
    return c.json({ ok: true }, 200);
  }
  if (!erWhiteLabelAktiv()) {
    return c.json({ ok: true }, 200);
  }
  const modul = createInvitasjonsmodul(db());
  let inv: ApenInvitasjon | null;
  try {
    inv = await modul.finnApen(c.req.param('token'));
  } catch (error) {
    loggOppslagFeil(error);
    return c.json({ ok: true }, 200);
  }
  if (!inv) return c.json({ ok: true }, 200);

  try {
    const now = new Date();
    const utfall = await withTenant(db(), inv.tenantId, async (tx) => {
      const [eks] = await tx
        .select({
          sendCount: schema.invitationCodes.sendCount,
          windowStartedAt: schema.invitationCodes.windowStartedAt,
        })
        .from(schema.invitationCodes)
        .where(eq(schema.invitationCodes.invitationId, inv.id))
        .limit(1);
      if (!kanSendeKode(eks ?? null, now))
        return { sendt: false as const, begrenset: true as const };
      const generert = genererInvitasjonskode({});
      const vindu = nesteSendVindu(eks ?? null, now);
      await tx
        .insert(schema.invitationCodes)
        .values({
          invitationId: inv.id,
          tenantId: inv.tenantId,
          codeHash: generert.hash,
          codeSalt: generert.salt,
          attempts: 0,
          expiresAt: generert.expiresAt,
          usedAt: null,
          sentAt: now,
          sendCount: vindu.sendCount,
          windowStartedAt: vindu.windowStartedAt,
        })
        .onConflictDoUpdate({
          target: schema.invitationCodes.invitationId,
          set: {
            codeHash: generert.hash,
            codeSalt: generert.salt,
            attempts: 0,
            expiresAt: generert.expiresAt,
            usedAt: null,
            sentAt: now,
            sendCount: vindu.sendCount,
            windowStartedAt: vindu.windowStartedAt,
          },
        });
      return { sendt: true as const, kode: generert.kode };
    });
    if (utfall.sendt) {
      await sendEmail({
        to: inv.epost,
        subject: 'Koden din til Endwise-invitasjonen',
        text: `Koden din er ${utfall.kode}. Den gjelder i 10 minutter og kan brukes én gang.`,
      });
      await withTenant(db(), inv.tenantId, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId: inv.tenantId,
          actor: 'system',
          action: 'invitation.code_sent',
          subjectType: 'invitation',
          subjectId: inv.id,
        }),
      );
    } else if (utfall.begrenset) {
      await withTenant(db(), inv.tenantId, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId: inv.tenantId,
          actor: 'system',
          action: 'invitation.code_rate_limited',
          subjectType: 'invitation',
          subjectId: inv.id,
        }),
      );
    }
  } catch {
    // Samme 200. Ingen enumerering.
  }
  return c.json({ ok: true }, 200);
});

const godtaKropp = z.object({
  token: z.string().min(10),
  navn: z.string().trim().min(2).max(120),
  kode: z.string().min(6).max(12).optional(),
});

type InvitasjonTx = Parameters<Parameters<typeof withTenant>[2]>[0];

/**
 * Låser kode-raden (FOR UPDATE), vurderer, øker forsøk eller merker brukt.
 * Feil committes (ikke throw) så forsøkstelleren overlever.
 */
async function brukInvitasjonskode(
  tx: InvitasjonTx,
  invitationId: string,
  kode: string | undefined,
): Promise<{ ok: true } | { ok: false; attempts: number }> {
  await tx.execute(
    sql`select id from invitation_codes where invitation_id = ${invitationId}::uuid for update`,
  );
  const [rad] = await tx
    .select({
      codeHash: schema.invitationCodes.codeHash,
      codeSalt: schema.invitationCodes.codeSalt,
      attempts: schema.invitationCodes.attempts,
      expiresAt: schema.invitationCodes.expiresAt,
      usedAt: schema.invitationCodes.usedAt,
    })
    .from(schema.invitationCodes)
    .where(eq(schema.invitationCodes.invitationId, invitationId))
    .limit(1);
  if (!rad || !kode) {
    if (rad) {
      const attempts = nesteAntallForsoek(rad.attempts);
      await tx
        .update(schema.invitationCodes)
        .set({ attempts })
        .where(eq(schema.invitationCodes.invitationId, invitationId));
      return { ok: false, attempts };
    }
    return { ok: false, attempts: 0 };
  }
  let vurdering: ReturnType<typeof vurderInvitasjonskode>;
  try {
    vurdering = vurderInvitasjonskode(kode, rad);
  } catch {
    return { ok: false, attempts: rad.attempts };
  }
  if (!vurdering.ok) {
    const attempts = nesteAntallForsoek(rad.attempts);
    await tx
      .update(schema.invitationCodes)
      .set({ attempts })
      .where(eq(schema.invitationCodes.invitationId, invitationId));
    return { ok: false, attempts };
  }
  await tx
    .update(schema.invitationCodes)
    .set({ usedAt: new Date() })
    .where(eq(schema.invitationCodes.invitationId, invitationId));
  return { ok: true };
}

/**
 * POST — godta invitasjonen.
 * Én transaksjon (withTenant): ev. kode (FOR UPDATE) → bruker → medlem →
 * member_profiles → consume_invitation sist. Feiler profil-INSERT, rulles
 * alt tilbake — invitasjonen forblir åpen. Klienten kan prøve igjen. Aldri
 * 410 etter delvis skriving.
 * Feil kode committes (forsøk++) uten å opprette bruker.
 * consume_invitation setter app.invitation_hash (is_local). withTenant
 * setter app.tenant_id. De krysser ikke. Nøstet withTenant er forbudt
 * (tenantTxGate).
 */
invitasjon.post('/godta', async (c) => {
  const parsed = godtaKropp.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Ugyldig forespørsel. Navn kreves.' }, 400);
  }

  if (erWhiteLabelAktiv() && !krevInvitasjonCsrf(c)) {
    return c.json({ error: INVITASJON_SAMME_FEIL }, 410);
  }
  if (erWhiteLabelAktiv() && !parsed.data.kode) {
    return c.json({ error: INVITASJON_SAMME_FEIL }, 410);
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
    return c.json({ error: INVITASJON_SAMME_FEIL }, 410);
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

  try {
    const resultat = await withTenant(db(), inv.tenantId, async (tx) => {
      if (erWhiteLabelAktiv()) {
        const kodeSjekk = await brukInvitasjonskode(tx, inv.id, parsed.data.kode);
        if (!kodeSjekk.ok) {
          return { type: 'kode-feil' as const, attempts: kodeSjekk.attempts };
        }
      }

      const [eksisterende] = await tx
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, inv.epost))
        .limit(1);
      let userId = eksisterende?.id;

      if (!userId) {
        const nyId = randomUUID();
        await tx.insert(schema.user).values({
          id: nyId,
          email: inv.epost,
          name: parsed.data.navn,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        userId = nyId;
      } else {
        await tx
          .update(schema.user)
          .set({
            name: parsed.data.navn,
            email: inv.epost,
            emailVerified: true,
          })
          .where(eq(schema.user.id, userId));
      }

      const [alleredeMedlem] = await tx
        .select({ id: schema.member.id, role: schema.member.role })
        .from(schema.member)
        .where(
          and(eq(schema.member.organizationId, inv.tenantId), eq(schema.member.userId, userId)),
        )
        .limit(1);

      if (!alleredeMedlem) {
        await tx.insert(schema.member).values({
          id: randomUUID(),
          organizationId: inv.tenantId,
          userId,
          role: inv.rolle,
          createdAt: new Date(),
        });
      } else if (alleredeMedlem.role !== inv.rolle) {
        await tx
          .update(schema.member)
          .set({ role: inv.rolle })
          .where(eq(schema.member.id, alleredeMedlem.id));
      }

      // Eier-UPDATE (0040): bare job_function + updated_at. Trigger låser
      // PK og nickname for tabelleier.
      if (inv.kind !== 'platform' && inv.funksjon) {
        await tx
          .insert(schema.memberProfiles)
          .values({
            tenantId: inv.tenantId,
            userId,
            jobFunction: inv.funksjon,
          })
          .onConflictDoUpdate({
            target: [schema.memberProfiles.tenantId, schema.memberProfiles.userId],
            set: { jobFunction: inv.funksjon, updatedAt: new Date() },
          });
      }

      if (inv.funksjon === 'mekaniker') {
        const [finnes] = await tx
          .select({ id: schema.mechanics.id })
          .from(schema.mechanics)
          .where(eq(schema.mechanics.userId, userId))
          .limit(1);
        if (!finnes) {
          await tx.insert(schema.mechanics).values({
            tenantId: inv.tenantId,
            userId,
            name: parsed.data.navn,
            capacity: 1,
          });
        }
      }

      const forbrukt = await modul.forbruk(parsed.data.token, tx);
      if (!forbrukt) throw new InvitasjonAlleredeBruktError();

      return { type: 'ok' as const, userId, nyKonto: !eksisterende };
    });

    if (resultat.type === 'kode-feil') {
      try {
        await withTenant(db(), inv.tenantId, (tx) =>
          tx.insert(schema.auditLog).values({
            tenantId: inv.tenantId,
            actor: 'system',
            action: 'invitation.code_failed',
            subjectType: 'invitation',
            subjectId: inv.id,
            metadata: { attempts: resultat.attempts },
          }),
        );
      } catch {
        // Samme feil ut. Audit må ikke endre svaret.
      }
      return c.json({ error: INVITASJON_SAMME_FEIL }, 410);
    }

    try {
      await withTenant(db(), inv.tenantId, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId: inv.tenantId,
          actor: 'system',
          action: 'invitation.used',
          subjectType: 'invitation',
          subjectId: inv.id,
        }),
      );
    } catch {
      // Kontoen er opprettet. Audit-feil skal ikke gi 500.
    }

    if (inv.kind !== 'platform') {
      try {
        await tildelAnsattFarge(db(), inv.tenantId, resultat.userId);
      } catch (error) {
        loggGodtaFeil(error);
      }
    }

    return c.json({
      ok: true,
      epost: inv.epost,
      funksjon: inv.funksjon,
      nyKonto: resultat.nyKonto,
    });
  } catch (error) {
    if (error instanceof InvitasjonAlleredeBruktError) {
      return c.json({ error: INVITASJON_SAMME_FEIL }, 410);
    }
    loggGodtaFeil(error);
    return c.json({ error: 'Kontoen kunne ikke opprettes. Prøv igjen.' }, 500);
  }
});
