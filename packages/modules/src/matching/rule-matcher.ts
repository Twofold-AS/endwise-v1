import { and, type Database, eq, inArray, schema, sql, withTenant } from '@endwise/db';
import { OCCUPYING_STATUSES } from '../booking/lifecycle.ts';
import type { MatchCandidate, MatchRequest, MechanicMatcher } from '../contracts/index.ts';

/**
 * F3-02 — Regelbasert mekaniker-matching.
 *
 * Kilden er **kompetanseregisteret** (F3-12), ikke en tekstliste på mekanikeren.
 * Det betyr at det forhandleren skriver inn i medlemsadministrasjonen er det
 * matcheren faktisk rangerer på. Én kilde til sannhet.
 *
 * ── HARDE KRAV (diskvalifiserer) ────────────────────────────────────────────
 *   1. mekanikeren er aktiv
 *   2. har ALLE ferdighetene tjenesteversjonen krever
 *   3. har GYLDIG sertifisering der ferdigheten krever det
 *      (utløpt sertifisering = ikke kvalifisert. En dato som ikke sjekkes, er
 *       ikke en sertifisering — det er en påstand.)
 *   4. har ledig kapasitet i hele tidsvinduet
 *
 * ── PRIORITERING (rangerer de som er igjen) ─────────────────────────────────
 *   • lavest belastning vinner — vi sprer jobbene, vi stabler dem ikke
 *   • SPESIALIST-VERN: ved likhet vinner den med lavest samlet ekspertise.
 *     Spesialisttimer er den knappeste ressursen i et verksted; de skal ikke
 *     brukes på jobber en selvstendig mekaniker kan ta.
 *     (Målt på NIVÅ, ikke på antall ferdigheter. Fem ferdigheter på nivå 1 er
 *      en generalist, ikke en spesialist — den gamle tellingen tok feil.)
 *
 * Matcheren VELGER IKKE. Den rangerer. Valget og slot-låsen tilhører
 * booking-motoren (F3-01) — ellers ville to steder kunne dobbeltbooke.
 */
export function createRuleMatcher(db: Database): MechanicMatcher {
  return {
    name: 'rule-based',

    async match(request: MatchRequest): Promise<MatchCandidate[]> {
      return withTenant(db, request.tenantId, async (tx) => {
        const mechanics = await tx
          .select()
          .from(schema.mechanics)
          .where(eq(schema.mechanics.active, true));
        if (mechanics.length === 0) return [];

        const mechanicIds = mechanics.map((m) => m.id);

        // Kompetanse + katalogen i én spørring: vi må vite BÅDE nivået og om
        // ferdigheten i det hele tatt krever sertifisering.
        const competence = await tx
          .select({
            mechanicId: schema.mechanicSkills.mechanicId,
            skillKey: schema.mechanicSkills.skillKey,
            level: schema.mechanicSkills.level,
            certificationExpiresAt: schema.mechanicSkills.certificationExpiresAt,
            requiresCertification: schema.skills.requiresCertification,
          })
          .from(schema.mechanicSkills)
          .leftJoin(
            schema.skills,
            and(
              eq(schema.skills.tenantId, schema.mechanicSkills.tenantId),
              eq(schema.skills.key, schema.mechanicSkills.skillKey),
            ),
          )
          .where(inArray(schema.mechanicSkills.mechanicId, mechanicIds));

        const byMechanic = new Map<string, typeof competence>();
        for (const row of competence) {
          const list = byMechanic.get(row.mechanicId) ?? [];
          list.push(row);
          byMechanic.set(row.mechanicId, list);
        }

        const overlapping = await tx
          .select({
            mechanicId: schema.bookings.mechanicId,
            count: sql<number>`count(*)::int`,
          })
          .from(schema.bookings)
          .where(
            and(
              inArray(schema.bookings.mechanicId, mechanicIds),
              inArray(schema.bookings.status, [...OCCUPYING_STATUSES]),
              sql`${schema.bookings.startsAt} < ${request.to.toISOString()}`,
              sql`${schema.bookings.endsAt} > ${request.from.toISOString()}`,
            ),
          )
          .groupBy(schema.bookings.mechanicId);
        const loadByMechanic = new Map(overlapping.map((r) => [r.mechanicId, r.count]));

        const today = new Date().toISOString().slice(0, 10);
        const candidates: MatchCandidate[] = [];

        for (const mechanic of mechanics) {
          const skills = byMechanic.get(mechanic.id) ?? [];
          const skillMap = new Map(skills.map((s) => [s.skillKey, s]));
          const reasons: string[] = [];

          // KRAV 2 + 3: alle ferdigheter, med gyldig sertifisering der det kreves.
          let qualified = true;
          for (const required of request.requiredSkills) {
            const held = skillMap.get(required);
            if (!held) {
              qualified = false;
              break;
            }
            if (held.requiresCertification) {
              const expiry = held.certificationExpiresAt;
              if (!expiry || expiry < today) {
                // Utløpt eller manglende sertifisering på en ferdighet som krever den.
                qualified = false;
                break;
              }
              reasons.push(`Sertifisert i ${required} (gyldig til ${expiry})`);
            }
          }
          if (!qualified) continue;

          // KRAV 4: ledig kapasitet.
          const load = loadByMechanic.get(mechanic.id) ?? 0;
          if (load >= mechanic.capacity) continue;

          const requiredLevels = request.requiredSkills.map((key) => skillMap.get(key)?.level ?? 0);
          if (request.requiredSkills.length > 0) {
            const min = Math.min(...requiredLevels);
            reasons.push(`Nivå ${min}–${Math.max(...requiredLevels)} på det jobben krever`);
          } else {
            reasons.push('Tjenesten krever ingen spesielle ferdigheter');
          }

          // PRIORITERING 1: ledig kapasitet (0–1).
          const capacityScore = 1 - load / mechanic.capacity;
          reasons.push(
            load === 0 ? 'Helt ledig i tidsrommet' : `${load} av ${mechanic.capacity} opptatt`,
          );

          // PRIORITERING 2: spesialist-vern, målt på samlet ekspertise.
          const totalExpertise = skills.reduce((sum, s) => sum + s.level, 0);
          const specialistPenalty = Math.min(totalExpertise, 30) * 0.01;
          if (totalExpertise > 0) {
            reasons.push(`Samlet ekspertise: ${totalExpertise}`);
          }

          candidates.push({
            mechanicId: mechanic.id,
            score: Math.max(0, Math.min(1, capacityScore - specialistPenalty)),
            reasons,
          });
        }

        return candidates.sort((a, b) => b.score - a.score);
      });
    },
  };
}
