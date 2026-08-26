import { envelopeCryptoConfigured } from '@endwise/db';
import { createQuickConfigService } from '@endwise/modules/quick';
import {
  assertAllowedQuickUrl,
  normalizeQuickBaseUrl,
  normalizeQuickToken,
  probeQuickReadOnly,
  QUICK_PROBE_USER_MESSAGES,
  QuickSsrfError,
  quickProbeUserMessage,
  quickPullUserMessage,
} from '@endwise/toolkit-quick';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { aktiverQuickEtterGet } from '../../lib/quick-activate.ts';
import { runQuickCustomerPull } from '../../lib/quick-pull.ts';
import { moduleAdminProcedure, moduleProcedure, router } from '../init.ts';

/** Modul-gate: `quick`. Erp-integrasjonen er et betalt tillegg. */
const quickProcedure = moduleProcedure('quick');
const quickAdminProcedure = moduleAdminProcedure('quick');

/**
 * F8-01 / F8-02 — Quick-integrasjon (QuickLite).
 * Synk-modell (retningsavklart): Quick er fakta (source of truth).
 * pull (Quick → Endwise) dominerer: `pullNow` (manuell «Hent nå») + cron
 * 08:00/16:00 Oslo (se apps/api/vercel.json + routes/cron/quick-pull.ts).
 * Overskriver våre felt for radene Quick returnerer. Henter kunder og
 * deler/lager (GET item/batch + stockentry/batch) inn i Postgres.
 * push (Endwise → Quick) er minimert og aldri automatisk: kun bak en
 * eksplisitt knapp (`pushNow`). Aldri en bieffekt av synk. Ikke implementert
 * ennå — men flaten er reservert og tydelig gated.
 * Sikkerhet: skriveflatene er `adminProcedure` (kun dealer_admin/endwise_admin).
 * Alt går via `createQuickConfigService` → `withTenant` → RLS. Tokenet lagres
 * envelope-kryptert og forlater aldri serveren (getView returnerer kun `hasToken`).
 * Valgfri egress: QUICK_GATEWAY_URL (tynn live-gateway) eller QUICK_HTTPS_PROXY
 * (connect). Uset = direkte fetch. Vercel Static IPs er infrastruktur.
 * Vi hamrer aldri Quick: `testConnection` / `setConfig` er ett GET `client/info`,
 * `pullNow` er en moderat paginert delta-pull (changedAfterDate = sist hentet).
 * setConfig persisterer ikke nøkkelen med mindre GET-proben svarte.
 * TODO: booking/salg-synk, push-impl, kalendersynk, dlq/retry. Mekaniker
 * plukk-fra-jobb er neste (lager er P0).
 */
export const quickRouter = router({
  /** Ikke-hemmelig konfig-visning (baseUrl, om token finnes, synk-status). */
  config: quickProcedure.query(({ ctx }) => createQuickConfigService(ctx.db).getView(ctx.tenantId)),

  /** Lagre baseUrl (+ evt. token). Token er valgfri ved oppdatering av baseUrl. */
  setConfig: quickAdminProcedure
    .input(
      z.object({
        baseUrl: z.string().trim().url(),
        // Tomt token = «behold eksisterende» (send undefined videre).
        token: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const baseUrl = normalizeQuickBaseUrl(input.baseUrl);
      if (!baseUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: QUICK_PROBE_USER_MESSAGES.noUrl,
        });
      }
      // CWE-918: valider baseUrl mot ssrf-vernet før lagring (ikke bare i klienten).
      try {
        assertAllowedQuickUrl(baseUrl);
      } catch (error) {
        if (error instanceof QuickSsrfError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }
      const svc = createQuickConfigService(ctx.db);
      const existing = await svc.getDecrypted(ctx.tenantId);
      const incoming = input.token === undefined ? undefined : normalizeQuickToken(input.token);
      if (input.token !== undefined && !incoming) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: QUICK_PROBE_USER_MESSAGES.noToken,
        });
      }
      const token = incoming ?? (existing?.token ? normalizeQuickToken(existing.token) : undefined);
      if (!token) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: QUICK_PROBE_USER_MESSAGES.noToken,
        });
      }
      if (!envelopeCryptoConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'ENDWISE_KEK mangler — kan ikke kryptere Quick-token.',
        });
      }
      try {
        await aktiverQuickEtterGet({
          probe: (cfg) => probeQuickReadOnly(cfg),
          persist: (cfg) => svc.set(ctx.tenantId, cfg),
          baseUrl,
          token,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: quickProbeUserMessage(error),
        });
      }
      return { ok: true };
    }),

  /** «Test tilkobling»: ett GET `client/info` mot forhandlerens Quick-instans. */
  testConnection: quickAdminProcedure.mutation(async ({ ctx }) => {
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
      await probeQuickReadOnly(cfg);
      await svc.recordSync(ctx.tenantId, { status: 'ok', detail: 'Tilkobling OK' });
      return { ok: true as const, checkedAt };
    } catch (error) {
      const detail = quickProbeUserMessage(error);
      await svc.recordSync(ctx.tenantId, { status: 'error', detail });
      return { ok: false as const, checkedAt, detail };
    }
  }),

  /**
   * «Hent nå» — manuell pull (Quick → Endwise), samme overwrite-semantikk som
   * den planlagte cron-pullen. `full` tvinger full re-synk (ellers delta).
   */
  pullNow: quickAdminProcedure
    .input(z.object({ full: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const res = await runQuickCustomerPull(ctx.db, ctx.tenantId, {
          full: input.full,
          actorUserId: ctx.userId,
        });
        if (!res.ran) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: res.reason });
        }
        return {
          ok: true as const,
          upserted: res.upserted ?? 0,
          customers: res.customers ?? res.upserted ?? 0,
          parts: res.parts ?? 0,
          stock: res.stock ?? 0,
          batches: res.batches ?? 0,
          conflicts: res.conflicts ?? 0,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: quickPullUserMessage(error),
        });
      }
    }),

  /**
   * Push (Endwise → Quick) — bevisst, knapp-utløst handling. Aldri automatisk.
   * Ikke implementert ennå: krever en ApiV2-token vi ikke har, og skal holdes
   * minimert (vi vil ikke overkjøre Quick-data). Flaten er reservert og eksplisitt
   * gated slik at push aldri kan bli en bieffekt av pull-synken.
   */
  pushNow: quickAdminProcedure.mutation(() => {
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message:
        'Push til Quick er en bevisst, manuell handling som ennå ikke er bygget (venter på ApiV2-token). Pull er source of truth inntil videre.',
    });
  }),
});
