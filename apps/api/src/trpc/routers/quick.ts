import { envelopeCryptoConfigured } from '@endwise/db';
import { createQuickConfigService } from '@endwise/modules/quick';
import { assertAllowedQuickUrl, createQuickClient, QuickSsrfError } from '@endwise/toolkit-quick';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { runQuickCustomerPull } from '../../lib/quick-pull.ts';
import { adminProcedure, protectedProcedure, router } from '../init.ts';

/**
 * F8-01 / F8-02 — Quick-integrasjon (QuickLite).
 *
 * SYNK-MODELL (retningsavklart): Quick er FAKTA (source of truth).
 *   - PULL (Quick → Endwise) DOMINERER: `pullNow` (manuell «Hent nå») + cron
 *     08:00/16:00 Oslo (se apps/api/vercel.json + routes/cron/quick-pull.ts).
 *     Overskriver våre felt for radene Quick returnerer.
 *   - PUSH (Endwise → Quick) er MINIMERT og ALDRI automatisk: kun bak en
 *     eksplisitt knapp (`pushNow`). Aldri en bieffekt av synk. Ikke implementert
 *     ennå (mangler ApiV2-token) — men flaten er reservert og tydelig gated.
 *
 * Sikkerhet: skriveflatene er `adminProcedure` (kun dealer_admin/endwise_admin).
 * ALT går via `createQuickConfigService` → `withTenant` → RLS. Tokenet lagres
 * envelope-kryptert og forlater ALDRI serveren (getView returnerer kun `hasToken`).
 *
 * Vi hamrer ALDRI Quick: `testConnection` er ett `client/info`-kall, `pullNow` er
 * en moderat paginert delta-pull (changedAfterDate = sist hentet).
 *
 * TODO (venter på ApiV2-token + token-gatet swagger): booking-, delelager- og
 * salgs-synk, samt selve PUSH-implementasjonen. Kun kunde-PULL nå.
 */
export const quickRouter = router({
  /** Ikke-hemmelig konfig-visning (baseUrl, om token finnes, synk-status). */
  config: protectedProcedure.query(({ ctx }) =>
    createQuickConfigService(ctx.db).getView(ctx.tenantId),
  ),

  /** Lagre baseUrl (+ evt. token). Token er valgfri ved oppdatering av baseUrl. */
  setConfig: adminProcedure
    .input(
      z.object({
        baseUrl: z.string().url(),
        // Tomt token = «behold eksisterende» (send undefined videre).
        token: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // CWE-918: valider baseUrl mot SSRF-vernet FØR lagring (ikke bare i klienten).
      try {
        assertAllowedQuickUrl(input.baseUrl);
      } catch (error) {
        if (error instanceof QuickSsrfError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }
      if (input.token !== undefined && !envelopeCryptoConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'ENDWISE_KEK mangler — kan ikke kryptere Quick-token.',
        });
      }
      await createQuickConfigService(ctx.db).set(ctx.tenantId, {
        baseUrl: input.baseUrl,
        token: input.token,
      });
      return { ok: true };
    }),

  /** «Test tilkobling»: ett `client/info`-kall mot forhandlerens Quick-instans. */
  testConnection: adminProcedure.mutation(async ({ ctx }) => {
    const svc = createQuickConfigService(ctx.db);
    const cfg = await svc.getDecrypted(ctx.tenantId);
    if (!cfg) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Mangler baseUrl og/eller token. Lagre konfigen først.',
      });
    }
    const checkedAt = new Date().toISOString();
    try {
      await createQuickClient(cfg).clientInfo();
      await svc.recordSync(ctx.tenantId, { status: 'ok', detail: 'Tilkobling OK' });
      return { ok: true as const, checkedAt };
    } catch (error) {
      const detail = (error as Error).message;
      await svc.recordSync(ctx.tenantId, { status: 'error', detail });
      return { ok: false as const, checkedAt, detail };
    }
  }),

  /**
   * «Hent nå» — manuell PULL (Quick → Endwise), samme overwrite-semantikk som
   * den planlagte cron-pullen. `full` tvinger full re-synk (ellers delta).
   */
  pullNow: adminProcedure
    .input(z.object({ full: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const res = await runQuickCustomerPull(ctx.db, ctx.tenantId, { full: input.full });
        if (!res.ran) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: res.reason });
        }
        return {
          ok: true as const,
          upserted: res.upserted ?? 0,
          batches: res.batches ?? 0,
          conflicts: res.conflicts ?? 0,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Quick-pull feilet: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * PUSH (Endwise → Quick) — bevisst, knapp-utløst handling. ALDRI automatisk.
   * Ikke implementert ennå: krever en ApiV2-token vi ikke har, og skal holdes
   * minimert (vi vil ikke overkjøre Quick-data). Flaten er reservert og eksplisitt
   * gated slik at push aldri kan bli en bieffekt av pull-synken.
   */
  pushNow: adminProcedure.mutation(() => {
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message:
        'Push til Quick er en bevisst, manuell handling som ennå ikke er bygget (venter på ApiV2-token). Pull er source of truth inntil videre.',
    });
  }),
});
