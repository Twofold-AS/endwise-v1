import { and, type Database, eq, schema, sql, withTenant } from '@endwise/db';
import { assertCanWriteCompetence, type CompetenceRole } from './access.ts';

export interface UpsertSkillInput {
  key: string;
  name: string;
  description?: string | null;
  requiresCertification?: boolean;
}

export interface UpsertMechanicSkillInput {
  mechanicId: string;
  skillKey: string;
  /** 1 = under opplæring … 5 = spesialist. */
  level: number;
  certifiedAt?: string | null;
  certificationExpiresAt?: string | null;
  yearsExperience?: number | null;
  notes?: string | null;
}

/**
 * Kompetanseregisteret.
 * To lag med beskyttelse, og de gjør ulike jobber:
 * RLS svarer på «hvilken tenants rader?» (kan ikke omgås fra appen)
 * rolle svarer på «har du lov til å skrive?» (RLS vet ingenting om roller)
 * En dealer_staff er medlem av tenanten. RLS slipper ham inn i dataene. Det er
 * rollesjekken — og bare den — som hindrer at han gir seg selv `mc-eu`.
 */
export function createCompetenceRegistry(db: Database) {
  return {
    /** Ferdighetskatalogen for tenanten. */
    async listSkills(tenantId: string) {
      return withTenant(db, tenantId, (tx) => tx.select().from(schema.skills));
    },

    async upsertSkill(tenantId: string, role: CompetenceRole, input: UpsertSkillInput) {
      assertCanWriteCompetence(role);

      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .insert(schema.skills)
          .values({
            tenantId,
            key: input.key,
            name: input.name,
            description: input.description ?? null,
            requiresCertification: input.requiresCertification ?? false,
          })
          .onConflictDoUpdate({
            target: [schema.skills.tenantId, schema.skills.key],
            set: {
              name: input.name,
              description: input.description ?? null,
              requiresCertification: input.requiresCertification ?? false,
            },
          })
          .returning();
        return row;
      });
    },

    /** Kompetansen til én mekaniker. */
    async listMechanicSkills(tenantId: string, mechanicId: string) {
      return withTenant(db, tenantId, (tx) =>
        tx
          .select()
          .from(schema.mechanicSkills)
          .where(eq(schema.mechanicSkills.mechanicId, mechanicId)),
      );
    },

    /** Alle kompetanserader i tenanten — lista på Ansatte › Kompetanse. */
    async listAllMechanicSkills(tenantId: string) {
      return withTenant(db, tenantId, (tx) => tx.select().from(schema.mechanicSkills));
    },

    /**
     * Setter kompetanse. Upsert — forhandleren justerer nivå og fornyer
     * sertifisering på samme rad, i stedet for å samle duplikater.
     */
    async setMechanicSkill(
      tenantId: string,
      role: CompetenceRole,
      input: UpsertMechanicSkillInput,
    ) {
      assertCanWriteCompetence(role);

      if (input.level < 1 || input.level > 5) {
        throw new Error('Nivå må være mellom 1 og 5');
      }

      return withTenant(db, tenantId, async (tx) => {
        // Mekanikeren MÅ finnes i denne tenanten. RLS gjør at spørringen ikke
        // finner en annen tenants mekaniker — men vi svarer med en tydelig feil
        // i stedet for å skrive en rad som peker i tomme luften.
        const [mechanic] = await tx
          .select({ id: schema.mechanics.id })
          .from(schema.mechanics)
          .where(eq(schema.mechanics.id, input.mechanicId))
          .limit(1);
        if (!mechanic) throw new Error('Mekanikeren finnes ikke i denne tenanten');

        const [row] = await tx
          .insert(schema.mechanicSkills)
          .values({
            tenantId,
            mechanicId: input.mechanicId,
            skillKey: input.skillKey,
            level: input.level,
            certifiedAt: input.certifiedAt ?? null,
            certificationExpiresAt: input.certificationExpiresAt ?? null,
            yearsExperience: input.yearsExperience ?? null,
            notes: input.notes ?? null,
          })
          .onConflictDoUpdate({
            target: [schema.mechanicSkills.mechanicId, schema.mechanicSkills.skillKey],
            set: {
              level: input.level,
              certifiedAt: input.certifiedAt ?? null,
              certificationExpiresAt: input.certificationExpiresAt ?? null,
              yearsExperience: input.yearsExperience ?? null,
              notes: input.notes ?? null,
              updatedAt: new Date(),
            },
          })
          .returning();
        return row;
      });
    },

    async removeMechanicSkill(
      tenantId: string,
      role: CompetenceRole,
      mechanicId: string,
      skillKey: string,
    ) {
      assertCanWriteCompetence(role);

      return withTenant(db, tenantId, (tx) =>
        tx
          .delete(schema.mechanicSkills)
          .where(
            and(
              eq(schema.mechanicSkills.mechanicId, mechanicId),
              eq(schema.mechanicSkills.skillKey, skillKey),
            ),
          ),
      );
    },

    /**
     * Sertifiseringer som utløper snart. Driver varselet i F3-04 — en mekaniker
     * som mister sertifiseringen sin midt i en booket uke er et problem man vil
     * vite om før det skjer, ikke etter.
     */
    async expiringCertifications(tenantId: string, withinDays = 60) {
      return withTenant(db, tenantId, (tx) =>
        tx
          .select()
          .from(schema.mechanicSkills)
          .where(
            sql`${schema.mechanicSkills.certificationExpiresAt} is not null
                and ${schema.mechanicSkills.certificationExpiresAt}
                    <= current_date + ${withinDays} * interval '1 day'`,
          ),
      );
    },
  };
}

export type CompetenceRegistry = ReturnType<typeof createCompetenceRegistry>;
