import { authEnv, sendInvitation } from '@endwise/auth';
import { eq, schema, withTenant } from '@endwise/db';
import { createInvitasjonsmodul, InvitasjonUgyldigError } from '@endwise/modules/invitasjoner';
import { kanEndreJobbfunksjon } from '@endwise/modules/profil';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router } from '../init.ts';

/**
 * F1-10 — INVITASJONER. Lederens side av flyten.
 *
 * ── ⛔ Hele ruteren er `adminProcedure` ──────────────────────────────────
 * Også lista. En åpen invitasjon røper hvem verkstedet er i ferd med å ansette
 * og i hvilken funksjon — det er lederens informasjon, ikke noe enhver
 * innlogget skal kunne lese. Samme resonnement som `team.list`.
 *
 * ── De fire sperrene på `opprett` ────────────────────────────────────────
 *   1. `adminProcedure` — kun dealer_admin/endwise_admin i det hele tatt.
 *   2. `kanEndreJobbfunksjon(ctx.role)` — eksplisitt, ikke en antagelse om hva
 *      `adminProcedure` slipper gjennom. Endres den ene, står den andre igjen.
 *   3. Funksjonen må være TILDELBAR (modulen) — `leder` avvises.
 *   4. Rollen settes til `dealer_staff` i modulen og håndheves av en
 *      CHECK-constraint i basen. Den kommer ALDRI fra klienten.
 *
 * ⚠️ `tenantId` kommer fra sesjonen. Det finnes ikke et felt å oppgi den i, så
 * en leder kan ikke invitere inn i en annen forhandler uansett hva hen sender.
 */
export const invitasjonerRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const modul = createInvitasjonsmodul(ctx.db);
    const rader = await modul.listApne(ctx.tenantId);
    // ⛔ Merk hva som IKKE er med: `token_hash`. Lista er til lederen, og
    // hashen har ingen nytte der — men den ville vært et unødvendig sted den
    // kunne lekke fra.
    return rader.map((r) => ({
      id: r.id,
      epost: r.epost,
      funksjon: r.funksjon,
      utloper: r.utloper,
      opprettet: r.opprettet,
      invitertAv: r.invitertAv,
    }));
  }),

  opprett: adminProcedure
    .input(
      z.object({
        epost: z.email().max(200),
        funksjon: z.enum(['selger', 'support', 'mekaniker']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!kanEndreJobbfunksjon(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens leder kan invitere ansatte.',
        });
      }

      const modul = createInvitasjonsmodul(ctx.db);

      let resultat: Awaited<ReturnType<typeof modul.opprett>>;
      try {
        resultat = await modul.opprett({
          tenantId: ctx.tenantId,
          epost: input.epost,
          funksjon: input.funksjon,
          invitedBy: ctx.userId,
        });
      } catch (error) {
        if (error instanceof InvitasjonUgyldigError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }

      // ⚠️ `withTenant`, ikke et rått select — `tenants` har RLS, og uten
      // kontekst returnerer den null rader i stedet for en feil. Da ville
      // e-posten stille sagt «Endwise» i stedet for verkstedets navn.
      const [forhandler] = await withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .select({ navn: schema.tenants.name })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, ctx.tenantId))
          .limit(1),
      );

      const base = authEnv.baseUrl;
      const lenke = `${base.replace(/\/$/, '')}/invitasjon/${resultat.token}`;

      /**
       * ⚠️ Sendingen skjer ETTER at raden er skrevet, og feil her ruller IKKE
       * tilbake invitasjonen. Det er et bevisst valg: en invitasjon som finnes
       * i basen men ikke kom fram kan sendes på nytt, mens en som ble rullet
       * tilbake fordi e-posttjenesten hikstet bare forsvinner. Lederen får vite
       * at sendingen feilet, og kan tilbakekalle eller invitere på nytt.
       */
      let sendt = true;
      try {
        await sendInvitation({
          to: resultat.invitasjon.epost,
          lenke,
          forhandler: forhandler?.navn ?? 'Endwise',
          funksjon: input.funksjon,
          utloper: resultat.invitasjon.utloper,
        });
      } catch (error) {
        sendt = false;
        console.error(`[invitasjon] e-post feilet: ${(error as Error).message}`);
      }

      // ⛔ Tokenet returneres ALDRI til klienten. Det finnes i lenka, og der
      // alene. Returnerer vi det her, ligger det i nettverksloggen til enhver
      // som har åpnet devtools på lederens maskin.
      return {
        id: resultat.invitasjon.id,
        epost: resultat.invitasjon.epost,
        funksjon: resultat.invitasjon.funksjon,
        utloper: resultat.invitasjon.utloper,
        sendt,
      };
    }),

  tilbakekall: adminProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const modul = createInvitasjonsmodul(ctx.db);
    const ok = await modul.tilbakekall(ctx.tenantId, input.id);
    if (!ok) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Fant ingen åpen invitasjon med den IDen hos denne forhandleren.',
      });
    }
    return { id: input.id };
  }),
});
