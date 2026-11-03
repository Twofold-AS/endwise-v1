import { createCompetenceRegistry } from '@endwise/modules/competence';
import { z } from 'zod';
import { omradeSjekk, protectedProcedure, router } from '../init.ts';
import { loggDealerWritePostgresFeil, mapDealerWritePostgresFeil } from '../slett-postgres.ts';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Må være YYYY-MM-DD');

/**
 * Kompetanseregister. UI-en er F3-08.
 * Skriving: `adminProcedure` (kun dealer_admin i egen tenant, eller endwise_admin).
 * Lesing: `protectedProcedure` — staff må se hvem som kan hva for å booke manuelt.
 */
export const competenceRouter = router({
  // Ferdighetskatalogen
  listSkills: protectedProcedure
    .use(omradeSjekk('ansatte', 'se', true))
    .query(({ ctx }) => createCompetenceRegistry(ctx.db).listSkills(ctx.tenantId)),

  upsertSkill: protectedProcedure
    .use(omradeSjekk('ansatte', 'endre', false, 'admin'))
    .input(
      z.object({
        key: z
          .string()
          .min(2)
          .max(40)
          .regex(/^[a-z0-9-]+$/, 'Kun små bokstaver, tall og bindestrek'),
        name: z.string().min(1).max(80),
        description: z.string().max(400).optional(),
        /** F.eks. EU-kontroll: krever en sertifisering som kan utløpe. */
        requiresCertification: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCompetenceRegistry(ctx.db).upsertSkill(ctx.tenantId, ctx.role, input);
      } catch (error) {
        loggDealerWritePostgresFeil('competence', error);
        throw mapDealerWritePostgresFeil(error, 'Kunne ikke lagre ferdigheten. Prøv igjen.');
      }
    }),

  // Kompetanse per mekaniker
  listMechanicSkills: protectedProcedure
    .use(omradeSjekk('ansatte', 'se', true))
    .input(z.object({ mechanicId: z.uuid() }))
    .query(({ ctx, input }) =>
      createCompetenceRegistry(ctx.db).listMechanicSkills(ctx.tenantId, input.mechanicId),
    ),

  listAllMechanicSkills: protectedProcedure
    .use(omradeSjekk('ansatte', 'se', true))
    .query(({ ctx }) => createCompetenceRegistry(ctx.db).listAllMechanicSkills(ctx.tenantId)),

  setMechanicSkill: protectedProcedure
    .use(omradeSjekk('ansatte', 'endre', false, 'admin'))
    .input(
      z.object({
        mechanicId: z.uuid(),
        skillKey: z.string().min(2).max(40),
        /** 1 = under opplæring · 3 = selvstendig · 5 = spesialist. */
        level: z.number().int().min(1).max(5),
        certifiedAt: isoDate.optional(),
        certificationExpiresAt: isoDate.optional(),
        yearsExperience: z.number().int().min(0).max(60).optional(),
        notes: z.string().max(400).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCompetenceRegistry(ctx.db).setMechanicSkill(
          ctx.tenantId,
          ctx.role,
          input,
        );
      } catch (error) {
        loggDealerWritePostgresFeil('competence', error);
        throw mapDealerWritePostgresFeil(error, 'Kunne ikke lagre kompetansen. Prøv igjen.');
      }
    }),

  removeMechanicSkill: protectedProcedure
    .use(omradeSjekk('ansatte', 'endre', false, 'admin'))
    .input(z.object({ mechanicId: z.uuid(), skillKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCompetenceRegistry(ctx.db).removeMechanicSkill(
          ctx.tenantId,
          ctx.role,
          input.mechanicId,
          input.skillKey,
        );
      } catch (error) {
        loggDealerWritePostgresFeil('competence', error);
        throw mapDealerWritePostgresFeil(error, 'Kunne ikke fjerne kompetansen. Prøv igjen.');
      }
    }),

  /** Sertifiseringer som utløper snart — driver varsel i F3-04. */
  expiringCertifications: protectedProcedure
    .use(omradeSjekk('ansatte', 'se', true))
    .input(z.object({ withinDays: z.number().int().min(1).max(365).default(60) }))
    .query(({ ctx, input }) =>
      createCompetenceRegistry(ctx.db).expiringCertifications(ctx.tenantId, input.withinDays),
    ),
});
